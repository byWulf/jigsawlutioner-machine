const colors = require('colors');

function getFormattedDate() {
    let date = new Date();

    let str = '';
    str += (date.getHours() < 10 ? '0' : '') + date.getHours() + ':';
    str += (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ':';
    str += (date.getSeconds() < 10 ? '0' : '') + date.getSeconds() + '.';
    str += (date.getMilliseconds() < 100 ? '0' : '') + (date.getMilliseconds() < 10 ? '0' : '') + date.getMilliseconds();

    return str;
}

const LEVEL_DEBUG = 5;
const LEVEL_NOTICE = 4;
const LEVEL_INFO = 3;
const LEVEL_WARNING = 2;
const LEVEL_ERROR = 1;

function Logger() {
    let levelColors = {
        5: colors['gray'],
        4: colors['white'],
        3: colors['cyan'],
        2: colors['yellow'],
        1: colors['red']
    };

    let globalLevel = 5;

    /**
     * @param title
     * @param color
     *
     * @returns {{debug: function, notice: function, info: function, warning: function, error: function, setLevel: function, setGlobalLevel: function, LEVEL_DEBUG: int, LEVEL_NOTICE: int, LEVEL_INFO: int, LEVEL_WARNING: int, LEVEL_ERROR: int}}
     */
    this.getInstance = (title, color) => {
        if (!color) {
            color = colors['white'];
        }

        return new function() {
            this.LEVEL_DEBUG = LEVEL_DEBUG;
            this.LEVEL_NOTICE = LEVEL_NOTICE;
            this.LEVEL_INFO = LEVEL_INFO;
            this.LEVEL_WARNING = LEVEL_WARNING;
            this.LEVEL_ERROR = LEVEL_ERROR;

            let maxLevel = null;

            const log = (level, data) => {
                if (maxLevel !== null ? level > maxLevel : level > globalLevel) return;
                if (typeof data === 'object') {
                    data = Object.keys(data).map(key => data[key]);
                }

                // noinspection JSUnresolvedFunction
                data.unshift(
                    levelColors[level]('[' + getFormattedDate() + '] ') +
                    (title ? color.underline(title) + color(':') + ' ' : '') +
                    colors.reset('')
                );

                console.log.apply(this, data);
            };

            this.debug = function() { log(LEVEL_DEBUG, arguments); };
            this.notice = function() { log(LEVEL_NOTICE, arguments); };
            this.info = function() { log(LEVEL_INFO, arguments); };
            this.warning = function() { log(LEVEL_WARNING, arguments); };
            this.error = function() { log(LEVEL_ERROR, arguments); };

            this.setLevel = (level) => {
                maxLevel = level;
            };
            this.setGlobalLevel = (level) => {
                globalLevel = level;
            };
        };
    };
}

module.exports = new Logger();