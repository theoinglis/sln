/// <reference path="../typings/main.d.ts" />

import Package from './package';
import INpmAction from './INpmAction';
import Git from './git';

require('console.table');
const path = require('path'),
    fs = require('fs'),
    async = require('async-q'),
    child = require('child_process'),
    tsort = require('tsort'),
    emoji = require('node-emoji'),
    charm = require('charm')();

charm.pipe(process.stdout);
charm.reset();

function getDirectories(dir): Array<string> {
  return fs.readdirSync(dir).filter(function(file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

export default class Sln implements INpmAction {

    constructor(
        private _mainPackageName: string = '',
        private _packageDir: string = 'packages') {}

    private _gitService = new Git();
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
        }

        return this._graph;
    }

    private getPackage(name: string): Package {
        let retrievedPackage = this._packages[name];
        if (!retrievedPackage) {
            retrievedPackage = new Package(this._packagesDir, name, this._packageDirectories);
            this._packages[name] = retrievedPackage;
        }
        return retrievedPackage;
    }

    private execute(action: (p: Package, no?: number) => Promise<any>): Promise<any> {
        return async.series(
            this.graph.sort().reverse()
                .map((name, no) => {
                    const packageName = name;
                    const packageToRun = this._packages[packageName];
                    const dependencies = this._packageDependencies[packageName]
                    return () => {
                        charm.write('Processing ' + packageToRun.name + '\n');
                        return action(packageToRun, no);
                    }
                })
        ).then(() => {
            charm.write('Processing complete.\n\n')
        });
    }

    static isLocalPackage(packageName: string): boolean {
        return false;
    }

    filterDependencies(predicate: (packageToCheck: Package) => boolean): Array<Package> {
        return this.graph.sort().reverse()
            .filter(predicate);
    }

    run(action: string, options): Promise<any> {
        var customFn = this[action];
        console.log('Dependency order\n - '+ this.graph.sort().reverse().join('\n - ')+'\n');
        if (customFn) {
            return customFn.call(this, options);
        } else {
            return this.execute(p => {
                return p[action](options);
            });
        }
    }

    private _linkFilters = { // Not working yet
        changed: p =>  p.hasUnpushedChanges(),
        all: p => true,
        single: p => p === this._mainPackage
    }
    link(options): Promise<any> {
        return this.execute(p => {
            console.log('could link',p.name);
            if (this._linkFilters[options.set](p)) {
                console.log('linking',p.name);
                return p.link();
            } else {
                return Promise.resolve();
            }
        });
    }

    version(options): Promise<any> {
        if (this._gitService.hasUncommitedChanges()) {
            return Promise.reject('Please commit changes before updating the version');
        } else {
            const newVersions = {};
            return this.execute(p => {
                return p.resolvePackageVersions(newVersions, options.inquire)
                        .then((anyPackageVersionUpdated) => {
                            if (anyPackageVersionUpdated ||
                                p.hasUnpushedChanges()) {
                                const change = p.updateVersion(options.release);
                                newVersions[change.fullName] = change.versionIs;
                                return change;
                            } else return false
                        });

                })
                .then(changes => {
                    changes = changes.filter(c => !!c);
                    const packageChanges =
                        changes
                            .map(change => {
                                return `${change.fullName} (${change.versionWas} -> ${change.versionIs})`
                            });
                    this._gitService.add(changes.map(c => c.configPath));
                    this._gitService.commit(`Updated package versions: ${packageChanges.join(', ')}`);
                });
        }
    }

    exec(options): Promise<any> {
        return this._mainPackage.exec(options.command);
    }

    deploy(options): Promise<any> {
        return this._mainPackage.deploy(options.app, options.branch);
    }

    summary(): Promise<any> {
        const statuses = [];
        const toEmoji = (isTrue: boolean, falseEmoji: string = null): string {
            if (falseEmoji) falseEmoji = emoji.get(falseEmoji);
            else falseEmoji = '';
            if (isTrue === true) return emoji.get('white_check_mark')
            else if (isTrue === false) return falseEmoji;
            else return '';
        }
        return this.execute((p, no) => {
            const status = p.status;
            statuses.push({
                '': no + 1,
                'Name': status.name,
                'Version': status.currentVersion,
                'Modified ': '   '+toEmoji(status.isModified),
                'Linked   ': '   '+toEmoji(status.isLinked, 'negative_squared_cross_mark'),
                'Published': '   '+toEmoji(status.isPublished, 'negative_squared_cross_mark'),
            });
        }).then(() => {
            console.table(statuses.reverse());
        });
    }
}