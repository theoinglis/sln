/// <reference path="../typings/main.d.ts" />

import npm = require('npm');
const path = require('path');

export default class Package {

    constructor(public packagesDir: string, public name: string) {
        console.log('created package', this._packageDir);
    }

    private _packageDir: string = path.join(this.packagesDir, this.name);
    private _package: any = require(path.join(this._packageDir, 'package.json'));

    resolveDependencies(localDependencies: Array<string> = []): Array<string> {
        const dependencies = [];
        Object.keys(this._package.dependencies)
            .forEach((dependency) => {
                const indexOfScope = dependency.indexOf('/');
                if (indexOfScope > -1) {
                    dependency = dependency.substr(indexOfScope + 1, dependency.length);
                }
                if (localDependencies.indexOf(dependency) > -1) {
                    dependencies.push(dependency);
                }
            })
        return dependencies;
    }

    run(action: string): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log('loading ',this.name);
            npm.load({
                prefix: this._packageDir
            }, (err) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }

                const onCommandComplete = (err) => {
                    if (err) return reject(err);
                    else {
                        console.log('completed', this.name)
                        return resolve();
                    }
                };

                if (npm.commands[action]) {
                    npm.commands[action](onCommandComplete);
                } else {
                    npm.commands['run-script']([action], onCommandComplete);
                }
            });
        });
    }
}