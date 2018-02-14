const assert = require('assert');

const BoundingBox = require('../../src/models/BoundingBox');

describe('models/BoundingBox', function() {
    describe('#getCenterX()', function () {
        [
            [400, 600, 400, 600, 500],
            [100, 300, 400, 600, 200],
            [400, 600, 100, 300, 500],
            [0, 0, 400, 600, 0],
            [700, 900, 400, 600, 800],
            [400, 700, 0, 0, 550]
        ].forEach((dataSet) => {
            it('should return ' + dataSet[4] + ' when bounding box of piece is ' + dataSet[0] + '-' + dataSet[1] + '/' + dataSet[2] + '-' + dataSet[3], function() {
                let boundingBox = new BoundingBox();
                boundingBox.left = dataSet[0];
                boundingBox.right = dataSet[1];
                boundingBox.top = dataSet[2];
                boundingBox.bottom = dataSet[3];

                assert.equal(boundingBox.getCenterX(), dataSet[4]);
            });
        });
    });
    describe('#getCenterY()', function () {
        [
            [400, 600, 400, 600, 500],
            [400, 600, 100, 300, 200],
            [100, 300, 400, 600, 500],
            [400, 600, 0, 0, 0],
            [400, 600, 700, 900, 800],
            [0, 0, 400, 700, 550]
        ].forEach((dataSet) => {
            it('should return ' + dataSet[4] + ' when bounding box of piece is ' + dataSet[0] + '-' + dataSet[1] + '/' + dataSet[2] + '-' + dataSet[3], function() {
                let boundingBox = new BoundingBox();
                boundingBox.left = dataSet[0];
                boundingBox.right = dataSet[1];
                boundingBox.top = dataSet[2];
                boundingBox.bottom = dataSet[3];

                assert.equal(boundingBox.getCenterY(), dataSet[4]);
            });
        });
    });
});