/// <reference path="../typings/main.d.ts" />

import semver = require('semver');
import inquirer = require('inquirer');
import Services from './services';

const path = require('path');

export default class git {

    public services = new Services();

    constructor(
        private _relativeDirectory: string = '.',
        private _workingDirectory: string = process.cwd()
    ) {}

    hasUncommitedChanges(relativePath: string = this._workingDirectory): boolean {
        var result = this.services.processSync.execSync('git status -s', {
            cwd: relativePath,
            encoding: 'utf-8'
        });

        return !!result
    }

    hasUnpushedChanges(): boolean {
        const files = this.services.processSync.execSync('git diff origin/master --name-only', {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        }).split('\n');

        const hasChanged = files.some(fileName => {
            return fileName.indexOf(this._relativeDirectory) === 0;
        });

        return hasChanged;
    }

    add(files: Array<string>): void {
        this.services.processSync.execSync(`git add ${files.join(' ')}`, {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });
    }

    commit(message: string) {
        this.services.processSync.execSync(`git commit -m '${message}'`, {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });
    }
}