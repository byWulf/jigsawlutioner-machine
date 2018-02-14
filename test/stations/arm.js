const assert = require('assert');

const arm = require('../../src/stations/arm');
arm.logger.setLevel(arm.logger.LEVEL_ERROR);

describe('stations/Arm', function() {
    describe('#getBoardOffset()', function () {
        [
            [400, 600, 400, 600, 0],
            [100, 300, 400, 600, -0.6],
            [400, 600, 100, 300, 0],
            [0, 0, 400, 600, -1],
            [700, 900, 400, 600, 0.6]
        ].forEach((dataSet) => {
            it('should return ' + dataSet[4] + ' when bounding box of piece is ' + dataSet[0] + '-' + dataSet[1] + '/' + dataSet[2] + '-' + dataSet[3], function() {
                const Piece = require('../../src/models/Piece');
                let piece = new Piece();
                piece.boundingBox.left = dataSet[0];
                piece.boundingBox.right = dataSet[1];
                piece.boundingBox.top = dataSet[2];
                piece.boundingBox.bottom = dataSet[3];

                assert.equal(arm.getBoardOffset(piece), dataSet[4]);
            });
        });
    });
    describe('#getArmOffset()', function () {
        [
            [400, 600, 400, 600, 0],
            [400, 600, 100, 300, -0.6],
            [100, 300, 400, 600, 0],
            [400, 600, 0, 0, -1],
            [400, 600, 700, 900, 0.6]
        ].forEach((dataSet) => {
            it('should return ' + dataSet[4] + ' when bounding box of piece is ' + dataSet[0] + '-' + dataSet[1] + '/' + dataSet[2] + '-' + dataSet[3], function() {
                const Piece = require('../../src/models/Piece');
                let piece = new Piece();
                piece.boundingBox.left = dataSet[0];
                piece.boundingBox.right = dataSet[1];
                piece.boundingBox.top = dataSet[2];
                piece.boundingBox.bottom = dataSet[3];

                assert.equal(arm.getArmOffset(piece), dataSet[4]);
            });
        });
    })
});