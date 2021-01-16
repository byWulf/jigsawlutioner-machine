import Logger from '../logger.js';

export default class Plate {
    index;

    logger;

    data = {};

    ready = true;

    constructor(index) {
        this.index = index;
        this.logger = new Logger('Plate'.gray + index);
    }

    get index() {
        return this.index;
    }

    getData() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this.data);
                }
            }, 25);
        });
    }

    setData(key, value) {
        this.data[key] = value;
        this.logger.debug('Got "' + key + '"');
    }

    setNotReady() {
        this.ready = false;
        this.logger.debug('Not ready');
    }

    setReady() {
        this.ready = true;
        this.logger.debug('Ready');
    }
}
