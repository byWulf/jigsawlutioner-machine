export default class AbsolutePosition {
    /**
     * @type {Group|null}
     */
    group = null;

    /**
     * @type {int}
     */
    x = 0;

    /**
     * @type {int}
     */
    y = 0;

    constructor(x, y, group) {
        this.x = x;
        this.y = y;
        this.group = group || null;
    }

    static createFromObject(object) {
        if (typeof object !== 'object') {
            console.log(object);
            throw new Error('Got something else than an object.');
        }

        return new AbsolutePosition(
            object.x ? parseInt(object.x, 10) : 0,
            object.y ? parseInt(object.y, 10) : 0,
            object.baseSide ? parseInt(object.baseSide, 10) : 0
        );
    }
}
