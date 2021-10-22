import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Jigsawlutioner from 'jigsawlutioner';

import Station from "./station.js";
import ControllerRequest from "../controllerRequest.js";

import Piece from "../models/Piece.js";
import Group from "../models/Group.js";

import projectManager from "../projectManager.js";

export default class Scanner extends Station {
    takePhotoApi;
    index = 0;
    threshold;
    reduction;
    pieces = [];
    piecesLoaded = false;
    isCompareReady = false;
    pieceDir = 'pieces/';
    imagesDir = 'images/';

    constructor(pi, rotation, cropLeft, cropRight, cropTop, cropBottom, threshold, reduction) {
        super('Scanner'.yellow);

        this.takePhotoApi = new ControllerRequest(pi, '/take-photo', {
            rotation: rotation,
            left: cropLeft,
            right: cropRight,
            top: cropTop,
            bottom: cropBottom,
            width: 1000
        }, {
            responseType: 'buffer'
        });

        this.threshold = threshold;
        this.reduction = reduction;

        process.on('jigsawlutioner.projectSelected', async () => {
            this.createNeededDirs();

            this.piecesLoaded = false;
            await this.loadPieces();
        });
    }

    /**
     *
     */
    createNeededDirs() {
        if (projectManager.getCurrentProjectName() === null) return;

        if (!fs.existsSync(projectManager.getCurrentProjectFolder() + this.pieceDir)) {
            fs.mkdirSync(projectManager.getCurrentProjectFolder() + this.pieceDir);
        }

        if (!fs.existsSync(projectManager.getCurrentProjectFolder() + this.imagesDir)) {
            fs.mkdirSync(projectManager.getCurrentProjectFolder() + this.imagesDir);
        }
    }

    /**
     * @return {Promise<void>}
     */
    async calculatePlacements(piecePlacementsData) {
        if (this.isCompareReady) {
            return;
        }

        this.logger.debug('placements', piecePlacementsData);
        this.groups = [];
        for (let groupIndex in piecePlacementsData) {
            if (!piecePlacementsData.hasOwnProperty(groupIndex)) continue;

            let group = new Group();
            group.groupIndex = parseInt(groupIndex, 10);

            for (let x in piecePlacementsData[groupIndex]) {
                if (!piecePlacementsData[groupIndex].hasOwnProperty(x)) continue;

                group.fromX = Math.min(parseInt(x, 10), group.fromX);
                group.toX = Math.max(parseInt(x, 10), group.toX);

                for (let y in piecePlacementsData[groupIndex][x]) {
                    if (!piecePlacementsData[groupIndex][x].hasOwnProperty(y)) continue;

                    group.fromY = Math.min(parseInt(y, 10), group.fromY);
                    group.toY = Math.max(parseInt(y, 10), group.toY);

                    for (let i = 0; i < this.pieces.length; i++) {
                        if (this.pieces[i].pieceIndex !== parseInt(piecePlacementsData[groupIndex][x][y]['pieceIndex'], 10)) continue;

                        this.pieces[i].absolutePosition.x = parseInt(x, 10);
                        this.pieces[i].absolutePosition.y = parseInt(y, 10);
                        this.pieces[i].absolutePosition.group = group;
                        this.pieces[i].absolutePosition.baseSide = piecePlacementsData[groupIndex][x][y]['rotation'];

                        group.pieces.push(this.pieces[i]);

                        this.logger.debug('Piece #' + this.pieces[i].pieceIndex + ' is in group ' + groupIndex + ' at ' + x + '/' + y + ' with baseSide = ' + this.pieces[i].absolutePosition.baseSide);

                        break;
                    }
                }
            }

            this.logger.debug('Group ' + groupIndex + ' limits are: ' + group.fromX + '/' + group.toX + '/' + group.fromY + '/' + group.toY);

            this.groups.push(group);
        }

        this.isCompareReady = true;
    }

