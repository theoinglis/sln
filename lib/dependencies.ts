/// <reference path="../typings/main.d.ts" />

import config = require('./config/config');
import {Predicate} from './common/types';
import Package from './package';

const
    async = require('async-q'),
    tsort = require('tsort'),
    path = require('path'),
    fs = require('fs');

export default class Dependencies {

    private _graph;
    private _packages: any = {};
    private _packagesRelativeDir: string = config.path.packages;
    private _packagesAbsoluteDir: string = path.join(config.path.root, this._packagesRelativeDir);
    private _packageDirectories: Array<string> = this.getDirectories(this._packagesAbsoluteDir);

    constructor(
        mainPackageName: string,
        private _packageDir: string
    ) {
        this.main = this.getPackage(mainPackageName);
        this._graph = this.createGraph(mainPackageName);
    }

    public main: Package;
    public get allNames(): Array<string> {
        return this._graph.sort().reverse();
    }
    public get all(): Array<Package> {
        return this.allNames
            .map((name) => { return this.getPackage(name); });
    }

    public filter(predicate: Predicate<Package>): Array<Package> {
        return this.all.filter((item) => {
            return predicate.check(item)});
    }

    public forEach(
        where: Predicate<Package>,
        action: (p: Package, no: number) => void): Promise<any> {
        return async.series(
            this.filter(where)
                .map((packageToRun, no) => {
                    return () => {
                        return action(packageToRun, no);
                    }
                })
            );
    }

    public getPackage(name: string): Package {
        let retrievedPackage = this._packages[name];
        if (!retrievedPackage) {
            retrievedPackage = new Package(name, this._packageDirectories);
            this._packages[name] = retrievedPackage;
        }
        return retrievedPackage;
    }

    private getDirectories(dir: string): Array<string> {
      return fs.readdirSync(dir).filter(function(file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
      });
    }

    private createGraph(mainPackageName: string) {
        const graph = tsort();
        const notResolved: Array<string> = [mainPackageName];
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

        return graph;
    }
}