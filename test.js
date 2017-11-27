const brickPi = require('./src/brickpiMaster');
const colors = require('colors');



const logger = require('./src/logger').getInstance('Foo', colors.green);

(async () => {
    logger.debug('Start');
    await brickPi.resetMotors();
    logger.info('Motors resetted');
    await brickPi.rotatePiece(90);
    logger.warning('Rotated');
})();