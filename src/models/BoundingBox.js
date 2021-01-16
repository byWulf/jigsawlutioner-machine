export default class BoundingBox {
    /**
     * @type {int}
     */
    top = 0;

    /**
     * @type {int}
     */
    bottom = 0;

    /**
     * @type {int}
     */
    left = 0;

    /**
     * @type {int}
     */
    right = 0;

    constructor(left, right, top, bottom) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }

    static createFromObject(object) {
        if (typeof object !== 'object') {
            throw new Error('Got something else than an object.');
        }

        return new BoundingBox(
            object.left ? parseInt(object.left, 10) : 0,
            object.right ? parseInt(object.right, 10) : 0,
            object.top ? parseInt(object.top, 10) : 0,
            object.bottom ? parseInt(object.bottom, 10) : 0
        );
    }

    getCenterX() {
        return this.left + (this.right - this.left) / 2;
    }

    getCenterY() {
        return this.top + (this.bottom - this.top) / 2;
    }
}
