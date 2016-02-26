/// <reference path="../typings/main.d.ts" />

import semver = require('semver');

const path = require('path');
const processPromise = require('child-process-promise');
const processSync = require('child_process');

export default class Npm {

    constructor(
        private _name: string,
        private _workingDirectory: string = process.cwd()
    ) {}

    private spawn(args): Promise<any> {
        return processPromise.spawn('npm', args, {
            stdio: 'inherit',
            cwd: this._workingDirectory,
        });
    }

    run(action: string): Promise<any> {
        return this.spawn(['run', action]);
    }

    install(): Promise<any> {
        return this.spawn(['install']);
    }

    link(packageName: string, relativePath: string = '..'): Promise<any> {
        return this.spawn(['link', path.join(relativePath, packageName)]);
    }

    unlink(packageName: string): Promise<any> {
        return this.spawn(['install', packageName, '-f']);
    }

    test(): Promise<any> {
        return this.spawn(['test']);
    }

    isPublished(): boolean {
        try {
            processSync.execSync(`npm view ${this._name} version`, {
                stdio: 'ignore'
            });
            return true;
        } catch(e) {
            return false;
        }
    }

    isVersionPublished(version: string): boolean {
        const publishedVersion = processSync.execSync(`npm view ${this._name}@${version} version`, {
            encoding: 'utf-8'
        }).trim();
        return semver.valid(publishedVersion) !== null;
    }

    publish(): Promise<any> {
        return this.spawn(['publish']);
    }

    publishIfRequired(version: string): Promise<any> {
        if (this.isPublished() &&
            !this.isVersionPublished(version)) {
            return this.publish();
        } else {
            return Promise.resolve();
        }
    }
}