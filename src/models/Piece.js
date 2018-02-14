const BoundingBox = require('./BoundingBox');
const AbsolutePosition = require('./AbsolutePosition');

function Piece() {
    /**
     * @type {int}
     */
    this.pieceIndex = 0;

    /**
     * @type {Object[]}
     */
    this.sides = [];

    /**
     * @type {BoundingBox}
     */
    this.boundingBox = new BoundingBox();

    /**
     * @type {AbsolutePosition}
     */
    this.absolutePosition = new AbsolutePosition();

    /**
     * @type {Object<string>}
     */
    this.files = {};

    this.fillFromObject = (object) => {
        if (typeof object !== 'object') {
            return;
        }

        this.pieceIndex = object.pieceIndex ? parseInt(object.pieceIndex, 10) : 0;
        this.sides = object.sides || [];
        this.boundingBox.fillFromObject(object.boundingBox);
        this.files = object.files || {};
        this.absolutePosition.fillFromObject(object.absolutePosition);
    };
}

module.exports = Piece;