    /**
     * @param {string} filename
     */
    loadPiece(filename) {
        let content = fs.readFileSync(projectManager.getCurrentProjectFolder() + this.pieceDir + filename, 'utf-8');

        const piece = Piece.createFromObject(JSON.parse(content));

        this.pieces.push(piece);

        this.index = Math.max(this.index, piece.pieceIndex + 1);
    }

    /**
     * @return {Promise<void>}
     */
    loadPieces() {
        return new Promise((resolve, reject) => {
            if (this.piecesLoaded) {
                resolve();
                return;
            }

            this.pieces = [];

            fs.readdir(projectManager.getCurrentProjectFolder() + this.pieceDir, (err, fileNames) => {
                if (err) {
                    reject(err);
                    return;
                }

                fileNames.forEach((filename) => {
                    this.loadPiece(filename);
                });
                process.emit('jigsawlutioner.piecesScannedChanged', this.pieces.length);

                this.piecesLoaded = true;

                resolve();
            });
        });
    }

    /**
     * @param {int} index
     * @param {string} ending
     * @param {string} suffix
     * @return {string}
     */
    getImageFilename(index, ending = 'jpg', suffix = '') {
        return projectManager.getCurrentProjectFolder() + this.imagesDir + 'piece' + index + suffix + '.' + ending;
    }

    /**
     * @param {int} index
     * @return {Promise<Buffer>}
     */
    async takeImage(index) {
        let filename = this.getImageFilename(index);

        const response = await this.takePhotoApi.call();
        const imageBuffer = response.body;

        this.setReady();

        return imageBuffer;
    }

    /**
     *
     * @param {int} index
     * @param {Buffer} imageBuffer
     * @return {Promise<object>}
     */
    async parseImage(index, imageBuffer) {
        let borderData = await Jigsawlutioner.BorderFinder.findPieceBorder(imageBuffer, {
            threshold: this.threshold,
            reduction: this.reduction,
            returnTransparentImage: true
        });
        // noinspection JSUnresolvedVariable
        let sideData = await Jigsawlutioner.SideFinder.findSides(index, borderData.path);

        let pieceData = Jigsawlutioner.PieceHelper.getLimitedPiece(borderData, sideData);

        if (typeof pieceData['errorMessage'] !== 'undefined') {
            throw new Error(pieceData['errorMessage']);
        }

        if (typeof pieceData.sides === 'undefined' || !(pieceData.sides instanceof Array) || pieceData.sides.length !== 4) {
            throw new Error('Sides not recognized');
        }

        return pieceData;
    }

    /**
     * @param {Plate} plate
     * @param {Error} error
     */
    handleError(plate, error) {
        if (error.toString() === 'Error: No areas found') {
            plate.setData('empty', true);
        } else {
            this.logger.error('#' + plate.index + ' - Error: ' + error, error.stack);
        }

        plate.setData('valid', false);
        plate.setData('error', error.toString());
        plate.setReady();

        this.setReady();
    }

    /**
     * @param {int} index
     * @param {object} pieceData
     * @return {Piece}
     */
    async createPiece(index, pieceData) {
        let piece = Piece.createFromObject(pieceData);
        piece.pieceIndex = index;

        piece.files.original = path.basename(this.getImageFilename(index));

        let transparentImageFilename = this.getImageFilename(index, 'png', '_transparent');
        let buffer = Buffer.from(piece.images.transparent.buffer, piece.images.transparent.encoding);
        await sharp(buffer).png().toFile(transparentImageFilename);
        piece.files.transparent = path.basename(transparentImageFilename);

        return piece;
    }

    /**
     * @return {Promise<Piece>}
     */
    async getPieceFromCamera() {
        let currentIndex = this.index++;

        let imageBuffer = await this.takeImage(currentIndex);
        let pieceData = await this.parseImage(currentIndex, imageBuffer);

        return this.createPiece(currentIndex, pieceData);
    }

