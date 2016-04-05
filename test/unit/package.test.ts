/// <reference path="../../typings/tsd.d.ts" />

import sinon = require('sinon');
import {assert} from 'chai';
import Package from '../../lib/package';

describe('package', () => {
    let testPackage;
    beforeEach(() => {
        testPackage = new Package('lib-test');
    });

    describe.skip('setup', () => {
        it('should return the full name from the package config', () => {
            const expectedFullName = '@scoped/lib-test';
            const stub = sinon.stub(testPackage.packageConfig, 'fullName', () => expectedFullName);

            const actualFullName = testPackage.fullName;

            assert.equal(actualFullName, expectedFullName);
            stub.restore();
        });
    });
});