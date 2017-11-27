const Conveyor = require('./src/conveyor');
const brickPi = require('./src/brickpiMaster');
const armClient = require('./src/armClient');
const mode = require('./src/mode');

const colors = require('colors');
const logger = require('./src/logger').getInstance('Main'.green);

(async () => {
    await brickPi.init();

    brickPi.onModeSwitch(() => {
        mode.switchMode(mode.getMode() === 'compare' ? 'scan' : 'compare');
    });

    logger.info('Creating conveyor');

    const conveyor = new Conveyor(11, brickPi.nextPlate);

    conveyor.addStation(3, require('./src/stations/photobox'));
    conveyor.addStation(5, require('./src/stations/rotator'));
    conveyor.addStation(8, require('./src/stations/arm'));

    logger.info('Connecting to arm');
    await armClient.connect();

    logger.info('Resetting motors');
    await Promise.all([brickPi.resetMotors(), armClient.reset()]);

    logger.info('Starting conveyor');
    // noinspection JSIgnoredPromiseFromCall
    conveyor.start();
})();