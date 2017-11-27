const logger = require('./logger').getInstance('Mode'.blue);


function Mode() {
    this.mode = 'scan';

    this.switchMode = (mode) => {
        this.mode = mode;
        logger.info('Switched to mode ' + mode);
    };
    this.getMode = () => {
        return this.mode;
    };
}

module.exports = new Mode();