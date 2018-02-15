require('colors');

const Station = require('./station');

class Arm extends Station {
    constructor() {
        super();

        this.logger = require('../logger').getInstance('Station'.cyan + ' Arm'.magenta);
        this.logger.setLevel(this.logger.LEVEL_DEBUG);
        this.modeService = require('../modeService');
        this.armClient = require('../armClient');
        this.brickPiMaster = require('../brickpiMaster');
        this.events = require('../events');

        this.armFinished = true;

        this.groupsOrdered = false;

        this.pieceDistance = 3;//1.9;
        this.tileWidth = Math.floor(30/*cm on z-axis*/ / this.pieceDistance);
        this.tileHeight = Math.floor(25/*cm on x-axis*/ / this.pieceDistance);

        this.events.listen('projectSelected', async () => {
            this.groupsOrdered = false;
        });
    }

    /**
     * Waits for the arm to finish its last action.
     *
     * @return {Promise<void>}
     */
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Tests the correct placement position. No piece needed for this.
     *
     * @param {int} x
     * @param {int} y
     * @return {Promise<void>}
     */
    async testPlacement(x, y) {
        await this.armClient.collect(0);
        await this.armClient.moveToPlatform();

        await Promise.all([
            this.armClient.moveTo(y),
            this.brickPiMaster.prepareBoard(x)
        ]);

        await this.armClient.place();


        this.setReady();
        this.armFinished = true;
    }

    /**
     * Calculates the x offset of the piece on the plate.
     *
     * @param {Piece} piece
     * @return {number}
     */
    getArmOffset(piece) {
        this.logger.debug('Position of piece', piece.boundingBox);
        let armOffset = (piece.boundingBox.getCenterY() - 500) / 500;
        this.logger.debug('arm offset: ', armOffset);

        return armOffset;
    }

    /**
     * Calculates the z offset of the piece on the board.
     *
     * @param {Piece} piece
     * @return {number}
     */
    getBoardOffset(piece) {
        this.logger.debug('Position of piece', piece.boundingBox);
        let boardOffset = (piece.boundingBox.getCenterX() - 500) / 500;
        this.logger.debug('board offset: ', boardOffset);

        return boardOffset;
    }

    /**
     * Moves the piece to the box.
     *
     * @param {Piece} piece
     * @param {int} boxIndex
     * @return {Promise<void>}
     */
    async movePieceToBox(piece, boxIndex) {
        this.logger.info('Moving piece to box');

        await this.waitForArmFinished();
        this.logger.debug("arm finished");
        this.armFinished = false;

        await this.armClient.collect(this.getArmOffset(piece));
        this.logger.debug("collected");

        await this.armClient.moveToTrash();
        this.logger.debug("Moved to trash");

        this.setReady();
        this.armFinished = true;
    }

    /**
     * Packs the groups and determines, where each group should be positioned.
     *
     * @param {Group[]} groups
     * @return {void}
     */
    orderGroups(groups) {
        if (this.groupsOrdered) return;

        this.logger.debug('Ordering groups');

        let packArray = [];

        const BoardPosition = require('../models/BoardPosition');
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].pieces.length > 1) {

                groups[i].ownPosition = new BoardPosition();

                // noinspection JSUndefinedPropertyAssignment
                groups[i].ownPosition.w = groups[i].toX - groups[i].fromX + 2;
                // noinspection JSUndefinedPropertyAssignment
                groups[i].ownPosition.h = groups[i].toY - groups[i].fromY + 2;

                packArray.push(groups[i].ownPosition);
            }
        }

        const ShelfPack = require('@mapbox/shelf-pack');
        let sprite = new ShelfPack(this.tileWidth * 1000, this.tileHeight * 1000);
        // noinspection JSUnresolvedFunction
        sprite.pack(packArray, {inPlace: true});

        for (let i = 0; i < groups.length; i++) {
            if (groups[i].pieces.length > 1) {
                this.logger.debug('Group ' + groups[i].groupIndex + ' goes to: ', groups[i].ownPosition);
            }
        }

        this.groupsOrdered = true;
    }

    /**
     * Returns the target position for the piece. Null if the piece should not be placed on the board.
     *
     * @param {Group[]} groups
     * @param {Piece} piece
     * @return {BoardPosition}
     */
    getBoardPosition(groups, piece) {
        this.orderGroups(groups);

        let absolutePosition = piece.absolutePosition;
        let group = absolutePosition.group;
        let groupPosition = group.ownPosition;

        if (groupPosition === null || typeof groupPosition.x === 'undefined') {
            throw new Error('Group with only one piece not placing');
        }

        const BoardPosition = require('../models/BoardPosition');
        let boardPosition = new BoardPosition();
        boardPosition.x = groupPosition.x + group.getWidth() - (absolutePosition.x - group.fromX);
        boardPosition.y = groupPosition.y + (absolutePosition.y - group.fromY);

        this.logger.debug('Piece should go to board position ' + boardPosition.x + '/' + boardPosition.y + ' because of: ', groupPosition.x, groupPosition.y, group.fromX, group.fromY, group.getWidth(), group.getHeight(), absolutePosition.x, absolutePosition.y);

        return boardPosition;
    }

    /**
     * Takes the piece from the plate and places it to the given position on the board
     * @param {Piece} piece
     * @param {BoardPosition} boardPosition
     * @return {Promise<void>}
     */
    async moveToBoard(piece, boardPosition) {
        await this.waitForArmFinished();
        this.logger.debug("arm finished");
        this.armFinished = false;

        this.logger.info('Moving piece to ' + boardPosition.x + '/' + boardPosition.y);

        await this.armClient.collect(this.getArmOffset(piece));
        this.logger.debug("collected");

        await this.armClient.moveToPlatform();
        this.logger.debug("moved to platform");

        this.setReady();

        await Promise.all([
            this.armClient.moveTo(boardPosition.y * this.pieceDistance),
            this.brickPiMaster.prepareBoard(boardPosition.x * this.pieceDistance, -this.getBoardOffset(piece))
        ]);
        this.logger.debug("moved");

        await this.armClient.place();
        this.logger.debug("placed");

        this.armFinished = true;
    }

    /**
     * Calculates, where the piece should go on the board and moves it to there.
     *
     * @param {Group[]} groups
     * @param {Piece} piece
     * @return {Promise<void>}
     */
    async placePiece(groups, piece) {
        try {
            let boardPosition = this.getBoardPosition(groups, piece);

            if (boardPosition.x > this.tileWidth || boardPosition.y > this.tileHeight) {
                this.logger.info('Piece not in current board.');
                await this.movePieceToBox(piece, 0);

                return;
            }

            await this.moveToBoard(piece, boardPosition);
        } catch (e) {
            this.logger.info(e);
            this.setReady();
            this.armFinished = true;
        }
    }

    /**
     * Executes the station.
     *
     * @param {Plate} plate
     * @return {Promise<void>}
     */
    async execute(plate) {
        /*await this.testPlacement(20, 0);
        return;*/

        this.logger.notice('Executing...');
        this.logger.debug('getting data');
        let data = await plate.getData();
        this.logger.debug('got data.');

        if (!data['valid']) {
            this.logger.info('Plate empty or not recognized. returning.');
            this.setReady();
            return;
        }

        if (this.modeService.getMode() === this.modeService.MODE_SCAN) {
            await this.movePieceToBox(data['piece'], 0);
        } else if (this.modeService.getMode() === this.modeService.MODE_PLACE) {
            await this.placePiece(data['groups'], data['piece']);
        } else {
            throw new Error('Invalid mode');
        }
    }
}

module.exports = new Arm();