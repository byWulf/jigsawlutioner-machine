import Station from "./station.js";
import ControllerRequest from "../controllerRequest.js";

import sharp from "sharp";

export default class Sorter extends Station {
    resetApi;

    moveToBoxApi;

    constructor(pi, pushMotorPort, moveMotorPort, boxMotorPort) {
        super('Sorter'.red);

        this.resetApi = new ControllerRequest(pi, '/reset')
            .addMotor('pushMotor', pushMotorPort)
            .addMotor('moveMotor', moveMotorPort)
            .addMotor('boxMotor', boxMotorPort);

        this.moveToBoxApi = new ControllerRequest(pi, '/move-to-box')
            .addMotor('pushMotor', pushMotorPort)
            .addMotor('moveMotor', moveMotorPort)
            .addMotor('boxMotor', boxMotorPort);
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

        await this.moveToBoxApi
            .setParameter('offset', this.getArmOffset(data.piece))
            .setParameter('box', await this.getBox(data.piece))
            .call()
        ;

        this.setReady();
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

    async getBox(piece) {
        throw new Error('Must implement "getBox" method.')
    }

    reset() {
        return this.resetApi.call();
    }
}
