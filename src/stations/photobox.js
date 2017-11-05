const Station = require('./station');
const camera = require('../camera');
const sharp = require('sharp');
const api = require('../api');
const mode = require('../mode');
const path = require("path");

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
                }, 10);
            } else {
                this.isCompareRunning = true;

                this.piecePlacements = await api.call('getplacements', {pieces: getValidPieces()});

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
                        groupIndex: groupIndex,
                        x: x,
                        y: y
                    };
                }
            }
        }

        return null;
    }

    async execute(plate) {
        console.log('Photobox: start execute');
        plate.setNotReady();

        try {
            let currentIndex = this.index++;
            let filename = __dirname + '/../../images/piece' + currentIndex + '.jpg';

            let imageBuffer = await camera.takeImage();
            //this.setReady();

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
                    console.log('Photobox: empty.');
                    plate.setData('valid', false);
                    plate.setData('empty', true);
                    plate.setData('error', 'empty');
                    setTimeout(() => {
                        this.setReady();
                        plate.setReady();
                    }, 5000);

                    return;
                }

                console.log('Photobox: error: ' + piece.errorMessage);
                plate.setData('valid', false);
                plate.setData('error', piece.errorMessage);
                setTimeout(() => {
                    this.setReady();
                    plate.setReady();
                }, 5000);

                return;
            }

            if (mode.getMode() === 'scan') {
                piece.valid = true;
                piece.pieceIndex = currentIndex;
                piece.files = {
                    original: path.basename(filename)
                };
                this.pieces.push(piece);

                console.log('Photobox: scan complete.');
                plate.setData('piece', piece);
                plate.setData('valid', true);
                setTimeout(() => {
                    this.setReady();
                    plate.setReady();
                }, 5000);

                return;
            }

            if (mode.getMode() === 'compare') {
                await this.compareReady();

                let foundPieceIndex = await api.call('findexistingpieceindex', {
                    pieces: this.getValidPieces(),
                    piece: piece
                });

                if (foundPieceIndex === null) {
                    console.log('Photobox: compare error: ' + 'Couldn\'t match this piece with an existing piece.');
                    plate.setData('valid', false);
                    plate.setData('error', 'Couldn\'t match this piece with an existing piece.');
                    setTimeout(() => {
                        this.setReady();
                        plate.setReady();
                    }, 5000);

                    return;
                }

                let position = this.findPiecePosition(foundPieceIndex);

                if (position === null) {
                    console.log('Photobox: compare error: ' + 'Something unexpected happened.. couldn\'t find the matching piece in the placement list :(');
                    plate.setData('valid', false);
                    plate.setData('error', 'Something unexpected happened.. couldn\'t find the matching piece in the placement list :(');
                    setTimeout(() => {
                        this.setReady();
                        plate.setReady();
                    }, 5000);

                    return;
                }

                console.log('Photobox: compare complete.', position);
                plate.setData('valid', true);
                plate.setData('position', position);
                setTimeout(() => {
                    this.setReady();
                    plate.setReady();
                }, 5000);
            }
        } catch (err) {
            console.log('Photobox: execution error: ', err, err.stack);
            plate.setData('valid', false);
            plate.setData('error', err.toString());
            setTimeout(() => {
                this.setReady();
                plate.setReady();
            }, 5000);
        }
    }
}

module.exports = new Photobox();