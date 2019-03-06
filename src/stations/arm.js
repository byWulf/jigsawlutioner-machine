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
        this.conveyor = require('../conveyor');

        this.armFinished = true;

        this.groupsOrdered = false;

        this.pieceDistance = 2.5;//1.9;
        this.boardWidth = Math.floor(40/*cm on z-axis*/ / this.pieceDistance);
        this.boardHeight = Math.floor(35/*cm on x-axis*/ / this.pieceDistance);

        this.maxX = 0;
        this.maxY = 0;
        this.selectedBoard = 0;
        this.boardStatistics = {};

        this.events.listen('projectSelected', async () => {
            this.groupsOrdered = false;
            this.selectedBoard = 0;
            this.boardStatistics = {};
            this.maxX = 0;
            this.maxY = 0;
            this.events.dispatch('boardSelected', this.selectedBoard);
            this.events.dispatch('boardStatistics', this.boardStatistics);
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

        await Promise.all([
            this.armClient.collect(this.getArmOffset(piece)),
            this.brickPiMaster.selectSortBox(boxIndex)
        ]);
        this.logger.debug("collected and box selected");

        await this.armClient.moveToBoxRamp();
        this.logger.debug("Moved to box ramp");

        this.setReady();

        await this.armClient.moveToBox();
        this.logger.debug("Moved to box");

        await this.armClient.standby();
        this.logger.debug("standby");

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
        let sprite = new ShelfPack(this.boardWidth * 1000, this.boardHeight * 1000);
        // noinspection JSUnresolvedFunction
        sprite.pack(packArray, {inPlace: true});

        this.groupsOrdered = true;

        this.calculateArea(groups);

        let boardCount = (Math.floor((this.maxX + 1) / this.boardWidth)) * Math.ceil((this.maxY + 1) / this.boardHeight);
        this.logger.debug('All boards are in sum ' + this.maxX + ' x ' + this.maxY + ' big, which makes ' + boardCount + ' boards');

        this.boardStatistics = {};
        for (let i = 0; i <= boardCount; i++) {
            this.boardStatistics[i] = {
                count: 0,
                placed: 0
            };
        }
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].pieces.length > 1) {
                for (let j = 0; j < groups[i].pieces.length; j++) {
                    try {
                        let boardPosition = this.getBoardPosition(groups, groups[i].pieces[j]);
                        let boardIndex = this.getBoardIndexByPosition(boardPosition);
                        this.boardStatistics[boardIndex].count++;
                    } catch (e) {}
                }
            }
        }
        this.events.dispatch('boardStatistics', this.boardStatistics);
    }

    /**
     * @param groups
     */
    calculateArea(groups) {
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].pieces.length > 1) {
                this.logger.debug('Group ' + groups[i].groupIndex + ' goes to: ', groups[i].ownPosition);

                for (let j = 0; j < groups[i].pieces.length; j++) {
                    try {
                        let boardPosition = this.getBoardPosition(groups, groups[i].pieces[j]);
                        this.maxX = Math.max(this.maxX, boardPosition.x);
                        this.maxY = Math.max(this.maxY, boardPosition.y);
                    } catch (e) {}
                }
            }
        }
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

        await this.armClient.standby();
        this.logger.debug("standby");

        this.armFinished = true;
    }

    /**
     * @param {BoardPosition} boardPosition
     * @returns {number}
     */
    getBoardIndexByPosition(boardPosition) {
        let boardIndex = Math.floor(boardPosition.y / this.boardHeight) * Math.ceil((this.maxX + 1) / this.boardWidth) + Math.floor(boardPosition.x / this.boardWidth);
        this.logger.debug('Is on board ' + boardIndex + '(x: ' + boardPosition.x + ', y:' + boardPosition.y + ', boardWidth: ' + this.boardWidth + ', maxWidth: ' + this.maxX + ', boardHeight: ' + this.boardHeight + ', maxHeight: ' + this.maxY + ')');

        return boardIndex;
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

            let boardIndex = this.getBoardIndexByPosition(boardPosition);

            //Place on current board if it should go there
            if (boardIndex === this.selectedBoard) {
                this.boardStatistics[this.selectedBoard].placed++;
                this.events.dispatch('boardStatistics', this.boardStatistics);

                boardPosition.x -= (boardIndex % Math.ceil((this.maxX + 1) / this.boardWidth)) * this.boardWidth;
                boardPosition.y -= Math.floor(boardIndex / Math.ceil((this.maxX + 1) / this.boardWidth)) * this.boardHeight;

                await this.moveToBoard(piece, boardPosition);
            }

            //Place into box if it is a piece for a future board
            if (boardIndex > this.selectedBoard) {
                this.logger.info('Piece not in current board.');

                //By default, place it in the last box
                let boxIndex = this.brickPiMaster.boxCount - 1;

                //But if it is an upcoming piece (for the next free boxes) place it in the corresponding box (pieces for board 1 go to box 1, for board 4 go to box 4, for board 5 go to box 0...)
                if (boardIndex - this.selectedBoard < this.brickPiMaster.boxCount) {
                    boxIndex = boardIndex % (this.brickPiMaster.boxCount - 1);
                }

                this.logger.debug('Have to move it to box ' + boxIndex + ', because it is on board ' + boardIndex + ' and the current board is ' +  this.selectedBoard);

                await this.movePieceToBox(piece, boxIndex);
            }

            //Discard piece if it was for an old board
            if (boardIndex < this.selectedBoard) {
                this.logger.info('Got an old piece of board ' + boardIndex + ', which should have been already placed. Discarding...');
            }
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

        this.logger.notice('#' + plate.index + ' - Executing...');
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

    getSelectedBoard() {
        return this.selectedBoard;
    }

    async selectNextBoard() {
        this.selectedBoard++;

        this.events.dispatch('boardSelected', this.selectedBoard);

        let takeBox = this.selectedBoard % (this.brickPiMaster.boxCount - 1);
        if (takeBox === 0) {
            takeBox = this.brickPiMaster.boxCount - 1;
        }
        this.events.dispatch('switchBoardAndBox', takeBox);
        this.conveyor.stop();

        this.logger.info('Selected board: ' + this.selectedBoard + ' - waiting for user to replace board and box');

        await Promise.all([
            this.brickPiMaster.moveBoardToStandby(),
            this.brickPiMaster.moveSortBoxToStandby()
        ]);
    }

    continueAfterSwitch() {
        // noinspection JSIgnoredPromiseFromCall
        this.conveyor.start();
        this.logger.info('User replaced board and box. Continuing.');

        this.events.dispatch('continueAfterBoardSwitch');
    }

    getBoardStatistics() {
        return this.boardStatistics;
    }
}

module.exports = new Arm();