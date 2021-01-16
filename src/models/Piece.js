import BoundingBox from './BoundingBox.js';
import AbsolutePosition from "./AbsolutePosition.js";

export default class Piece {
    /**
     * @type {int}
     */
    pieceIndex = 0;

    /**
     * @type {Object[]}
     */
    sides = [];

    /**
     * @type {BoundingBox}
     */
    boundingBox = new BoundingBox();

    /**
     * @type {AbsolutePosition}
     */
    absolutePosition = new AbsolutePosition();

    /**
     * @type {Object<string>}
     */
    files = {};

    /**
     * @type {Object<Object>}
     */
    images = {};

    dimensions = {};

    constructor(pieceIndex, sides, boundingBox, files, images, dimensions) {
        this.pieceIndex = pieceIndex;
        this.sides = sides;
        this.boundingBox = boundingBox;
        this.files = files;
        this.images = images;
        this.dimensions = dimensions;
    }

    static createFromObject(object) {
        if (typeof object !== 'object') {
            throw new Error('Got something else than an object.');
        }

        return new Piece(
            object.pieceIndex ? parseInt(object.pieceIndex, 10) : 0,
            object.sides || [],
            BoundingBox.createFromObject(object.boundingBox),
            object.files || {},
            object.images || {},
            object.dimensions || {}
        );
    };
}
