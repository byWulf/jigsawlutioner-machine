import Station from "./station.js";
import ControllerRequest from "../controllerRequest.js";

import sharp from "sharp";

export default class Sorter extends Station {
    resetApi;

    moveToBoxApi;

    constructor(pi, pushMotorBrick, pushMotorPort, moveMotorBrick, moveMotorPort, boxMotorBrick, boxMotorPort) {
        super('Sorter'.red);

        this.resetApi = new ControllerRequest(pi, '/sorter/reset')
            .addMotor('pushMotor', pushMotorBrick, pushMotorPort)
            .addMotor('moveMotor', moveMotorBrick, moveMotorPort)
            .addMotor('boxMotor', boxMotorBrick, boxMotorPort);

        this.moveToBoxApi = new ControllerRequest(pi, '/sorter/move-to-box')
            .addMotor('pushMotor', pushMotorBrick, pushMotorPort)
            .addMotor('moveMotor', moveMotorBrick, moveMotorPort)
            .addMotor('boxMotor', boxMotorBrick, boxMotorPort);
    }

    async execute(plate) {
        this.logger.notice('#' + plate.index + ' - Executing...');

        let data = await plate.getData();

        // noinspection JSUnresolvedVariable
        if (typeof data.valid === 'undefined' || !data.valid) {
            this.logger.debug('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        if (this.isScanMode()) {
            //const box = await this.getBoxByColor(data.piece);
            const box = await this.getBox(data.piece);

            await this.moveToBoxApi.setParameter('offset', this.getArmOffset(data.piece)).setParameter('box', box).call();

            this.setReady();
        }

    }

    /**
     * Calculates the x offset of the piece on the plate.
     *
     * @param {Piece} piece
     * @return {number}
     */
    getArmOffset(piece) {
        this.logger.debug('Position of piece', piece.boundingBox);
        let armOffset = (piece.boundingBox.getCenterX() - 500) / 500;
        this.logger.debug('arm offset: ', armOffset);

        return armOffset;
    }

    async getBoxByNops(piece) {
        let straight = 0;
        let nops = 0;

        for (let i = 0; i < piece.sides.length; i++) {
            let side = piece.sides[i];

            if (side.direction === 'in') {
                nops++;
            }
            if (side.direction === 'straight') {
                straight++;
            }
        }

        if (straight === 2) {
            return 0;
        }

        if (straight === 1) {
            return 1;
        }

        if (nops === 0) {
            return 2;
        }

        if (nops === 4) {
            return 3;
        }

        return 4;
    }

    async getBoxByColor(piece) {
        const buffer = Buffer.from(piece.images.transparent.buffer, piece.images.transparent.encoding);
        const stats = await sharp(buffer).stats();
        const red = stats.channels[0].mean;
        const green = stats.channels[1].mean;
        const blue = stats.channels[1].mean;

        if (red > green * 1.1) {
            return 0;
        }

        if (green > blue * 1.1) {
            return 1;
        }

        if (blue > red * 1.1) {
            return 2;
        }

        return 3;
    }

    reset() {
        return this.resetApi.call();
    }
}
