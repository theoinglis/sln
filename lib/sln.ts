/// <reference path="../typings/main.d.ts" />

import Package from './package';
import INpmAction from './INpmAction';
import Git from './git';
import Dependencies from './dependencies';

require('console.table');
const
    async = require('async-q'),
    child = require('child_process'),
    emoji = require('node-emoji'),
    charm = require('charm')();

charm.pipe(process.stdout);
charm.reset();


export default class Sln implements INpmAction {

    constructor(
        mainPackageName: string = '',
        packageDir: string = 'packages') {
        this._dependencies = new Dependencies(mainPackageName, packageDir);
    }

    private _gitService = new Git();
    private _dependencies: Dependencies;

    private execute(action: (p: Package, no?: number) => Promise<any>): Promise<any> {
        return async.series(
            this._dependencies.all
                .map((name, no) => {
                    const packageToRun = this._dependencies.getPackage(name);
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

    run(action: string, options): Promise<any> {
        var customFn = this[action];
        console.log('Dependency order\n - '+ this._dependencies.all.join('\n - ')+'\n');
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
        single: p => p === this._dependencies.main
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
        return this._dependencies.main.exec(options.command);
    }

    deploy(options): Promise<any> {
        return this._dependencies.main.deploy(options.app, options.branch);
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