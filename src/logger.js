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

function Logger() {
    const inst = this;

    this.LEVEL_DEBUG = 5;
    this.LEVEL_NOTICE = 4;
    this.LEVEL_INFO = 3;
    this.LEVEL_WARNING = 2;
    this.LEVEL_ERROR = 1;

    let levelColors = {
        5: colors.gray,
        4: colors.white,
        3: colors.cyan,
        2: colors.yellow,
        1: colors.red
    };

    let currentLevel = 5;

    /**
     * @param title
     * @param color
     *
     * @returns {{debug: function, notice: function, info: function, warning: function, error: function}}
     */
    this.getInstance = (title, color) => {
        if (!color) {
            color = colors.white;
        }

        return new function() {
            const log = (level, data) => {
                if (level > currentLevel) return;
                if (typeof data === 'object') {
                    data = Object.keys(data).map(key => data[key]);
                }

                data.unshift(
                    levelColors[level]('[' + getFormattedDate() + '] ') +
                    (title ? color.underline(title) + color(':') + ' ' : '') +
                    colors.reset('')
                );

                console.log.apply(this, data);
            };

            this.debug = function() { log(inst.LEVEL_DEBUG, arguments); };
            this.notice = function() { log(inst.LEVEL_NOTICE, arguments); };
            this.info = function() { log(inst.LEVEL_INFO, arguments); };
            this.warning = function() { log(inst.LEVEL_WARNING, arguments); };
            this.error = function() { log(inst.LEVEL_ERROR, arguments); };
        };
    };

    this.setLevel = (level) => {
        currentLevel = level;
    };
}

module.exports = new Logger();