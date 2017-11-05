const io = require('./src/frontend');

const rpio = require('rpio');
const path = require("path");
const sharp = require('sharp');


let settings = {
    ss: '21000',
    ex: 'night',
    sh: '100',
    co: '0',
    br: '50',
    sa: '50',
    ISO: '0',
    awb: 'fluorescent',
    mm: 'backlit',
    drc: 'high',
    q: '50',
    cropLeft: '33',
    cropRight: '74',
    cropTop: '23',
    cropBottom: '83',
    parseThresh: '245',
    parseReduction: '2'
};


rpio.init({
    mapping: 'gpio'
});

let pins = {
    conveyor: 20,
    conveyorEnable: 26,
    sensor: 16
};

rpio.open(pins.conveyor, rpio.OUTPUT, rpio.LOW);
rpio.open(pins.conveyorEnable, rpio.OUTPUT, rpio.HIGH);
rpio.open(pins.sensor, rpio.INPUT, rpio.PULL_DOWN);

let state = null;
let mode = 'scan';
let lastStart = Date.now();
let conveyorRunning = false;
let stopAction = null;
let waitIns = [];
function startConveyor() {
    if (!state) return;

    rpio.write(pins.conveyor, rpio.HIGH);
    conveyorRunning = true;
    lastStart = Date.now();
}

rpio.poll(pins.sensor, () => {
    if (conveyorRunning && (lastStart  === null || lastStart + 500 < Date.now())) {
        rpio.write(pins.conveyor, rpio.LOW);
        conveyorRunning = false;

        stopAction();
    }
});

process.stdin.resume();
function exitHandler(err) {
    rpio.close(pins.conveyor);
    rpio.close(pins.conveyorEnable);
    rpio.close(pins.sensor);

    if (err) console.log(err.stack);
    process.exit();
}
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);

function setState(newState) {
    state = newState;
    io.sockets.emit('machineState', state);
}

const camera = require('./src/camera');


let pieces = [];
let piecePlacements = null;
let index = 0;

function getValidPieces() {
    let comparePieces = [];
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i].valid) {
            comparePieces.push({
                pieceIndex: pieces[i].pieceIndex,
                sides: pieces[i].sides
            });
        }
    }
    return comparePieces;
}

const api = require('./src/api');