    /**
     * @param {string} filename
     * @return {Promise<Piece>}
     */
    async getPieceFromFile(filename) {
        let currentIndex = this.index++;

        let imageBuffer = await sharp(filename).toBuffer();
        let pieceData = await this.parseImage(currentIndex, imageBuffer);

        return this.createPiece(currentIndex, pieceData);
    }

    /**
     * @param {Plate} plate
     * @param {Piece} piece
     * @return {Promise<void>}
     */
    async handleScanMode(plate, piece) {
        this.pieces.push(piece);
        process.emit('jigsawlutioner.piecesScannedChanged', this.pieces.length);

        fs.writeFileSync(projectManager.getCurrentProjectFolder() + this.pieceDir + piece.pieceIndex, JSON.stringify(piece));

        this.logger.info('#' + plate.index + ' - scan complete.');
        plate.setData('piece', piece);
        plate.setData('valid', true);
        plate.setReady();
    }

    /**
     * @param {Piece[]} pieces
     * @return {{pieceIndex: int, sides: Object[]}[]}
     */
    getApiPiecesList(pieces) {
        let apiPieces = [];
        for (let i = 0; i < pieces.length; i++) {
            apiPieces.push(this.getApiPiece(pieces[i]));
        }
        return apiPieces;
    }

    /**
     * @param {Piece} piece
     * @return {{pieceIndex: int, sides: Object[]}}
     */
    getApiPiece(piece) {
        return {
            pieceIndex: piece.pieceIndex,
            sides: piece.sides
        };
    }

    /**
     * @param {Plate} plate
     * @param {Piece} piece
     * @param {object} placements
     * @return {Promise<void>}
     */
    async handlePlaceMode(plate, piece, placements) {
        if (!placements) {
            throw new Error('Placements weren\'t calculated for this place yet.');
        }

        this.logger.debug('#' + plate.index + ' - before calculate placements');
        await this.calculatePlacements(placements);
        this.logger.debug('#' + plate.index + ' - after calculate placements');

        let foundPieceInfo = await Jigsawlutioner.Matcher.findExistingPieceIndex(this.getApiPiecesList(this.pieces), this.getApiPiece(piece));
        this.logger.debug('#' + plate.index + ' - after api call', foundPieceInfo);

        if (foundPieceInfo === null) {
            throw new Error('Couldn\'t match this piece with an existing piece.');
        }

        let existingPiece = null;
        for (let i = 0; i < this.pieces.length; i++) {
            if (parseInt(this.pieces[i].pieceIndex, 10) === parseInt(foundPieceInfo['pieceIndex'], 10)) {
                existingPiece = this.pieces[i];
                break;
            }
        }

        if (existingPiece === null) {
            throw new Error('Matched piece not found in existing pieces. Straaaange...');
        }

        existingPiece.sides = piece.sides;
        existingPiece.boundingBox = piece.boundingBox;


        plate.setData('valid', true);
        plate.setData('piece', existingPiece);
        plate.setData('sideOffset', foundPieceInfo['sideOffset']);
        plate.setData('groups', this.groups);
        plate.setReady();
    }

    /**
     * @param {Plate} plate
     * @return {Promise<void>}
     */
    async execute(plate) {
        if (!this.piecesLoaded) {
            await this.loadPieces();
        }

        this.logger.notice('#' + plate.index + ' - Executing...');
        let data = await plate.getData();
        plate.setNotReady();

        try {
            let piece = await this.getPieceFromCamera();
            process.emit('jigsawlutioner.pieceScanned', piece);

            if (this.isScanMode()) {
                await this.handleScanMode(plate, piece);
            } else if (this.isPlaceMode()) {
                await this.handlePlaceMode(plate, piece, data['placements']);
            } else {
                this.logger.error('Unknown mode.');
                this.setReady();
            }
        } catch (err) {
            this.handleError(plate, err);
        }
    }
}
