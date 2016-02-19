/// <reference path="../typings/main.d.ts" />

import npm = require('npm'); 
const path = require('path');

export default class Package {
    constructor(public dir: string, public name: string) {}

    get path(): string {
        return path.join(this.dir, this.name);
    }

    run(action: string): Promise<any> {
        return new Promise((resolve, reject) => {
            npm.load({
                prefix: this.path
            }, (err) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }

                const onCommandComplete = (err) => {
                    if (err) return reject(err);
                    else return resolve();
                };

                if (npm.commands[action]) {
                    npm.commands[action](onCommandComplete);
                } else {
                    npm.commands['run-script']([action], onCommandComplete);
                }
            });
        });
    }
}