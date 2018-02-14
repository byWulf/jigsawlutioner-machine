function AbsolutePosition() {
    /**
     * @type {Group}
     */
    this.group = null;

    /**
     * @type {int}
     */
    this.x = 0;

    /**
     * @type {int}
     */
    this.y = 0;

    /**
     * @type {number}
     */
    this.baseSide = 0;

    this.fillFromObject = (object) => {
        if (typeof object !== 'object') {
            return;
        }

        this.x = object.x ? parseInt(object.x, 10) : 0;
        this.y = object.y ? parseInt(object.y, 10) : 0;
        this.baseSide = object.baseSide ? parseInt(object.baseSide, 10) : 0;
    }
}

module.exports = AbsolutePosition;