io.on('connection', (socket) => {
    console.log('user connected');

    let conveyorReady = false;
    let parsingReady = true;
    let compareReady = false;
    let currentWaitIn = null;

    socket.emit('mode', mode);
    socket.emit('machineState', state);
    if (currentWaitIn) {
        socket.emit('waitIn', currentWaitIn.task, currentWaitIn.placements ? piecePlacements[currentWaitIn.placements.groupIndex] : null);
    } else {
        socket.emit('waitIn', null);
    }

    socket.on('mode', (newMode) => {
        if (['scan', 'compare'].indexOf(newMode) > -1 && newMode !== mode) {
            mode = newMode;
            io.sockets.emit('mode', mode);

            if (mode === 'compare') {
                compareReady = false;

                api.call('getplacements', {pieces: getValidPieces()}).then((placements) => {
                    for (let groupIndex in placements) {
                        if (!placements.hasOwnProperty(groupIndex)) continue;

                        for (let x in placements[groupIndex]) {
                            if (!placements[groupIndex].hasOwnProperty(x)) continue;

                            for (let y in placements[groupIndex][x]) {
                                if (!placements[groupIndex][x].hasOwnProperty(y)) continue;

                                placements[groupIndex][x][y] = {
                                    pieceIndex: placements[groupIndex][x][y].pieceIndex,
                                    current: false,
                                    found: false
                                };
                            }
                        }
                    }
                    piecePlacements = placements;
                    console.log("placements", placements);
                    compareReady = true;
                });
            }
        }
    });

    function hideWaitIn() {
        currentWaitIn = null;
        io.sockets.emit('waitIn', null);
    }

    function doNextImage() {
        if (!conveyorReady || !parsingReady) return;

        for (let i = waitIns.length - 1; i >= 0; i--) {
            waitIns[i].count--;
            if (waitIns[i].count === 0) {
                if (waitIns[i].placements) {
                    for (let groupIndex in piecePlacements) {
                        if (!piecePlacements.hasOwnProperty(groupIndex)) continue;

                        for (let x in piecePlacements[groupIndex]) {
                            if (!piecePlacements[groupIndex].hasOwnProperty(x)) continue;

                            for (let y in piecePlacements[groupIndex][x]) {
                                if (!piecePlacements[groupIndex][x].hasOwnProperty(y)) continue;

                                if (piecePlacements[groupIndex][x][y].current) {
                                    piecePlacements[groupIndex][x][y].current = false;
                                }
                            }
                        }
                    }

                    piecePlacements[waitIns[i].placements.groupIndex][waitIns[i].placements.x][waitIns[i].placements.y].current = true;
                    piecePlacements[waitIns[i].placements.groupIndex][waitIns[i].placements.x][waitIns[i].placements.y].found = true;
                }
                io.sockets.emit('waitIn', waitIns[i].task, waitIns[i].placements ? piecePlacements[waitIns[i].placements.groupIndex] : null);
                currentWaitIn = waitIns[i];
                waitIns.splice(i,1);
                setState(null);
            }
        }


        let currentIndex = index++;
        let filename = __dirname + '/images/piece' + currentIndex + '.jpg';
        camera.takeImage().then((buffer) => {
            console.log("Took picture (" + path.basename(filename) + "). Starting border recognition");
            startConveyor();
            conveyorReady = false;

            let left = Math.floor(settings.cropLeft / 100 * 3280);
            let top = Math.floor(settings.cropTop / 100 * 2464);
            let width = Math.floor((settings.cropRight - settings.cropLeft) / 100 * 3280);
            let height = Math.floor((settings.cropBottom - settings.cropTop) / 100 * 2464);

            return sharp(buffer).extract({left: 33/100*3280, top: 997, width: 1066, height: 1168}).resize(913, 1000).toBuffer();
        }).then((data) => {
            sharp(data).toFile(filename);

            return api.call('parseimage', {
                imageData: data.toString('base64'),
                pieceIndex: currentIndex,
                reduction: 2
            });
        }).then((piece) => {
            if (typeof piece.errorMessage !== 'undefined') {
                if (piece.errorMessage === 'No areas found') {
                    parsingReady = true;
                    doNextImage();

                    return;
                }

                waitIns.push({
                    count: 2,
                    task: piece.errorMessage + ' Please rescan piece.'
                });

                piece.valid = false;
            } else {
                piece.valid = true;
            }

            if (mode === 'scan') {
                piece.pieceIndex = currentIndex;
                piece.files = {
                    original: path.basename(filename)
                };
                pieces.push(piece);
                io.sockets.emit('newPiece', {pieceIndex: piece.pieceIndex, valid: piece.valid, filename: path.basename(filename)});
            } else if (mode === 'compare' && compareReady && piece.valid) {
                api.call('findexistingpieceindex', {
                    pieces: getValidPieces(),
                    piece: piece
                }).then((foundPieceIndex) => {
                    if (foundPieceIndex === null) {
                        waitIns.push({
                            count: 2,
                            task: 'Couldn\'t match this piece with an existing piece. Please rescan it.'
                        });
                    } else {
                        let found = false;
                        outerPlacementLoop: for (let groupIndex in piecePlacements) {
                            if (!piecePlacements.hasOwnProperty(groupIndex)) continue;

                            for (let x in piecePlacements[groupIndex]) {
                                if (!piecePlacements[groupIndex].hasOwnProperty(x)) continue;

                                for (let y in piecePlacements[groupIndex][x]) {
                                    if (!piecePlacements[groupIndex][x].hasOwnProperty(y)) continue;

                                    if (piecePlacements[groupIndex][x][y].pieceIndex !== foundPieceIndex) continue;

                                    found = true;
                                    waitIns.push({
                                        count: 2,
                                        task: 'Put this piece to group ' + (parseInt(groupIndex, 10) + 1) + ' on position ' + x + '/' + y,
                                        placements: {
                                            groupIndex: groupIndex,
                                            x: x,
                                            y: y
                                        }
                                    });

                                    break outerPlacementLoop;
                                }
                            }
                        }

                        if (!found) {
                            waitIns.push({
                                count: 2,
                                task: 'Something unexpected happened.. couldn\'t find the matching piece in the placement list :('
                            });
                        }
                    }
                });
            }

            parsingReady = true;
            doNextImage();
        }).catch((err) => {
            console.log(err);

            waitIns.push({
                count: 2,
                task: err.toString() + ' Please rescan piece.'
            });

            parsingReady = true;
            doNextImage();
        });
    }

    socket.on('startMachine', () => {
        if (!state) {
            stopAction = () => {
                conveyorReady = true;
                doNextImage();
            };
            setState('running');
            hideWaitIn();
            startConveyor();
        }
    });

    socket.on('stopMachine', () => {
        if (state) {
            setState(null);
        }
    });
});