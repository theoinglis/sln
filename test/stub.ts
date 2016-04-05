
const requirejs = require('requirejs');

class StubPackage {

    constructor(
        public name: string,
        public implementation: any
    ) {}
    private _previousImplementation = require(this.name);

    stub() {
        requirejs.undef(this.name);
        define(this.name, [], () => {
            return this.implementation;
        });
    }

    unstub() {
        requirejs.undef(this.name);
        define(this.name, [], () => {
            return this._previousImplementation;
        });
    }
}

export default class StubManager {

    private _stubs: Array<StubPackage> = [];

    stub(name, implementation) {
        const stubPackage = new StubPackage(name, implementation);
        this._stubs.push(stubPackage);
        stubPackage.stub();
    }

    loadWithCurrentStubs(name, callback) {
        this._stubs.push(name);
        requirejs.undef(name);
        require([name], callback);
    }

    reset() {
        this._stubs.forEach((stubPackage) => {
            stubPackage.unstub();
        });
        this._stubs = [];
    }
}