const port = process.env.PORT || 1100;

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rpio = require('rpio');
const path = require("path");
const sharp = require('sharp');
const spawn = require('child_process').spawn;
const fs = require('fs');

const Jigsawlutioner = require('jigsawlutioner');
const rp = require('request-promise');

app.use(express.static('client'));
app.use('/images', express.static('images'));

app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/fontawesome', express.static('node_modules/font-awesome'));
app.use('/tether', express.static('node_modules/tether/dist'));
app.use('/paper', express.static('node_modules/paper/dist'));
app.use('/popper', express.static('node_modules/popper.js/dist/umd'));
app.use('/animate.css', express.static('node_modules/animate.css'));
app.use('/bootstrap-notify', express.static('node_modules/bootstrap-notify'));


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

let cameraImageFilename = __dirname + '/images/camera.jpg';
let settings = [
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
];
let cameraProcess = spawn('raspistill', settings);
let currentCameraResolver = null;
function takeImage() {
    return new Promise((resolve, reject) => {
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

    while ((eoi = currentImageBuffer.indexOf(Buffer.from([0xff, 0xd9]))) > -1) {
        let imageBuffer = currentImageBuffer.slice(0, eoi + 2);
        currentImageBuffer = currentImageBuffer.slice(eoi + 2);

        currentCameraResolver(imageBuffer);
    }
});
cameraProcess.stderr.on('data', (data) => {
    console.log(data.toString());
});
cameraProcess.on('close', (data) => {
    throw new Error('Camera closed.');
});

http.listen(port, () => {
    console.log('Server started on port ' + port);
});

let pieces = [];
let index = 0;
io.on('connection', (socket) => {
    console.log('user connected');

    let pieceIndices = [];
    for (let i = 0; i < pieces.length; i++) {
        pieceIndices.push({
            pieceIndex: pieces[i].pieceIndex,
            valid: pieces[i].valid,
            filename: pieces[i].files.original
        });
    }
    socket.emit('mode', mode);
    socket.emit('machineState', state);
    socket.emit('pieces', pieceIndices);

    socket.on('mode', (newMode) => {
        if (['scan', 'compare'].indexOf(newMode) > -1) {
            mode = newMode;
            io.sockets.emit('mode', mode);
        }
    });

    let conveyorReady = false;
    let parsingReady = true;
    function doNextImage() {
        if (!conveyorReady || !parsingReady) return;

        let currentIndex = index++;
        let filename = __dirname + '/images/piece' + currentIndex + '.jpg';
        takeImage().then((buffer) => {
            console.log("Took picture (" + path.basename(filename) + "). Starting border recognition");
            startConveyor();
            conveyorReady = false;
            return sharp(buffer).extract({left: 923, top: 997, width: 1066, height: 1168}).resize(913, 1000).toBuffer();
        }).then((data) => {
            sharp(data).toFile(filename);

            return rp({
                method: 'POST',
                uri: 'https://ojaqssmxoi.execute-api.eu-central-1.amazonaws.com/prod/Jigsawlutioner',
                headers: {
                    'x-api-key': 'M6ATl0UUuL1MXc5E4ERYn5iwswNcxF7y8zOMR5Bg'
                },
                body: {
                    imageData: data.toString('base64'),
                    pieceIndex: currentIndex
                },
                json: true
            });
        }).then((piece) => {
            if (typeof piece.errorMessage !== 'undefined') {
                piece.valid = false;
                io.sockets.emit('message', 'error', {atStep: 'Processing', message: piece.errorMessage});
            } else {
                piece.valid = true;
                io.sockets.emit('message', 'success');
            }

            piece.pieceIndex = currentIndex;
            piece.files = {
                original: path.basename(filename)
            };
            pieces.push(piece);
            io.sockets.emit('newPiece', {pieceIndex: piece.pieceIndex, valid: piece.valid, filename: path.basename(filename)});

            console.log("parsing finished");
            parsingReady = true;
            doNextImage();
        }).catch((err) => {
            console.log(err);
            io.sockets.emit('message', 'error', {atStep: 'Processing', message: err.toString()});
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
            startConveyor();
        }
    });

    socket.on('stopMachine', () => {
        if (state) {
            setState(null);
        }
    });

    socket.on('getPiece', (pieceIndex) => {
        console.log("piece " + pieceIndex + " requested");
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].pieceIndex === parseInt(pieceIndex, 10)) {
                socket.emit('piece', pieces[i]);
            }
        }
    });

    socket.on('comparePieces', (sourcePieceIndex, comparePieceIndex) => {
        let sourcePiece = null;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].valid && pieces[i].pieceIndex === parseInt(sourcePieceIndex, 10)) {
                sourcePiece = pieces[i];
                break;
            }
        }
        let comparePiece = null;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].valid && pieces[i].pieceIndex === parseInt(comparePieceIndex, 10)) {
                comparePiece = pieces[i];
                break;
            }
        }

        let results = {};
        if (sourcePiece && comparePiece) {
            for (let sourceSideIndex = 0; sourceSideIndex < sourcePiece.sides.length; sourceSideIndex++) {
                for (let compareSideIndex = 0; compareSideIndex < comparePiece.sides.length; compareSideIndex++) {
                    results[sourceSideIndex + '_' + compareSideIndex] = Jigsawlutioner.Matcher.getSideMatchingFactor(sourcePiece.sides[sourceSideIndex], comparePiece.sides[compareSideIndex], 0, 0);
                }
            }
        }

        socket.emit('comparison', sourcePiece, comparePiece, results);
    });

    socket.on('findMatchingPieces', (sourcePieceIndex) => {
        let sourcePiece = null;
        let comparePieces = [];
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].valid && pieces[i].pieceIndex === parseInt(sourcePieceIndex, 10)) {
                sourcePiece = pieces[i];
                break;
            }
            if (pieces[i].valid) {
                comparePieces.push(pieces[i]);
            }
        }

        let matches = Jigsawlutioner.Matcher.findMatchingPieces(sourcePiece, comparePieces);

        socket.emit('matchingPieces', sourcePieceIndex, matches);
    });

    socket.on('getPlacements', () => {
        console.log("placements requested", Date.now());

        let comparePieces = [];
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].valid) {
                comparePieces.push(pieces[i]);
            }
        }

        let placements = Jigsawlutioner.Matcher.getPlacements(comparePieces);
        for (let groupIndex in placements) {
            if (!placements.hasOwnProperty(groupIndex)) continue;

            for (let x in placements[groupIndex]) {
                if (!placements[groupIndex].hasOwnProperty(x)) continue;

                for (let y in placements[groupIndex][x]) {
                    if (!placements[groupIndex][x].hasOwnProperty(y)) continue;

                    placements[groupIndex][x][y] = placements[groupIndex][x][y].pieceIndex;
                }
            }
        }
        console.log("returning placements", Date.now());

        socket.emit('placements', placements);
    });
});