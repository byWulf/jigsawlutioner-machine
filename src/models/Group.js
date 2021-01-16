export default class Group {
    /**
     * @type {int}
     */
    groupIndex = 0;

    /**
     * @type {int}
     */
    fromX = 0;

    /**
     * @type {int}
     */
    toX = 0;

    /**
     * @type {int}
     */
    fromY = 0;

    /**
     * @type {int}
     */
    toY = 0;

    /**
     * @type {BoardPosition|null}
     */
    ownPosition = null;

    /**
     * @type {Piece[]}
     */
    pieces = [];

    getWidth() {
        return this.toX - this.fromX;
    }

    getHeight() {
        return this.toY - this.fromY;
    }
}
