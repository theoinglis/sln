/// <reference path="../../typings/main.d.ts" />

import IDeploy = require('./IDeploy');

export default class Heroku implements IDeploy {

    constructor(
        private _packageName: string,
        private _packageDirName: string
    ) {}

    deploy(appName: string, fromBranch: string) {
        child.execSync(`git subtree push -f --prefix ${this._packageDirName}/${this._packageName} git@heroku.com:${appName}.git ${fromBranch}:master`, {
            stdio: 'inherit'
        });
    }
}