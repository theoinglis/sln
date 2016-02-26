/// <reference path="../typings/main.d.ts" />
import npm = require('npm');
import Sln from '../lib/sln';
const path = require('path'),
    cla = require('command-line-args');

const config = {
    folder: 'packages'
};

const args = process.argv.slice(2);
const packageName = args.shift();
const action = args.shift();
// const options = require('command-line-args')([
//     { name: 'command', type: String, multiple: true, defaultOption: true }
// ]).parse();
//
// const packageName = options.command.shift();
// const action = options.command.shift();

const cliArray = (options: Array<string>): ((option: string) => string) => {
    return (option: string) => {
        if(options.indexOf(option) >= 0) {
            return option;
        } else {
            throw new Error(`Unregonised argument ${option}.\nOptions are: ${options.join(', ')}`);
        }
    }
}


export class SlnCli {
    private _sln = new Sln(this._packageName);
    constructor(
        private _args = process.argv.slice(2),
        private _packageName = _args.shift(),
        private _action = _args.shift()
    ) {}

    run(): Promise<any> {
        console.info('Running', this._action, 'on', this._packageName, '...');
        return this._sln.run(this._action, this._options);
    }

    private get _options(): any {
        const cliConfig = this.cliConfigs[this._action] || [];
        return cla(cliConfig).parse(this._args);
    }

    private cliConfigs = {
        install: [
            { name: 'tag', alias: 't', type: String, defaultOption: true }
        ],
        link: [
            { name: 'set', alias: 's', type: cliArray(['single', 'changed', 'all']), defaultOption: true, defaultValue: 'changed' }
        ],
        unlink: [
            { name: 'set', alias: 's', type: cliArray(['single', 'changed', 'all']), defaultOption: true, defaultValue: 'changed' }
        ],
        version: [
            { name: 'release', alias: 'r', type: String, defaultOption: true, defaultValue: 'patch' },
            { name: 'inquire', alias: 'i', type: Boolean, defaultValue: false }
        ],
        publish: [
            { name: 'tag', alias: 't', type: String, defaultOption: true }
        ],
        deploy: [
            { name: 'app', alias: 'a', type: String, defaultOption: true },
            { name: 'branch', alias: 'b', type: String }
        ]
    }
}
var slnCli = new SlnCli();
slnCli.run()
    .then(() => {
        console.info(action, 'executed successfully');
    })
    .catch((err) => {
        console.error('Failed to run', action, err);
        process.exit(1);
    })