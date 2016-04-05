/// <reference path="../typings/main.d.ts" />

import config = require('./config/config');
import INpmAction = require('./INpmAction');
import semver = require('semver');
import inquirer = require('inquirer');
import PackageConfig from './packageConfig';
import Git from './git';
import Npm from './npm';
import Heroku from './deploy/heroku';

const path = require('path'),
    processPromise = require('child-process-promise'),
    fs = require('fs'),
    async = require('async-q');

export class PackageStatus {
    constructor(
        public name: string,
        packageConfig?: PackageConfig,
        git?: Git,
        npm?: Npm) {
        this.refreshStatus(packageConfig, git, npm);
    }

    public refreshStatus(packageConfig: PackageConfig, git: Git, npm: Npm) {
        this.currentVersion = packageConfig.version;
        this.isModified = git.hasUnpushedChanges();
        this.isLinked = true;
        this.isPublished =
            npm.isPublished() ?
            npm.isVersionPublished(packageConfig.version) ?
                true :
                false :
                null;
    }

    public currentVersion: string;
    public publishedVersion: string;

    public isModified: boolean;
    public isLinked: boolean;
    public isPublished: boolean;
    public isDeployed: boolean;
}

export default class Package implements INpmAction {

    constructor(
        private _name: string,
        private _localPackages: Array<string> = []
    ) {
        console.log('packages name', _name);
    }

    private _packagesRelativeDir: string = config.path.packages;
    private _packagesAbsoluteDir: string = path.join(config.path.root, this._packagesRelativeDir);
    private _packageRelativeDir: string = path.join(this._packagesRelativeDir, this.name);
    private _packageAbsoluteDir: string = path.join(this._packagesAbsoluteDir, this.name);
    private _packageConfig = new PackageConfig(this._packageAbsoluteDir);
    public get packageConfig(): PackageConfig {
        return this._packageConfig;
    }

    public get name(): string {
        return this._name
    }
    public get fullName(): string {
        return this._packageConfig.fullName;
    }
    public get version(): string {
        return this._packageConfig.version;
    }

    private _deployService = new Heroku(this.name, this._packagesRelativeDir);
    private _npmService = new Npm(this.fullName, this._packageAbsoluteDir);
    private _gitService = new Git(this._packageRelativeDir);
    public get services() {
        return {
            deploy: this._deployService,
            npm: this._npmService,
            git: this._gitService,
        }
    }


    get status(): PackageStatus {
        const status = new PackageStatus(this.name, this._packageConfig, this._gitService, this._npmService);
        status.isLinked = this.isLinked();
        return status;
    }

    private _dependencies;
    get dependencies(): Array<string> {
        if (!this._dependencies) {
            this._dependencies = this._packageConfig.dependencyIntersection(this._localPackages);
        }
        return Object.keys(this._dependencies);
    }

    isLinked(): boolean {
        let isLinked = null;
        this.dependencies
            .forEach(dependency => {
                const isPackageLinked = this.isPackageLinked('@guevara/'+dependency);
                console.log('is linked?',this.name, isPackageLinked, dependency)
                if (isLinked === null) isLinked = isPackageLinked;
                if (!isPackageLinked) isLinked = false;
            });
        return isLinked;
    }

    isPackageLinked(packageToCheck: string): boolean {
        const packagePath = path.join(this._packageDir, 'node_modules', packageToCheck);
        try {
            const folderStats = fs.lstatSync(packagePath);
            return folderStats.isSymbolicLink();
        } catch(e) {
            return null;
        }
    }

    run(action: string): Promise<any> {
        return this._npmService.run(action);
    }

    exec(fullCommand: string): Promise<any> {
        const args = fullCommand.split(' ');
        const command = args.shift();
        return processPromise.spawn(command, args, {
            stdio: 'inherit',
            cwd: this._packageDir
        });
    }

    linkDependencies(): Promise<any> {
        return Promise.all(
            this.dependencies
                .filter(dependency => {
                    return !this.isPackageLinked(dependency);
                })
                .map(dependency => {
                    return this._npmService.link(dependency);
                })
        );
    }

    unlinkDependencies(): Promise<any> {
        return Promise.all(
            this.dependencies
                .filter(dependency => {
                    return this.isPackageLinked(dependency);
                })
                .map(dependency => {
                    return this._npmService.unlink(this._dependencies[dependency]);
                })
        );
    }

    npm(options): Promise<any> {
        return this._npmService.spawn(options);
    }

    resolvePackageVersions(packages: {}, shouldInquire: boolean = false): Promise<boolean> {
        let anyVersionUpdated = false;
        return async.series(
            Object.keys(packages)
                .map(fullName => {
                    return () => {
                        return this._packageConfig.resolvePackageVersion(fullName, packages[fullName], shouldInquire)
                            .then(updatedVersion => {
                                if (!!updatedVersion) {
                                    anyVersionUpdated = true;
                                }
                            });
                    }
                })
            )
            .then(() => {
                return anyVersionUpdated;
            });
    }

    updateVersion(release: string): any {
        return {
            fullName: this.fullName,
            versionWas: this.version,
            versionIs: this._packageConfig.updateVersion(release),
            configPath: this._packageConfig.path
        };
    }

    publish(options: any): Promise<any> {
        return this._npmService.publishIfRequired(this.version, options.tag);
    }

    deploy(appName: string, fromBranch: string): Promise<any> {
        return this._deployService.deploy(appName, fromBranch);
    }

    hasUnpushedChanges(): boolean {
        return this._gitService.hasUnpushedChanges();
    }
}