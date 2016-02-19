/// <reference path="../typings/main.d.ts" />

import Package from './package';
const path = require('path');

export default class Sln {

    //private _mainPackage: Package;
    constructor(
        private _mainPackageName: string = '',
        private _packageDir: string = 'packages') {
        //this._mainPackage = new Package(this._packageDir, this._mainPackageName);
    }

    run(action: string): Promise<any> {
        return Promise.resolve();
            //this._mainPackage.run();
    }
}