require('colors');

const Station = require('./station');

class Photobox extends Station {
    constructor() {
        super();

        this.logger = require('../logger').getInstance('Station'.cyan + ' Photobox'.yellow);
        this.camera = require('../camera');
        this.sharp = require('sharp');
        this.api = require('../api');
        this.modeService = require('../modeService');
        this.projectManager = require('../projectManager');
        this.events = require('../events');
        this.fs = require('fs');

        this.index = 0;

        this.settings = {
            originalImageWidth: 3280,
            originalImageHeight: 2464,
            targetSize: 1000,
            cropLeft: '31',
            cropRight: '76',
            cropTop: '27',
            cropBottom: '83',
            parseThresh: '245',
            parseReduction: '2'
        };

        this.pieces = [];
        this.isCompareReady = false;
        this.isCompareRunning = false;
        this.piecesLoaded = false;
        this.pieceDir = 'pieces/';
        this.imagesDir = 'images/';

        this.events.listen('projectSelected', async () => {
            this.createNeededDirs();

            this.piecesLoaded = false;
            await this.loadPieces();
        });

        this.createNeededDirs();

        this.loadPieces();
    }

    /**
     *
     */
    createNeededDirs() {
        if (this.projectManager.getCurrentProjectName() === null) return;

        const fs = require('fs');
        if (!fs.existsSync(this.projectManager.getCurrentProjectFolder() + this.pieceDir)) {
            fs.mkdirSync(this.projectManager.getCurrentProjectFolder() + this.pieceDir);
        }

        if (!fs.existsSync(this.projectManager.getCurrentProjectFolder() + this.imagesDir)) {
            fs.mkdirSync(this.projectManager.getCurrentProjectFolder() + this.imagesDir);
        }
    }

    /**
     * @param {Buffer} buffer
     * @return {Promise<Buffer>}
     */
    async cropImageBuffer(buffer) {
        let left = Math.floor(this.settings.cropLeft / 100 * this.settings.originalImageWidth);
        let top = Math.floor(this.settings.cropTop / 100 * this.settings.originalImageHeight);
        let width = Math.floor((this.settings.cropRight - this.settings.cropLeft) / 100 * this.settings.originalImageWidth);
        let height = Math.floor((this.settings.cropBottom - this.settings.cropTop) / 100 * this.settings.originalImageHeight);

        // noinspection JSUnresolvedFunction
        return await this.sharp(buffer).extract({
            left: left,
            top: top,
            width: width,
            height: height
        }).resize(Math.floor((width / height) * this.settings.targetSize), this.settings.targetSize).toBuffer();
    }

