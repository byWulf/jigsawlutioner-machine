const Station = require('./station');
const armClient = require('../armClient');
const brickPi = require('../brickpiMaster');
const colors = require('colors');
const logger = require('../logger').getInstance('Station'.cyan + ' Arm'.magenta);
const mode = require('../mode');
const ShelfPack = require('@mapbox/shelf-pack');

class Arm extends Station {
    constructor() {
        super();

        this.armFinished = true;

        this.groupOffsets = null;
    }

    waitForArmFinished() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.armFinished) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    async execute(plate) {
        logger.notice('Executing...');
        logger.debug('getting data');
        let data = await plate.getData();
        logger.debug('got data.');

        if (typeof data.valid === 'undefined' || !data.valid) {
            logger.info('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        await this.waitForArmFinished();
        logger.debug("arm finished");
        this.armFinished = false;

        if (mode.getMode() === 'scan') {
            logger.info('Piece recognized. Moving it to box 1');

            logger.debug('Position of piece', data);
            let center = data.piece.boundingBox.top + (data.piece.boundingBox.bottom - data.piece.boundingBox.top) / 2;
            let armOffset = -(495 - center) / 2;
            logger.debug('arm offset: ', armOffset);
            await armClient.collect(armOffset);
            logger.debug("collected");
            this.setReady();

            await Promise.all([
                armClient.moveTo(10),
                brickPi.selectBox1()
            ]);

            logger.debug("moved and box selected");
            await armClient.place();
            logger.debug("placed");

            this.armFinished = true;
        } else if (mode.getMode() === 'compare') {
            let pieceDistance = 3;

            if (this.groupOffsets === null) {
                this.groupOffsets = [];
                for (let groupIndex in data.piecePlacements) {
                    if (!data.piecePlacements.hasOwnProperty(groupIndex)) continue;

                    let group = {groupIndex: groupIndex};

                    let minY = 0, minX = 0, maxY = 0, maxX = 0, count = 0;
                    for (let x in data.piecePlacements[groupIndex]) {
                        if (!data.piecePlacements[groupIndex].hasOwnProperty(x)) continue;

                        for (let y in data.piecePlacements[groupIndex][x]) {
                            if (!data.piecePlacements[groupIndex][x].hasOwnProperty(y)) continue;

                            minY = Math.min(minY, parseInt(y, 10));
                            maxY = Math.max(maxY, parseInt(y, 10));
                            minX = Math.min(minX, parseInt(x, 10));
                            maxX = Math.max(maxX, parseInt(x, 10));

                            count++;
                        }
                    }

                    group.innerOffsetX = minX;
                    group.innerOffsetY = minY;

                    group.realWidth = maxX - minX;
                    group.realHeight = maxY - minY;

                    group.w = maxX - minX + 2;
                    group.h = maxY - minY + 2;

                    if (count > 1) {
                        this.groupOffsets.push(group);
                    }
                }

                let sprite = new ShelfPack(40 / pieceDistance + 1, 32 / pieceDistance + 1);
                sprite.pack(this.groupOffsets, {inPlace: true});
                logger.debug(this.groupOffsets);
            }

            let groupOffset = null;
            for (let i = 0; i < this.groupOffsets.length; i++) {
                if (parseInt(this.groupOffsets[i].groupIndex, 10) === parseInt(data.position.groupIndex, 10)) {
                    groupOffset = this.groupOffsets[i];
                    break;
                }
            }

            if (groupOffset === null || typeof groupOffset.x === 'undefined') {
                logger.info('Group with only one piece not placing');
                this.setReady();
                this.armFinished = true;

                return;
            }

            let x = groupOffset.x + groupOffset.realWidth - (data.position.x - groupOffset.innerOffsetX);
            let y = groupOffset.y + (data.position.y - groupOffset.innerOffsetY);

            logger.info('Moving piece to ' + x + '/' + y);
            logger.debug('Position of piece', data);
            let center = data.piece.boundingBox.top + (data.piece.boundingBox.bottom - data.piece.boundingBox.top) / 2;
            let armOffset = -(495 - center) / 2;
            logger.debug('arm offset: ', armOffset);
            await armClient.collect(armOffset);
            logger.debug("collected");
            this.setReady();

            await Promise.all([
                armClient.moveTo(y * pieceDistance + 5),
                brickPi.prepareBoard(x * pieceDistance + 2)
            ]);

            logger.debug("moved and box selected");
            await armClient.place();
            logger.debug("placed");

            this.armFinished = true;
        } else {
            throw new Error('Invalid mode');
        }
    }
}

module.exports = new Arm();