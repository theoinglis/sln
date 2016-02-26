/// <reference path="../typings/main.d.ts" />

import semver = require('semver');
import inquirer = require('inquirer');

const path = require('path'),
    processPromise = require('child-process-promise'),
    processSync = require('child_process'),
    Git = require('nodegit'),
    fs = require('fs'),
    async = require('async-q');

export default class git {

    constructor(
        private _relativeDirectory: string = '.',
        private _workingDirectory: string = process.cwd()
    ) {}

    hasUncommitedChanges(): boolean {
        var result = processSync.execSync('git status -s', {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });

        return !!result
    }

    hasUnpushedChanges(): boolean {
        const files = processSync.execSync('git diff origin/master --name-only', {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        }).split('\n');

        const hasChanged = files.some(fileName => {
            return fileName.indexOf(this._relativeDirectory) === 0;
        });

        return hasChanged;
    }

    add(files: Array<string>): void {
        processSync.execSync(`git add ${files.join(' ')}`, {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });
    }

    commit(message: string) {
        processSync.execSync(`git commit -m '${message}'`, {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });
    }
}