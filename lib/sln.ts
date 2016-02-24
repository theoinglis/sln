/// <reference path="../typings/main.d.ts" />

import Package from './package';
import INpmAction from './INpmAction';

const path = require('path'),
    fs = require('fs'),
    async = require('async-q'),
    child = require('child_process'),
    tsort = require('tsort');

function getDirectories(dir): Array<string> {
  return fs.readdirSync(dir).filter(function(file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

export class Dependencies {
    
}

export default class Sln implements INpmAction {

    constructor(
        private _mainPackageName: string = '',
        private _packageDir: string = 'packages') {}

    private _packages: any = {};
    private _packagesDir: string = path.join(process.cwd(), this._packageDir);
    private _packageDirectories: Array<string> = getDirectories(this._packagesDir);
    private _mainPackage: Package = this.getPackage(this._mainPackageName);
    private _packageDependencies = {};
    private _graph;
    private get graph(): any {
        if (!this._graph) {
            const graph = tsort();
            const notResolved: Array<string> = [this._mainPackageName];
            const resolved: Array<string> = [];

            while (notResolved.length > 0) {
                const currentPackageName = notResolved.pop();
                const retrievedPackage = this.getPackage(currentPackageName);
                retrievedPackage.dependencies.forEach((dependentPackageName) => {
                    graph.add(currentPackageName, dependentPackageName);
                    if (resolved.indexOf(dependentPackageName) === -1) {
                        notResolved.push(dependentPackageName);
                    }
                });
                resolved.push(currentPackageName);
            }

            this._graph = graph;
            console.log('Dependency order\n - '+ graph.sort().reverse().join('\n - '));
        }

        return this._graph;
    }

    private getPackage(name: string): Package {
        let retrievedPackage = this._packages[name];
        if (!retrievedPackage) {
            console.log('package name', name)
            retrievedPackage = new Package(this._packagesDir, name, this._packageDirectories);
            this._packages[name] = retrievedPackage;
        }
        return retrievedPackage;
    }

    private hasUncommitedChanges(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            child.exec('git status -s', {
                cwd: this._packageDir
            }, (error, stdout, stderr) => {
                if (error) return reject(error);
                resolve(!!stdout);
            });
        });
    }

    private execute(action: (p: Package) => Promise<any>): Promise<any> {
        return async.series(
            this.graph.sort().reverse()
                .map(name => {
                    const packageName = name;
                    const packageToRun = this._packages[packageName];
                    const dependencies = this._packageDependencies[packageName]
                    return () => {
                        return action(packageToRun);
                    }
                })
        );
    }

    static isLocalPackage(packageName: string): boolean {

    }

    run(action: string, ...args: Array<string>): Promise<any> {
        this.execute(p => {
            return p[action](args);
        })
    }

    // run(action: string): Promise<any> {
    //     return this.execute(p => {
    //         return p.run(action);
    //     });
    // }

    install(): Promise<any> {
        return this.execute(p => {
            return p.install();
        });
    }

    link(): Promise<any> {
        return this.execute(p => {
            return p.link();
        });
    }

    unlink(): Promise<any> {
        return this.execute(p => {
            return p.unlink();
        });
    }

    test(): Promise<any> {
        return this.execute(p => {
            return p.test();
        });
    }

    version(release: string = 'patch', relativeToNpm: boolean = true): Promise<any> {
        return this
            .hasUncommitedChanges()
            .then((hasUncommitedChanges) => {
                if (false && hasUncommitedChanges) {
                    return Promise.reject('Please commit changes before updating the version');
                }
            })
            .then(() => {
                const newVersions = {};
                return this.execute(p => {
                    return p.resolvePackageVersions(newVersions)
                            .then((anyPackageVersionUpdated) => {
                                if (anyPackageVersionUpdated ||
                                    p.hasChanged()) {
                                    return p.version(release, relativeToNpm)
                                        .then(change => {
                                            newVersions[change.fullName] = change.versionIs;
                                        });
                                } else {
                                    return Promise.resolve();
                                }
                            })

                });
            })
            .then(changes => {
                console.log('changes',changes);
                console.log('commiting now',changes);
                // log changes and commit
            });
    }

    publish(): Promise<any> {
        return this.execute(p => {
            return p.publish();
        })
    }

    deploy(): Promise<any> {
        return this._mainPackage.deploy('heyguevara-test1', '$CIRCLE_SHA1');
    }
}