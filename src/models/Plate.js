function Plate(plateIndex) {
    this.logger = require('../logger').getInstance('Plate'.gray + plateIndex);
    this.logger.setLevel(this.logger.LEVEL_DEBUG);

    this.index = plateIndex;
    this.data = {};
    this.ready = true;

    this.getData = () => {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this.data);
                }
            }, 100);
        });
    };

    this.setData = (key, value) => {
        this.data[key] = value;
        this.logger.debug('Got "' + key + '"');
    };

    this.setNotReady = () => {
        this.ready = false;
        this.logger.debug('Not ready');
    };

    this.setReady = () => {
        this.ready = true;
        this.logger.debug('Ready');
    };
}

module.exports = Plate;