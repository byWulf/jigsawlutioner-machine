require('colors');

class Events {
    constructor() {
        this.logger = require('./logger').getInstance('Events'.white);

        this.listeners = {};
    }

    /**
     * @param {string} eventName
     * @param {*=} data
     */
    dispatch(eventName, data) {
        this.logger.debug('Dispatching event ' + eventName + ' with data:', data);

        if (typeof this.listeners[eventName] === 'undefined') {
            return;
        }

        for (let i = 0; i < this.listeners[eventName].length; i++) {
            this.listeners[eventName][i](data);
        }
    }

    /**
     * @param {string} eventName
     * @param {function} callback
     */
    listen(eventName, callback) {
        this.logger.debug('Adding event listener for event ' + eventName);

        if (typeof this.listeners[eventName] === 'undefined') {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }
}

module.exports = new Events();