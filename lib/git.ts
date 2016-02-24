/// <reference path="../typings/main.d.ts" />

import semver = require('semver');
import inquirer = require('inquirer');

const path = require('path'),
    processPromise = require('child-process-promise'),
    process = require('child_process'),
    Git = require('nodegit'),
    fs = require('fs'),
    async = require('async-q');

export default class git {

    constructor(
        private _name: string,
        private _relativeDirectory: string,
        private _workingDirectory: string = process.cwd()
    ) {}

    hasUncommitedChanges(): boolean {
        var result = process.execSync('git status -s', {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        });

        return !!result
    }

    hasUnpushedChanges(): boolean {
        const files = process.execSync('git diff origin/master --name-only', {
            cwd: this._workingDirectory,
            encoding: 'utf-8'
        }).split('\n');

        const hasChanged = files.some(fileName => {
            return fileName.indexOf(this._relativeDirectory) === 0;
        });
        return hasChanged;
    }
}