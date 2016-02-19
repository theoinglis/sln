/// <reference path="../typings/main.d.ts" />

import Package from './package';
const path = require('path'),
    fs = require('fs'),
    async = require('async-q'),
    tsort = require('tsort');

function getDirectories(dir): Array<string> {
  return fs.readdirSync(dir).filter(function(file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

export default class Sln {

    constructor(
        private _mainPackageName: string = '',
        private _packageDir: string = 'packages') {}

    private _packages: any = {};
    private _packagesDir: string = path.join(process.cwd(), this._packageDir);
    private _localPackages: Array<string> = getDirectories(this._packagesDir);
    private _mainPackage: Package = this.getPackage(this._mainPackageName);
    private _graph;
    private get graph(): any {
        if (!this._graph) {
            const graph = tsort();
            const notResolved: Array<string> = [this._mainPackageName];
            const resolved: Array<string> = [];

            while (notResolved.length > 0) {
                const currentPackageName = notResolved.pop();
                const retrievedPackage = this.getPackage(currentPackageName);
                const packageDependencies = retrievedPackage.resolveDependencies(this._localPackages);
                packageDependencies.forEach((dependentPackageName) => {
                    graph.add(currentPackageName, dependentPackageName);
                    if (resolved.indexOf(dependentPackageName) === -1) {
                        notResolved.push(dependentPackageName);
                    }
                });
                resolved.push(currentPackageName);
            }

            this._graph = graph;
            console.log('order', graph.sort().reverse());
        }

        return this._graph;
    }

    private getPackage(name: string): Package {
        let retrievedPackage = this._packages[name];
        if (!retrievedPackage) {
            retrievedPackage = new Package(this._packagesDir, name);
            this._packages[name] = retrievedPackage;
        }
        return retrievedPackage;
    }

    run(action: string): Promise<any> {
        var core = new Package(this._packagesDir, 'lib-core');
        var pricing = new Package(this._packagesDir, 'lib-pricing');
        return core.run(action)
            .then(()=> {
                console.log('complete core');
                return pricing.run(action);
            })
    }
    runOld(action: string): Promise<any> {
        const promises = this.graph.sort().reverse()
            .map(name => {
                const packageName = name;
                const packageToRun = this._packages[packageName];
                return () => {
                    console.log('running', packageName);
                    return packageToRun.run(action);
                }
            });
        return async.series(promises);
    }
}