/// <reference path="../typings/main.d.ts" />

import INpmAction = require('./INpmAction');
import semver = require('semver');
import inquirer = require('inquirer');

const path = require('path'),
    child = require('child_process'),
    Git = require('nodegit'),
    fs = require('fs'),
    async = require('async-q');

export default class Package implements INpmAction {

    constructor(
        public packagesDir: string,
        public name: string,
        private _localPackages: Array<string> = []) {}

    private _packageDirName: string = 'packages';
    private _packageDir: string = path.join(this.packagesDir, this.name);
    private _packageConfigPath: string = path.join(this._packageDir, 'package.json');
    private _packageConfig: any = require(this._packageConfigPath);
    private _dependencies;

    get dependencies(): Array<string> {
        if (!this._dependencies) {
            this._dependencies = {};
            Object.keys(this._packageConfig.dependencies)
                .forEach((fullDependency) => {
                    const indexOfScope = fullDependency.indexOf('/');
                    let dependency = fullDependency;
                    if (indexOfScope > -1) {
                        dependency = dependency.substr(indexOfScope + 1, dependency.length);
                    }
                    if (this._localPackages.indexOf(dependency) > -1) {
                        this._dependencies[dependency] = fullDependency;
                    }
                })
        }
        return Object.keys(this._dependencies);
    }

    private savePackageConfig() {
        fs.writeFileSync(this._packageConfigPath,
                `${ JSON.stringify(this._packageConfig, null, 2) }\n`);
    }

    private hasChanged(): boolean {
        const files = child.execSync('git diff origin/master --name-only', {
            cwd: this._packageDir,
            encoding: 'utf-8'
        }).split('\n');

        var name = path.join(this._packageDirName, this.name);
        const hasChanged = files.some(fileName => {
            return fileName.indexOf(name) === 0;
        });
        if (hasChanged) console.log(this.name, 'has changed');
        return hasChanged;
    }

    private spawn(args: Array<string>): Promise<any> {
        return new Promise((resolve, reject) => {
            const childProcess = child.spawn('npm', args, {
                cwd: this._packageDir,
                stdio: 'inherit'
            });

            childProcess.on('close', (code) => {
              if (code === 0) resolve();
              else reject();
            });
        });
    }

    isPackageUsed(packageToCheck: string): boolean {
        return !!this._packageConfig.dependencies[packageToCheck]
    }

    isPackageLinked(packageToCheck: string): boolean {
        const packagePath = path.join(this._packageDir, 'node_modules', packageToCheck);
        const folderStats = fs.lstatSync(packagePath);
        return folderStats.isSymbolicLink();
    }

    isPackageVersionSatisfied(packageToCheck: string, version: string): boolean {
        const versionRange = this._packageConfig.dependencies[packageToCheck];
        return semver.satisfies(version, versionRange);
    }

    run(action: string): Promise<any> {
        return this.spawn(['run', action]);
    }

    install(): Promise<any> {
        return this.spawn(['install']);
    }

    link(): Promise<any> {
        return Promise.all(
            this.dependencies
                .map(dependency => {
                    console.info('linking', dependency, 'to', this.name);
                    return this.spawn(['link', '../'+dependency]);
                })
        );
    }

    unlink(): Promise<any> {
        return Promise.all(
            this.dependencies
                .map(dependency => {
                    console.info('unlinking', dependency, 'to', this.name);
                    console.info('install',this._dependencies[dependency]);
                    return this.spawn(['install', this._dependencies[dependency]]);
                })
        );
    }

    test(): Promise<any> {
        return this.spawn(['test']);
    }

    getPackageVersion(packageName: string): string {
        return this._packageConfig.dependencies[packageName];
    }

    setPackageVersion(packageName: string, version: string) {
        this._packageConfig.dependencies[packageName] = version;
        this.savePackageConfig();
    }

    resolvePackageVersions(packages: {}): Promise<boolean> {
        let anyVersionUpdated = false;
        return async.series(
            Object.keys(packages)
                .map(fullName => {
                    return () => {
                        return this.resolvePackageVersion(fullName, packages[fullName])
                            .then(updatedVersion => {
                                if (!!updatedVersion) {
                                    console.log(this.name, 'updated version', fullName, updatedVersion);
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

    resolvePackageVersion(packageName: string, version: string): Promise<string> {
        console.log(`${this.name}: New version ${version} for ${packageName}`);
        if (this.isPackageUsed(packageName) &&
            !this.isPackageVersionSatisfied(packageName, version)) {
            return new Promise((resolve, reject) => {
                inquirer.prompt([
                    {
                        name: 'version',
                        message: `${this.name}: New version ${version} for ${packageName} does not satisfy ${this.getPackageVersion(packageName)}.\nWhat do you want to update it to?`,
                        default: version
                    }
                ], (answers) {
                    this.setPackageVersion(packageName, answers.version);
                    resolve(answers.version);
                });
            })
        } else {
            return Promise.resolve();
        }
    }

    setVersion(newVersion: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const changes = {
                name: this.name,
                fullName: this._packageConfig.name,
                versionWas: this._packageConfig.version,
                versionIs: newVersion
            }
            console.log('changing', changes)
            this._packageConfig.version = changes.versionIs;
            this.savePackageConfig();
            return resolve(changes);
        });
    }

    version(release: string, relativeToNpm: boolean): Promise<any> {
        return this.setVersion(semver.inc(this._packageConfig.version, release));
    }

    isPublished(): boolean {
        try {
            child.execSync(`npm view ${this._packageConfig.name} version`, {
                stdio: 'ignore'
            });
            return true;
        } catch(e) {
            return false;
        }
    }

    isVersionPublished(): boolean {
        const publishedVersion = child.execSync(`npm view ${this._packageConfig.name}@${this._packageConfig.version} version`, {
            encoding: 'utf-8'
        }).trim();
        return semver.valid(publishedVersion);
    }

    publish(): Promise<any> {
        if (this.isPublished() &&
            !this.isVersionPublished()) {
            return this.spawn(['publish']);
        } else {
            return Promise.resolve();
        }
    }

    deploy(appName: string, fromBranch: string = 'HEAD'): Promise<any> {
        child.execSync(`git subtree push -f --prefix ${this._packageDirName}/${this.name} git@heroku.com:${appName}.git ${fromBranch}:master`, {
            stdio: 'inherit'
        });
        return Promise.resolve();
    }
}