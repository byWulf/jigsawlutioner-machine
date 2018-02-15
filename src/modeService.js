const logger = require('./logger').getInstance('Mode'.blue);
logger.setLevel(logger.LEVEL_INFO);
const events = require('./events');


function ModeService() {
    this.MODE_SCAN = 'scan';
    this.MODE_PLACE = 'place';

    this.mode = 'scan';

    this.switchMode = (mode) => {
        this.mode = mode;
        logger.info('=========================');
        logger.info('== Switched to mode ' + mode);
        logger.info('=========================');

        events.dispatch('modeSwitched', mode);
    };
    this.getMode = () => {
        return this.mode;
    };
}

module.exports = new ModeService();