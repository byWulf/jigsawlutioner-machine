import colors from 'colors';

import dateFormat from 'dateformat';

const levelColors = {
    5: colors.gray,
    4: colors.white,
    3: colors.cyan,
    2: colors.yellow,
    1: colors.red
};

export default class Logger {
    static globalLevel = Logger.LEVEL_DEBUG;

    localLevel = null;
    colorizedTitle;

    constructor(colorizedTitle) {
        this.colorizedTitle = colorizedTitle;
    }

    static get LEVEL_DEBUG() {
        return 5;
    }
    static get LEVEL_NOTICE() {
        return 4;
    }
    static get LEVEL_INFO() {
        return 3;
    }
    static get LEVEL_WARNING() {
        return 2;
    }
    static get LEVEL_ERROR() {
        return 1;
    }
    static get LEVEL_NONE() {
        return 0;
    }

    static setGlobalLevel(level) {
        this.globalLevel = level;
    }

    setLevel(level) {
        this.localLevel = level;
    }

    debug() {
        this.log(Logger.LEVEL_DEBUG, arguments);
    }
    notice() {
        this.log(Logger.LEVEL_NOTICE, arguments);
    }
    info() {
        this.log(Logger.LEVEL_INFO, arguments);
    }
    warning() {
        this.log(Logger.LEVEL_WARNING, arguments);
    }
    error() {
        this.log(Logger.LEVEL_ERROR, arguments);
    }

    log(level, data) {
        if (level === Logger.LEVEL_NONE) {
            return;
        }
        if (level > (this.localLevel !== null ? this.localLevel : Logger.globalLevel)) {
            return;
        }

        if (typeof data === 'object') {
            data = Object.keys(data).map(key => data[key]);
        }

        data.unshift(
            levelColors[level]('[' + dateFormat('HH:MM:ss.L') + '] ') +
            this.colorizedTitle.underline + ':'.white + ' ' +
            colors.reset('')
        );

        console.log.apply(this, data);
    }
}
