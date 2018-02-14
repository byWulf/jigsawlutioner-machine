function Group() {
    /**
     * @type {int}
     */
    this.groupIndex = 0;

    /**
     * @type {int}
     */
    this.fromX = 0;

    /**
     * @type {int}
     */
    this.toX = 0;

    /**
     * @type {int}
     */
    this.fromY = 0;

    /**
     * @type {int}
     */
    this.toY = 0;

    /**
     * @type {BoardPosition}
     */
    this.ownPosition = null;

    /**
     * @type {Piece[]}
     */
    this.pieces = [];

    this.fillFromObject = (object) => {
        if (typeof object !== 'object') {
            return;
        }

        this.fromX = object.fromX ? parseInt(object.fromX, 10) : 0;
        this.toX = object.toX ? parseInt(object.toX, 10) : 0;
        this.fromY = object.fromY ? parseInt(object.fromY, 10) : 0;
        this.toY = object.toY ? parseInt(object.toY, 10) : 0;
    };

    this.getWidth = () => {
        return this.toX - this.fromX;
    };

    this.getHeight = () => {
        return this.toY - this.fromY;
    };
}

module.exports = Group;