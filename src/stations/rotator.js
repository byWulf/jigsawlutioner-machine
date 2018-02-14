require('colors');

const Station = require('./station');

class Rotator extends Station {
    constructor() {
        super();

        this.logger = require('../logger').getInstance('Station'.cyan + ' Rotator'.green);
        this.brickPi = require('../brickpiMaster');
        this.modeService = require('../modeService');
    }

    getRotation(piece, targetSide) {
        return -Math.atan2(
                piece.sides[3-targetSide]['endPoint'][2] - piece.sides[3-targetSide]['startPoint'][2],
                piece.sides[3-targetSide]['endPoint'][1] - piece.sides[3-targetSide]['startPoint'][1]
            ) * 180 / Math.PI - 90;
    }

    async execute(plate) {
        let data = await plate.getData();

        if (typeof data.valid === 'undefined' || !data.valid) {
            this.logger.debug('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        if (this.modeService.getMode() === 'scan') {
            this.setReady();
        }

        if (this.modeService.getMode() === 'compare') {
            let targetSide = (data['piece'].absolutePosition.baseSide + data['sideOffset']) % 4;

            this.logger.debug('Side should be up: ', targetSide, " because baseSide is " + data['piece'].absolutePosition.baseSide + " and sideOffset is " + data['sideOffset']);
            for (let i = 0; i < 4; i++) {
                this.logger.debug('points of side ' + i, data['piece'].sides[i]['startPoint'], data['piece'].sides[i]['endPoint']);
            }

            let rotation = this.getRotation(data['piece'], targetSide);
            this.logger.info('Rotating piece ' + rotation + ' degree');
            await this.brickPi.rotatePiece(rotation);
            data['piece'].absolutePosition.baseSide = (data['piece'].absolutePosition.baseSide + data['sideOffset']) % 4;

            this.setReady();
        }
    }
}

module.exports = new Rotator();