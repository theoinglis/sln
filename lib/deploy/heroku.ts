/// <reference path="../../typings/main.d.ts" />

import IDeploy = require('./IDeploy');
const process = require('child-process-promise');

export default class Heroku implements IDeploy {

    constructor(
        private _packageName: string,
        private _packageDirName: string
    ) {}

    deploy(appName: string, fromBranch: string = 'HEAD'): Promise<any> {
        return process.exec(`git subtree push --prefix ${this._packageDirName}/${this._packageName} git@heroku.com:${appName}.git ${fromBranch}:master`);
    }
}