import Station from "./station.js";
import ControllerRequest from "../controllerRequest.js";

export default class Rotator extends Station {
    resetApi;

    rotateApi;

    constructor(pi, pushMotorPort, rotateMotorPort) {
        super('Rotator'.green);

        this.resetApi = new ControllerRequest(pi, '/reset')
            .addMotor('pushMotor', pushMotorPort);

        this.rotateApi = new ControllerRequest(pi, '/rotate')
            .addMotor('pushMotor', pushMotorPort)
            .addMotor('rotateMotor', rotateMotorPort);
    }

    /**
     * @param {Piece} piece
     * @param {int} targetSide
     * @return {number}
     */
    getRotation(piece, targetSide) {
        return -Math.atan2(
                piece.sides[3-targetSide]['endPoint'].y - piece.sides[3-targetSide]['startPoint'].y,
                piece.sides[3-targetSide]['endPoint'].x - piece.sides[3-targetSide]['startPoint'].x
            ) * 180 / Math.PI - 90;
    }

    /**
     *
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} x
     * @param {number} y
     * @param {number} angle
     * @return {{x: number, y: number}}
     */
    rotatePoint(centerX, centerY, x, y, angle) {
        let radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - centerX)) + (sin * (y - centerY)) + centerX,
        ny = (cos * (y - centerY)) - (sin * (x - centerX)) + centerY;
        return {x: nx, y: ny};
    }

    /**
     * @param {Piece} piece
     * @param {int} targetSide
     * @param {number} rotation
     */
    recalculateBoundingBox(piece, targetSide, rotation) {
        this.logger.debug('recalculating bounding box. center: ', piece.boundingBox.getCenterX() + '/' + piece.boundingBox.getCenterY(), ' Rotation: ', rotation);

        let rotatedCenter = this.rotatePoint(500, 500, piece.boundingBox.getCenterX(), piece.boundingBox.getCenterY(), -rotation);

        this.logger.debug(' => new bounding box center:', Math.round(rotatedCenter.x) + '/' + Math.round(rotatedCenter.y));

        let width = (piece.sides[targetSide].directLength + piece.sides[(targetSide + 2) % 4].directLength) / 2;
        let height = (piece.sides[(targetSide + 1) % 4].directLength + piece.sides[(targetSide + 3) % 4].directLength) / 2;

        piece.boundingBox.left = rotatedCenter.x - width / 2;
        piece.boundingBox.right = rotatedCenter.x + width / 2;
        piece.boundingBox.top = rotatedCenter.y - height / 2;
        piece.boundingBox.bottom = rotatedCenter.y + height / 2;
    }

    async execute(plate) {
        this.logger.notice('#' + plate.index + ' - Executing...');

        if (!this.isPlaceMode()) {
            this.logger.debug('Not in placement mode. returning.')
            this.setReady();
            return;
        }

        let data = await plate.getData();

        // noinspection JSUnresolvedVariable
        if (typeof data.valid === 'undefined' || !data.valid) {
            this.logger.debug('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        let targetSide = (data['piece'].absolutePosition.baseSide + data['sideOffset']) % 4;

        this.logger.debug('Side should be up: ', targetSide, " because baseSide is " + data['piece'].absolutePosition.baseSide + " and sideOffset is " + data['sideOffset']);
        for (let i = 0; i < 4; i++) {
            this.logger.debug('points of side ' + i, data['piece'].sides[i]['startPoint'], data['piece'].sides[i]['endPoint']);
        }

        let rotation = this.getRotation(data['piece'], targetSide);
        this.logger.info('Rotating piece ' + rotation + ' degree');

        await this.rotateApi.setParameter('degree', rotation).call();

        data['piece'].absolutePosition.baseSide = (data['piece'].absolutePosition.baseSide + data['sideOffset']) % 4;

        this.recalculateBoundingBox(data['piece'], targetSide, rotation);

        this.setReady();
    }

    reset() {
        return this.resetApi.call();
    }
}
