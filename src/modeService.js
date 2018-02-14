const logger = require('./logger').getInstance('Mode'.blue);


function ModeService() {
    this.mode = 'scan';

    this.switchMode = (mode) => {
        this.mode = mode;
        logger.info('=========================');
        logger.info('Switched to mode ' + mode);
        logger.info('=========================');
    };
    this.getMode = () => {
        return this.mode;
    };
}

module.exports = new ModeService();