/// <reference path="../typings/main.d.ts" />

import inquirer = require('inquirer');
import semver = require('semver');

const path = require('path');
const fs = require('fs');

export default class PackageConfig {

    constructor(
        private _packageConfigDir: string
    ) {}

    get path(): string {
        return path.join(this._packageConfigDir,'package.json');
    }
    private _packageConfig = require(this.path);

    get fullName(): string {
        return this._packageConfig.name;
    }

    get version(): string {
        return this._packageConfig.version
    }
    set version(version: string) {
        this._packageConfig.version = version;
        this.save();
    }

    updateVersion(release: string): string {
        this.version = semver.inc(this._packageConfig.version, release);
        return this.version;
    }

    dependencyIntersection(dependencies: Array<string>): any {
        const intersectingDependencies = {};
        Object.keys(this._packageConfig.dependencies)
            .forEach((fullDependency) => {
                const indexOfScope = fullDependency.indexOf('/');
                let dependency = fullDependency;
                if (indexOfScope > -1) {
                    dependency = dependency.substr(indexOfScope + 1, dependency.length);
                }
                if (dependencies.indexOf(dependency) > -1) {
                    intersectingDependencies[dependency] = fullDependency;
                }
            });
        return intersectingDependencies;
    }

    isPackageUsed(packageName: string): boolean {
        return !!this._packageConfig.dependencies[packageName]
    }

    isPackageVersionSatisfied(packageName: string, version: string): boolean {
        const versionRange = this._packageConfig.dependencies[packageName];
        return semver.satisfies(version, versionRange);
    }

    getPackageVersion(packageName: string): string {
        return this._packageConfig.dependencies[packageName];
    }

    setPackageVersion(packageName: string, version: string) {
        this._packageConfig.dependencies[packageName] = version;
        this.save();
    }

    inquirePackageVersion(packageName: string, version: string): string {
        return new Promise((resolve, reject) => {
            inquirer.prompt([
                {
                    name: 'version',
                    message: `${this._packageConfig.name}:\nNew version ${version} for ${packageName} does not satisfy ${this.getPackageVersion(packageName)}.\nWhat do you want to update it to?`,
                    default: version
                }
            ], (answers) => {
                resolve(answers.version);
            });
        });
    }
    resolvePackageVersion(packageName: string, version: string, shouldInquire: boolean = false): Promise<string> {
        if (this.isPackageUsed(packageName) &&
            !this.isPackageVersionSatisfied(packageName, version)) {

            const checkVersion = shouldInquire ?
                this.inquirePackageVersion(packageName, version) :
                Promise.resolve(version);

            return checkVersion
                    .then((confirmedVersion) => {
                        this.setPackageVersion(packageName, confirmedVersion);
                    });
        } else {
            return Promise.resolve();
        }
    }

    save() {
        fs.writeFileSync(this.path, `${ JSON.stringify(this._packageConfig, null, 2) }\n`);
    }
}