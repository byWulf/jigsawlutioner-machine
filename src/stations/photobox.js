require('colors');

const Station = require('./station');

class Photobox extends Station {
    constructor() {
        super();

        this.logger = require('../logger').getInstance('Station'.cyan + ' Photobox'.yellow);
        this.logger.setLevel(this.logger.LEVEL_DEBUG);
        this.camera = require('../camera');
        this.sharp = require('sharp');
        this.api = require('../api');
        this.modeService = require('../modeService');
        this.projectManager = require('../projectManager');
        this.events = require('../events');

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
        this.piecesLoaded = false;
        this.isCompareReady = false;
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
    async calculatePlacements(piecePlacementsData) {
        if (this.isCompareReady) {
            return;
        }

        const Group = require('../models/Group');
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
     * @param {string} ending
     * @param {string} suffix
     * @return {string}
     */
    getImageFilename(index, ending, suffix) {
        return this.projectManager.getCurrentProjectFolder() +
            this.imagesDir +
            'piece' + index + (typeof suffix !== 'undefined' ? suffix : '') +
            '.' + (typeof ending !== 'undefined' ? ending : 'jpg');
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
            reduction: parseInt(this.settings.parseReduction, 10),
            returnTransparentImage: true
        });

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
    }

    /**
     * @param {int} index
     * @param {object} pieceData
     * @return {Piece}
     */
    async createPiece(index, pieceData) {
        const Piece = require('../models/Piece');
        let piece = new Piece();
        piece.fillFromObject(pieceData);
        piece.pieceIndex = index;

        const path = require("path");
        piece.files.original = path.basename(this.getImageFilename(index));

        let transparentImageFilename = this.getImageFilename(index, 'png', '_transparent');
        let buffer = Buffer.from(piece.images.transparent.buffer, piece.images.transparent.encoding);
        await this.sharp(buffer).png().toFile(transparentImageFilename);
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

        return await this.createPiece(currentIndex, pieceData);
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

        return await this.createPiece(currentIndex, pieceData);
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

        let foundPieceInfo = await this.api.call('findexistingpieceindex', {
            pieces: this.getApiPiecesList(this.pieces),
            piece: this.getApiPiece(piece)
        });
        this.logger.debug('#' + plate.index + ' - after api call', foundPieceInfo);

        if (foundPieceInfo === null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Couldn\'t match this piece with an existing piece.');
        }

        let existingPiece = null;
        for (let i = 0; i < this.pieces.length; i++) {
            if (parseInt(this.pieces[i].pieceIndex, 10) === parseInt(foundPieceInfo['pieceIndex'], 10)) {
                existingPiece = this.pieces[i];
                break;
            }
        }
        existingPiece.sides = piece.sides;
        existingPiece.boundingBox = piece.boundingBox;

        if (foundPieceInfo === null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Matched piece not found in existing pieces. Straaaange...');
        }

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
            this.events.dispatch('pieceScanned', piece);

            if (this.modeService.getMode() === this.modeService.MODE_SCAN) {
                await this.handleScanMode(plate, piece);
            } else if (this.modeService.getMode() === this.modeService.MODE_PLACE) {
                await this.handlePlaceMode(plate, piece, data['placements']);
            }
        } catch (err) {
            this.handleError(plate, err);
        }
    }
}

module.exports = new Photobox();