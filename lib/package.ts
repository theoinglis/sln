/// <reference path="../typings/main.d.ts" />

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

export default class Package implements INpmAction {

    constructor(
        public packagesDir: string,
        public name: string,
        private _localPackages: Array<string> = []
    ) {}

    private _packageDirName: string = 'packages';
    private _relativeDir: string = path.join(this._packageDirName, this.name);
    private _packageDir: string = path.join(this.packagesDir, this.name);
    private _deployService = new Heroku(this.name, this._packageDirName);
    private _packageConfig = new PackageConfig(this._packageDir);
    private _npmService = new Npm(this._packageConfig.fullName, this._packageDir);
    private _gitService = new Git(this._relativeDir);

    get fullName(): string {
        return this._packageConfig.fullName;
    }
    get version(): string {
        return this._packageConfig.version;
    }

    private _dependencies;
    get dependencies(): Array<string> {
        if (!this._dependencies) {
            this._dependencies = this._packageConfig.dependencyIntersection(this._localPackages);
        }
        return Object.keys(this._dependencies);
    }

    isPackageLinked(packageToCheck: string): boolean {
        const packagePath = path.join(this._packageDir, 'node_modules', packageToCheck);
        const folderStats = fs.lstatSync(packagePath);
        return folderStats.isSymbolicLink();
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

    install(): Promise<any> {
        return this._npmService.install();
    }

    link(): Promise<any> {
        return Promise.all(
            this.dependencies
                .map(dependency => {
                    return this._npmService.link(dependency);
                })
        );
    }

    unlink(): Promise<any> {
        return Promise.all(
            this.dependencies
                .map(dependency => {
                    return this._npmService.unlink(this._dependencies[dependency]);
                })
        );
    }

    test(): Promise<any> {
        return this._npmService.test();
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