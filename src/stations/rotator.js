const Station = require('./station');
const brickPi = require('../brickpiMaster');
const colors = require('colors');
const logger = require('../logger').getInstance('Station'.cyan + ' Rotator'.green);
const mode = require('../mode');

class Rotator extends Station {
    async execute(plate) {
        let data = await plate.getData();

        if (typeof data.valid === 'undefined' || !data.valid) {
            logger.debug('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        if (mode.getMode() === 'scan') {
            this.setReady();
        }

        if (mode.getMode() === 'compare') {
            let targetSide = (data.position.rotation + data.sideOffset) % 4;

            logger.debug('Side should be up: ', targetSide);

            for (let i = 0; i < 4; i++) {
                logger.debug('points of side ' + i, data.piece.sides[i].startPoint,  data.piece.sides[i].endPoint);
            }

            let rotation = -Math.atan2(
                data.piece.sides[3-targetSide].endPoint[2] - data.piece.sides[3-targetSide].startPoint[2],
                data.piece.sides[3-targetSide].endPoint[1] - data.piece.sides[3-targetSide].startPoint[1]
            ) * 180 / Math.PI - 90;

            logger.info('Rotating piece ' + rotation + ' degree');

            await brickPi.rotatePiece(rotation);

            this.setReady();
        }
    }
}

module.exports = new Rotator();