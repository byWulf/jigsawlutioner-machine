const port = process.env.PORT || 1100;

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rpio = require('rpio');
const path = require("path");
const sharp = require('sharp');
const spawn = require('child_process').spawn;
const rp = require('request-promise');

app.use(express.static('client'));
app.use('/images', express.static('images'));

app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/fontawesome', express.static('node_modules/font-awesome'));
app.use('/tether', express.static('node_modules/tether/dist'));
app.use('/popper', express.static('node_modules/popper.js/dist/umd'));

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

let cameraProcess = spawn('raspistill', [
    '-t', '0',
    '-s',
    '-ss', '25000',
    '-ex', 'night',
    '-th', 'none',
    '-sh', '100',
    '-co', '0',
    '-br', '50',
    '-sa', '50',
    '-ISO', '0',
    '-awb', 'fluorescent',
    '-mm', 'backlit',
    '-drc', 'high',
    '-st',
    '-q', '50',
    '-n',
    '-e', 'jpg',
    '-o', '-'
]);
let currentCameraResolver = null;
function takeImage() {
    return new Promise((resolve) => {
        currentCameraResolver = resolve;
        console.log("Requesting image.. sending SIGUSR1");
        cameraProcess.kill('SIGUSR1');
    });
}

let currentImageBuffer = null;
cameraProcess.stdout.on('data', (data) => {
    if (currentImageBuffer === null) {
        currentImageBuffer = data;
    } else {
        currentImageBuffer = Buffer.concat([currentImageBuffer, data]);
    }

    let eoi;
    while ((eoi = currentImageBuffer.indexOf(Buffer.from([0xff, 0xd9]))) > -1) {
        let imageBuffer = currentImageBuffer.slice(0, eoi + 2);
        currentImageBuffer = currentImageBuffer.slice(eoi + 2);

        currentCameraResolver(imageBuffer);
    }
});
cameraProcess.stderr.on('data', (data) => {
    console.log(data.toString());
});
cameraProcess.on('close', () => {
    throw new Error('Camera closed.');
});

http.listen(port, () => {
    console.log('Server started on port ' + port);
});

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

function callApi(resource, postData) {
    return rp({
        method: 'POST',
        uri: 'https://ojaqssmxoi.execute-api.eu-central-1.amazonaws.com/prod/jigsawlutioner/' + resource,
        headers: {
            'x-api-key': 'M6ATl0UUuL1MXc5E4ERYn5iwswNcxF7y8zOMR5Bg'
        },
        body: postData,
        json: true
    });
}

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

                callApi('getplacements', {pieces: getValidPieces()}).then((placements) => {
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
        takeImage().then((buffer) => {
            console.log("Took picture (" + path.basename(filename) + "). Starting border recognition");
            startConveyor();
            conveyorReady = false;
            return sharp(buffer).extract({left: 923, top: 997, width: 1066, height: 1168}).resize(913, 1000).toBuffer();
        }).then((data) => {
            sharp(data).toFile(filename);

            return callApi('parseimage', {
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
                callApi('findexistingpieceindex', {
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