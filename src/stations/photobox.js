const Station = require('./station');
const camera = require('../camera');
const sharp = require('sharp');
const api = require('../api');
const mode = require('../mode');
const path = require("path");
const colors = require('colors');
const logger = require('../logger').getInstance('Station'.cyan + ' Photobox'.yellow);
const fs = require('fs');

class Photobox extends Station {
    constructor() {
        super();
        this.index = 0;

        this.settings = {
            cropLeft: '33',
            cropRight: '74',
            cropTop: '23',
            cropBottom: '83',
            parseThresh: '245',
            parseReduction: '2'
        };

        this.pieces = [];
        this.isCompareReady = false;
        this.isCompareRunning = false;
        this.piecesLoaded = false;
        this.pieceDir = __dirname + '/../../pieces/';
    }

    getValidPieces() {
        let comparePieces = [];
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].valid) {
                comparePieces.push({
                    pieceIndex: this.pieces[i].pieceIndex,
                    sides: this.pieces[i].sides
                });
            }
        }
        return comparePieces;
    }

    async cropImageBuffer(buffer) {
        let left = Math.floor(this.settings.cropLeft / 100 * 3280);
        let top = Math.floor(this.settings.cropTop / 100 * 2464);
        let width = Math.floor((this.settings.cropRight - this.settings.cropLeft) / 100 * 3280);
        let height = Math.floor((this.settings.cropBottom - this.settings.cropTop) / 100 * 2464);

        return await sharp(buffer).extract({
            left: left,
            top: top,
            width: width,
            height: height
        }).resize(Math.floor((width / height) * 1000), 1000).toBuffer();
    }

    compareReady() {
        return new Promise(async (resolve) => {
            if (this.isCompareReady) {
                resolve();
            } else if (this.isCompareRunning) {
                let interval = setInterval(() => {
                    if (this.isCompareReady) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            } else {
                this.isCompareRunning = true;

                this.piecePlacements = await api.call('getplacements', {pieces: this.getValidPieces()});
                for (let group in this.piecePlacements) {
                    if (!this.piecePlacements.hasOwnProperty(group)) continue;

                    for (let x in this.piecePlacements[group]) {
                        if (!this.piecePlacements[group].hasOwnProperty(x)) continue;

                        for (let y in this.piecePlacements[group][x]) {
                            if (!this.piecePlacements[group][x].hasOwnProperty(y)) continue;

                            logger.debug(group, x, y, this.piecePlacements[group][x][y]);
                        }
                    }
                }

                this.isCompareReady = true;
                resolve();
            }
        });
    }

    findPiecePosition(pieceIndex) {
        for (let groupIndex in this.piecePlacements) {
            if (!this.piecePlacements.hasOwnProperty(groupIndex)) continue;

            for (let x in this.piecePlacements[groupIndex]) {
                if (!this.piecePlacements[groupIndex].hasOwnProperty(x)) continue;

                for (let y in this.piecePlacements[groupIndex][x]) {
                    if (!this.piecePlacements[groupIndex][x].hasOwnProperty(y)) continue;

                    if (this.piecePlacements[groupIndex][x][y].pieceIndex !== pieceIndex) continue;

                    return {
                        groupIndex: parseInt(groupIndex, 10),
                        x: parseInt(x, 10),
                        y: parseInt(y, 10),
                        rotation: this.piecePlacements[groupIndex][x][y].rotation
                    };
                }
            }
        }

        return null;
    }

    loadPieces() {
        if (this.piecesLoaded) return;

        return new Promise((resolve, reject) => {
            fs.readdir(this.pieceDir, (err, filenames) => {
                if (err) {
                    reject(err);
                    return;
                }

                filenames.forEach((filename) => {
                    let content = fs.readFileSync(this.pieceDir + filename, 'utf-8');
                    let piece = JSON.parse(content);
                    this.pieces.push(piece);

                    this.index = Math.max(this.index, piece.pieceIndex + 1);
                });

                this.piecesLoaded = true;

                resolve();
            });
        });
    }

    async execute(plate) {
        if (!this.piecesLoaded) {
            await this.loadPieces();
        }

        logger.notice('Executing...');
        plate.setNotReady();

        try {
            let currentIndex = this.index++;
            let filename = __dirname + '/../../images/piece' + currentIndex + '.jpg';

            let imageBuffer = await camera.takeImage();
            this.setReady();

            imageBuffer = await this.cropImageBuffer(imageBuffer);
            await sharp(imageBuffer).toFile(filename);

            let piece = await api.call('parseimage', {
                imageData: imageBuffer.toString('base64'),
                pieceIndex: currentIndex,
                threshold: parseInt(this.settings.parseThresh, 10),
                reduction: parseInt(this.settings.parseReduction, 10)
            });

            if (typeof piece.errorMessage !== 'undefined') {
                if (piece.errorMessage === 'No areas found') {
                    logger.debug('Empty');
                    plate.setData('valid', false);
                    plate.setData('empty', true);
                    plate.setData('error', 'empty');
                    plate.setReady();

                    return;
                }

                logger.error('Error: ' + piece.errorMessage);
                plate.setData('valid', false);
                plate.setData('error', piece.errorMessage);
                plate.setReady();

                return;
            }

            if (mode.getMode() === 'scan') {
                piece.valid = true;
                piece.pieceIndex = currentIndex;
                piece.files = {
                    original: path.basename(filename)
                };
                this.pieces.push(piece);

                fs.writeFile(this.pieceDir + currentIndex, JSON.stringify(piece));

                logger.info('scan complete.');
                plate.setData('piece', piece);
                plate.setData('valid', true);
                plate.setReady();

                return;
            }

            if (mode.getMode() === 'compare') {
                await this.compareReady();

                let foundPieceInfo = await api.call('findexistingpieceindex', {
                    pieces: this.getValidPieces(),
                    piece: piece
                });

                if (foundPieceInfo === null) {
                    logger.error('compare error: ' + 'Couldn\'t match this piece with an existing piece.');
                    plate.setData('valid', false);
                    plate.setData('error', 'Couldn\'t match this piece with an existing piece.');
                    plate.setReady();

                    return;
                }

                let position = this.findPiecePosition(foundPieceInfo.pieceIndex);

                if (position === null) {
                    logger.error('compare error: ' + 'Something unexpected happened.. couldn\'t find the matching piece in the placement list :(');
                    plate.setData('valid', false);
                    plate.setData('error', 'Something unexpected happened.. couldn\'t find the matching piece in the placement list :(');
                    plate.setReady();

                    return;
                }

                logger.info('compare complete.', position);
                plate.setData('valid', true);
                plate.setData('piece', piece);
                plate.setData('position', position);
                plate.setData('sideOffset', foundPieceInfo.sideOffset);
                plate.setData('piecePlacements', this.piecePlacements);
                plate.setReady();
            }
        } catch (err) {
            logger.error('execution error: ', err, err.stack);
            plate.setData('valid', false);
            plate.setData('error', err.toString());
            plate.setReady();
        }
    }
}

module.exports = new Photobox();