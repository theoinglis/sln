/// <reference path="../../typings/main.d.ts" />

import {IDeploy} from './IDeploy';
const path = require('path');
const process = require('child-process-promise');

export default class Heroku implements IDeploy {

    constructor(
        private _packageName: string,
        private _packageDirName: string
    ) {}

    private _packageRelativeDir: string = path.join(this._packageDirName, this._packageName);

    deploy(appName: string, fromBranch: string): Promise<any> {
        fromBranch = fromBranch ? fromBranch + ':' : '';
        return process.spawn(`git`,
            [
                `subtree`, `push`,
                `--prefix`, this._packageRelativeDir,
                `git@heroku.com:${appName}.git`,
                `${fromBranch}master`
            ], {
                stdio: 'inherit'
            });
    }
}