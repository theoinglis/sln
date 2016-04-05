/// <reference path="../../typings/tsd.d.ts" />

import sinon = require('sinon');
import {assert} from 'chai';
import Git from '../../lib/git';

describe('git', () => {
    let git;
    beforeEach(() => {
        git = new Git();
    });


    describe('hasUncommitedChanges', () => {
        const statusCommand = 'git status -s';

        describe('should return', () => {
            it('should return false if no text returned', () => {
                const stub = sinon.stub(git.services.processSync, 'execSync', () => '');

                const hasUncommitedChanges = git.hasUncommitedChanges();

                assert.isFalse(hasUncommitedChanges);
                stub.restore();
            });

            it('should return true if text returned', () => {
                const stub = sinon.stub(git.services.processSync, 'execSync', () => 'success');

                const hasUncommitedChanges = git.hasUncommitedChanges();

                assert.isTrue(hasUncommitedChanges);
                stub.restore();
            });
        });

        describe('if success', () => {
            let stub;
            beforeEach(() => {
                stub = sinon.stub(git.services.processSync, 'execSync', () => true);
            });
            afterEach(() => {
                stub.restore();
            })


            it('should get status of current working directory', () => {
                git.hasUncommitedChanges();

                sinon.assert.calledWith(stub, statusCommand);
            });

            it('should get status of current working directory if none specified', () => {
                git.hasUncommitedChanges();

                sinon.assert.calledWith(stub, statusCommand, {
                    cwd: process.cwd(),
                    encoding: 'utf-8'
                });
            });
        });
    });

    describe('hasUnpushedChanges', () => {
        const unpushedCommand = 'git diff origin/master --name-only';

        describe('should return', () => {
            beforeEach(() => {
                git = new Git('./success')
            });

            it('false if no changes', () => {
                git = new Git('./success')
                const stub = sinon.stub(git.services.processSync, 'execSync', () => '');

                const hasUnpushedChanges = git.hasUnpushedChanges();

                assert.isFalse(hasUnpushedChanges);
                stub.restore();
            });

            it('false if no changes in the directory', () => {
                const stub = sinon.stub(git.services.processSync, 'execSync', () => './fail/test.txt');

                const hasUnpushedChanges = git.hasUnpushedChanges();

                assert.isFalse(hasUnpushedChanges);
                stub.restore();
            });

            it('true if change in directory', () => {
                const stub = sinon.stub(git.services.processSync, 'execSync', () => './success/file.txt');

                const hasUnpushedChanges = git.hasUnpushedChanges();

                assert.isTrue(hasUnpushedChanges);
                stub.restore();
            });

            it('true if at least one change in directory', () => {
                const stub = sinon.stub(git.services.processSync, 'execSync', () => './fail/file.txt\n./success/file.txt');

                const hasUnpushedChanges = git.hasUnpushedChanges();

                assert.isTrue(hasUnpushedChanges);
                stub.restore();
            });
        });
    });

    describe.skip('add', () => {
        it('should add the specified files', () => {});
        it('should add the specified files to the working directory', () => {});
    });

    describe.skip('commit', () => {
        it('should commit with the specified message', () => {});
        it('should commit to the working directory', () => {});
    });
});