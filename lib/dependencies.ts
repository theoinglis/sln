/// <reference path="../typings/main.d.ts" />

import Package from './package';

const tsort = require('tsort'),
    path = require('path'),
    fs = require('fs');

function getDirectories(dir): Array<string> {
  return fs.readdirSync(dir).filter(function(file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

export default class Dependencies {

    private _packages: any = {};
    constructor(
        private _mainPackageName: string,
        private _packageDir: string
    ) {}
    private _packagesDir: string = path.join(process.cwd(), this._packageDir);
    private _packageDirectories: Array<string> = getDirectories(this._packagesDir);

    public main: Package = this.getPackage(this._mainPackageName);
    public get all(): Array<Package> {
        return this.graph.sort().reverse();
    }

    filterDependencies(predicate: (packageToCheck: Package) => boolean): Array<Package> {
        return this.graph.sort().reverse()
            .filter(predicate);
    }

    private _graph;
    private get graph(): any {
        if (!this._graph) {
            const graph = tsort();
            const notResolved: Array<string> = [this._mainPackageName];
            const resolved: Array<string> = [];

            while (notResolved.length > 0) {
                const currentPackageName = notResolved.pop();
                const retrievedPackage = this.getPackage(currentPackageName);
                console.log('got current package', currentPackageName);
                retrievedPackage.dependencies.forEach((dependentPackageName) => {
                    console.log('dep package', currentPackageName, dependentPackageName);
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


    public getPackage(name: string): Package {
        let retrievedPackage = this._packages[name];
        if (!retrievedPackage) {
            retrievedPackage = new Package(this._packagesDir, name, this._packageDirectories);
            this._packages[name] = retrievedPackage;
        }
        return retrievedPackage;
    }
}