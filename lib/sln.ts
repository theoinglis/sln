/// <reference path="../typings/main.d.ts" />

import Package = require('./package');
const path = require('path');

export default class Sln {

    private _mainPackage: Package = new Package(this._packageDir, this._mainPackageName);
    constructor(
        private _mainPackageName: string = '',
        private _packageDir: string = 'packages') {

    }

    run(action: string): Promise<any> {
        return
            this._mainPackage.run();
    }
}