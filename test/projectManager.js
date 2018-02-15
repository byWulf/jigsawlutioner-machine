const assert = require('assert');
const sinon = require('sinon');

const projectManager = require('../src/projectManager');
projectManager.logger.setLevel(projectManager.logger.LEVEL_NONE);

describe('projectManager', function() {
    describe('#isValidName()', function() {
        [
            ['Foobar', true],
            ['1234', true],
            ['____', true],
            ['----', true],
            ['This is a test', false],
            ['This_is_a_test', true],
            ['azAZ09_-', true],
            ['Foo!', false],
            ['../exploit', false]
        ].forEach((dataSet) => {
            it('should return ' + (dataSet[1] ? 'true' : 'false') + ' when called with "' + dataSet[0] + '"', function() {
                assert.equal(projectManager.isValidName(dataSet[0]), dataSet[1]);
            });
        });
    });

    describe('#hasProject()', function() {
        afterEach(function() {
            projectManager.fs.existsSync.restore();
        });

        [
            [['Foobar', 'Bat', 'barrr', 'abc_123'], 'Foobar', true],
            [['Foobar', 'Bat', 'barrr', 'abc_123'], 'foobar', false],
            [['Foobar', 'Bat', 'barrr', 'abc_123'], '!!!', false],
            [['Foobar', 'Bat', 'barrr', 'abc_123'], 'abc_123', true],
        ].forEach((dataSet) => {
            it('should return ' + (dataSet[2] ? 'true' : 'false') + ' when there are the projects ' + dataSet[0].join(',') + ' and the method is called with "' + dataSet[1] + '"', function() {
                let existsSync = sinon.stub(projectManager.fs, 'existsSync');
                existsSync.returns(false);
                dataSet[0].forEach((projectName) => {
                    existsSync.withArgs(projectManager.folder + projectName).returns(true);
                });

                assert.equal(projectManager.hasProject(dataSet[1]), dataSet[2]);
            });
        })
    });

    describe('#getProjectCount()', function() {
        afterEach(function() {
            projectManager.fs.readdirSync.restore();
            projectManager.fs.lstatSync.restore();
        });

        [
            [[], 0],
            [['bar'], 1],
            [['Foobar', 'Bat', 'barrr', 'abc_123'], 4],
        ].forEach((dataSet) => {
            it('should return ' + dataSet[1] + ' when there are the projects ' + dataSet[0].join(','), function() {
                let readdirSync = sinon.stub(projectManager.fs, 'readdirSync');
                readdirSync.returns([]);
                readdirSync.withArgs(projectManager.folder).returns(['.','..','someFile'].concat(dataSet[0]));

                let lstatSync = sinon.stub(projectManager.fs, 'lstatSync');
                lstatSync.returns({isDirectory: () => false});
                lstatSync.withArgs(projectManager.folder + '.').returns({isDirectory: () => true});
                lstatSync.withArgs(projectManager.folder + '..').returns({isDirectory: () => true});
                lstatSync.withArgs(projectManager.folder + 'someFile').returns({isDirectory: () => false});
                dataSet[0].forEach((projectName) => {
                    lstatSync.withArgs(projectManager.folder + projectName).returns({isDirectory: () => true});
                });

                assert.equal(projectManager.getProjectCount(), dataSet[1]);
                assert(readdirSync.called);
                assert(lstatSync.called);
            });
        })
    });
});