/// <reference path="../typings/main.d.ts" />
import config = require('./config/config');

import {Predicate} from './common/types';
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

    private _gitService = new Git();
    private _dependencies: Dependencies;

    constructor(
        mainPackageName: string,
        packageDir: string = config.packagesDir) {
        this._dependencies = new Dependencies(mainPackageName, packageDir);
    }

    private _filters: any = {
        'all': new Predicate<Package>(() => {return true;}),
        'modified': new Predicate<Package>((p) => {return p.hasUnpushedChanges();}),
        'single': new Predicate<Package>((p) => {return p === this._dependencies.main;})
    }

    private getFilter(name: string): Predicate<Package> {
        return this._filters[name];
    }

    private execute(
        action: (p: Package, no?: number) => Promise<any>,
        filter: Predicate<Package> = this._filters.all)
            : Promise<any>
    {
        return this._dependencies
            .forEach(filter, (packageToRun, no) => {
                charm.write('Processing ' + packageToRun.name + '\n');
                return action(packageToRun, no);
            })
            .then(result => {
                console.log('execute result', result);
                charm.write('Processing complete.\n\n')
            });
    }

    run(action: string, filterName: string, options): Promise<any> {
        const customFn = this[action];
        if (customFn) {
            const filter = this.getFilter(filterName);
            return customFn.call(this, options, filter);
        }
    }

    npm(options, filter: Predicate<Package> = this._filters.all): Promise<any> {
        return this.execute(p => {
            return p.npm(options.command);
        }, filter);
    }

    linkDependencies(options, filter: Predicate<Package> = this._filters.all): Promise<any> {
        return this.execute(p => {
            return p.linkDependencies();
        }, filter);
    }

    unlinkDependencies(options, filter: Predicate<Package> = this._filters.all): Promise<any> {
        return this.execute(p => {
            return p.unlinkDependencies();
        }, filter);
    }

    versionDependencies(options): Promise<any> {
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
                    console.log(newVersions);
                    console.log(changes);
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

    exec(options, filter: Predicate<Package> = this._filters.single): Promise<any> {
        return this.execute(filter, (p) => {
            return p.exec(options.command);
        });
    }

    deploy(options, filter: Predicate<Package> = this._filters.single): Promise<any> {
        return this._dependencies.filter(filter).deploy(options.app, options.branch);
    }

    summary(): Promise<any> {
        const statuses = [];
        const toEmoji = (isTrue: boolean, falseEmoji: string = null): string {
            if (falseEmoji) falseEmoji = emoji.emojify(falseEmoji);
            else falseEmoji = '';
            if (isTrue === true) return emoji.emojify(config.output.success)
            else if (isTrue === false) return falseEmoji;
            else return emoji.emojify(config.output.none);
        }
        return this.execute((p, no) => {
            const status = p.status;
            statuses.push({
                '': no + 1,
                'Name': status.name,
                'Version': status.currentVersion,
                'Modified ': toEmoji(status.isModified),
                'Linked   ': toEmoji(status.isLinked, config.output.fail),
                'Published': toEmoji(status.isPublished, config.output.fail),
            });
        }, this._filters.all).then(() => {
            console.table(statuses.reverse());
        });
    }
}