function BoundingBox() {
    /**
     * @type {int}
     */
    this.top = 0;

    /**
     * @type {int}
     */
    this.bottom = 0;

    /**
     * @type {int}
     */
    this.left = 0;

    /**
     * @type {int}
     */
    this.right = 0;

    this.fillFromObject = (object) => {
        if (typeof object !== 'object') {
            return;
        }

        this.top = object.top ? parseInt(object.top, 10) : 0;
        this.bottom = object.bottom ? parseInt(object.bottom, 10) : 0;
        this.left = object.left ? parseInt(object.left, 10) : 0;
        this.right = object.right ? parseInt(object.right, 10) : 0;
    };

    this.getCenterX = () => {
        return this.left + (this.right - this.left) / 2;
    };

    this.getCenterY = () => {
        return this.top + (this.bottom - this.top) / 2;
    };
}

module.exports = BoundingBox;