    /**
     * @return {Promise<void>}
     */
    waitForCompareReady() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.isCompareReady) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    invalidatePlacementsFile() {
        if (this.fs.existsSync(this.projectManager.getCurrentProjectFolder() + 'placements')) {
            this.fs.unlinkSync(this.projectManager.getCurrentProjectFolder() + 'placements')
        }
    }

    async getPlacementsData() {
        if (this.fs.existsSync(this.projectManager.getCurrentProjectFolder() + 'placements')) {
            return JSON.parse(this.fs.readFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', 'utf-8'));
        }

        let placements = await this.api.call('getplacements', {pieces: this.getApiPiecesList(this.pieces)});
        this.fs.writeFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', JSON.stringify(placements));

        return placements;
    }

    /**
     * @return {Promise<void>}
     */
    async calculatePlacements() {
        if (this.isCompareReady) {
            return;
        }

        if (this.isCompareRunning) {
            await this.waitForCompareReady();
            return;
        }

        this.isCompareRunning = true;

        let piecePlacementsData = await this.getPlacementsData();

        const Group = require('../models/Group');
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
        const fs = require('fs');
        let content = fs.readFileSync(this.projectManager.getCurrentProjectFolder() + this.pieceDir + filename, 'utf-8');

        const Piece = require('../models/Piece');
        let piece = new Piece();
        piece.fillFromObject(JSON.parse(content));

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

            const fs = require('fs');
            fs.readdir(this.projectManager.getCurrentProjectFolder() + this.pieceDir, (err, fileNames) => {
                if (err) {
                    reject(err);
                    return;
                }

                fileNames.forEach((filename) => {
                    this.loadPiece(filename);
                });
                this.events.dispatch('piecesScannedChanged', this.pieces.length);

                this.piecesLoaded = true;

                resolve();
            });
        });
    }

    /**
     * @param {int} index
     * @return {string}
     */
    getImageFilename(index) {
        return this.projectManager.getCurrentProjectFolder() + this.imagesDir + 'piece' + index + '.jpg';
    }

    /**
     * @param {int} index
     * @return {Promise<Buffer>}
     */
    async takeImage(index) {
        let filename = this.getImageFilename(index);

        let imageBuffer = await this.camera.takeImage();
        this.setReady();

        imageBuffer = await this.cropImageBuffer(imageBuffer);
        // noinspection JSUnresolvedFunction
        await this.sharp(imageBuffer).toFile(filename);

        return imageBuffer;
    }

    /**
     *
     * @param {int} index
     * @param {Buffer} imageBuffer
     * @return {Promise<object>}
     */
    async parseImage(index, imageBuffer) {
        let pieceData = await this.api.call('parseimage', {
            imageData: imageBuffer.toString('base64'),
            pieceIndex: index,
            threshold: parseInt(this.settings.parseThresh, 10),
            reduction: parseInt(this.settings.parseReduction, 10)
        });

        if (typeof pieceData['errorMessage'] !== 'undefined') {
            throw new Error(pieceData['errorMessage']);
        }

        if (typeof pieceData.sides === 'undefined' || !(pieceData.side instanceof Array) || pieceData.side.length !== 4) {
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
            this.logger.error('Error: ' + error);
        }

        plate.setData('valid', false);
        plate.setData('error', error.toString());
        plate.setReady();
    }

    /**
     * @param {int} index
     * @param {object} pieceData
     * @return {Piece}
     */
    createPiece(index, pieceData) {
        const Piece = require('../models/Piece');
        let piece = new Piece();
        piece.fillFromObject(pieceData);
        piece.pieceIndex = index;

        const path = require("path");
        piece.files.original = path.basename(this.getImageFilename(index));

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

        // noinspection JSUnresolvedFunction
        let imageBuffer = await this.sharp(filename).toBuffer();
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
        this.events.dispatch('piecesScannedChanged', this.pieces.length);

        const fs = require('fs');
        fs.writeFileSync(this.projectManager.getCurrentProjectFolder() + this.pieceDir + piece.pieceIndex, JSON.stringify(piece));

        this.invalidatePlacementsFile();

        this.logger.info('scan complete.');
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
     * @return {Promise<void>}
     */
    async handlePlaceMode(plate, piece) {
        this.logger.debug('before calculate placements');
        await this.calculatePlacements();
        this.logger.debug('after calculate placements');

        let foundPieceInfo = await this.api.call('findexistingpieceindex', {
            pieces: this.getApiPiecesList(this.pieces),
            piece: this.getApiPiece(piece)
        });
        this.logger.debug('after api call', foundPieceInfo);

        if (foundPieceInfo === null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Couldn\'t match this piece with an existing piece.');
        }

        let existingPiece = null;
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].pieceIndex === parseInt(foundPieceInfo['pieceIndex'], 10)) {
                existingPiece = this.pieces[i];
                break;
            }
        }
        existingPiece.sides = piece.sides;
        existingPiece.boundingBox = piece.boundingBox;
        this.logger.debug('after existing piece');

        if (foundPieceInfo === null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Matched piece not found in existing pieces. Straaaange...');
        }

        this.logger.info('compare complete');
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

        this.logger.notice('Executing...');
        plate.setNotReady();

        try {
            let piece = await this.getPieceFromCamera();

            if (this.modeService.getMode() === this.modeService.MODE_SCAN) {
                await this.handleScanMode(plate, piece);
            } else if (this.modeService.getMode() === this.modeService.MODE_PLACE) {
                await this.handlePlaceMode(plate, piece);
            }
        } catch (err) {
            this.handleError(plate, err);
        }
    }
}

module.exports = new Photobox();