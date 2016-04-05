/// <reference path="../typings/main.d.ts" />
import npm = require('npm');
import Sln from '../lib/sln';
const path = require('path'),
    cla = require('command-line-args');

const cliArray = (options: Array<string>): ((option: string) => string) => {
    return (option: string) => {
        if(options.indexOf(option) >= 0) {
            return option;
        } else {
            throw new Error(`Unrecognised argument ${option}.\nOptions are: ${options.join(', ')}`);
        }
    }
}


export class SlnCli {
    public filter:string = undefined;

    private _action: string;
    public get action(): string {
        return this._action;
    }
    public set action(text: string) {
        this._action = this.toCamel(text);
    }
    constructor(
        private _args = process.argv.slice(2),
        public packageName = _args.shift()
    ) {
        const filter = _args.shift();
        if (this._filterOptions.indexOf(filter) === -1) {
            this.action = filter;
        } else {
            this.filter = filter;
            this.action = _args.shift();
        }
    }
    private _sln = new Sln(this.packageName);

    private toCamel(text: string) {
        return text.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })
    }

    private _filterOptions = [
        'single',
        'modified',
        'all'
    ]

    public run(): Promise<any> {
        return this._sln.run(this.action, this._options, this.filter);
    }

    private get _options(): any {
        const cliConfig = this.cliConfigs[this.action];
        if (cliConfig) {
            return cla(cliConfig).parse(this._args);
        } else {
            return this._args;
        }
    }

    private cliConfigs = {
        default: [
            { name: 'command', alias: 't', type: String, defaultOption: true, multiple: true }
        ],
        versionDependencies: [
            { name: 'release', alias: 'r', type: String, defaultOption: true, defaultValue: 'patch' },
            { name: 'inquire', alias: 'i', type: Boolean, defaultValue: false }
        ],
        deploy: [
            { name: 'app', alias: 'a', type: String, defaultOption: true },
            { name: 'branch', alias: 'b', type: String }
        ]
    }
}
var slnCli = new SlnCli();
console.info('Running', slnCli.action, 'on', slnCli.packageName, '...');
slnCli.run()
    .then(() => {
        console.info(slnCli.action, 'executed successfully');
    })
    .catch((err) => {
        console.error('Failed to run', slnCli.action, err);
        process.exit(1);
    })