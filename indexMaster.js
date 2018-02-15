require('colors');

const conveyor = require('./src/conveyor');
const brickPi = require('./src/brickpiMaster');
const armClient = require('./src/armClient');
const mode = require('./src/modeService');
const webserver = require('./src/webserver');
const projectManager = require('./src/projectManager');

const logger = require('./src/logger').getInstance('Main'.green);
logger.setGlobalLevel(logger.LEVEL_WARNING);

(async () => {
    webserver.start();
    projectManager.init();

    await brickPi.init();

    brickPi.onModeSwitch(() => {
        mode.switchMode(mode.getMode() === 'compare' ? 'scan' : 'compare');
    });

    logger.info('Setting up conveyor');
    conveyor.setPlateCount(11);
    conveyor.setForwardFunction(brickPi.nextPlate);
    conveyor.addStation(3, require('./src/stations/photobox'));
    conveyor.addStation(5, require('./src/stations/rotator'));
    conveyor.addStation(8, require('./src/stations/arm'));

    logger.info('Connecting to arm');
    await armClient.connect();

    logger.info('Resetting motors');
    await Promise.all([brickPi.resetMotors(), armClient.reset()]);
})();