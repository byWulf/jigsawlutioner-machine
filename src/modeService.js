import Logger from "./logger.js";
const logger = new Logger('Mode'.blue);
logger.setLevel(Logger.LEVEL_INFO);

class ModeService {
    get MODE_SCAN() {
        return 'scan';
    }

    get MODE_PLACE() {
        return 'place';
    }

    mode = this.MODE_SCAN;

    switchMode(mode) {
        this.mode = mode;
        logger.info('=========================');
        logger.info('== Switched to mode ' + mode);
        logger.info('=========================');

        process.emit('jigsawlutioner.modeSwitched', mode);
    }

    getMode() {
        return this.mode;
    }
}

export default new ModeService();
