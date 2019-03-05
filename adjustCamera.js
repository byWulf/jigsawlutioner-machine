const port = process.env.PORT || 1101;

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const sharp = require('sharp');
const Jigsawlutioner = require('jigsawlutioner');

app.use(express.static('adjustCameraClient'));
app.use('/images', express.static('images'));

app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/fontawesome', express.static('node_modules/font-awesome'));
app.use('/tether', express.static('node_modules/tether/dist'));
app.use('/popper', express.static('node_modules/popper.js/dist/umd'));

http.listen(port, () => {
    console.log('Server started on port ' + port);
});

const brickpi3 = require('brickpi3');
const keypress = require('keypress');
const rpio = require('rpio');

let BrickPi;
let conveyorMotor, conveyorSensor;

async function initBricks() {
    await brickpi3.set_address(1, '09f95596514d32384e202020ff0f272f');
    await brickpi3.set_address(2, 'DF9E6AC3514D355934202020FF112718');

    BrickPi = new brickpi3.BrickPi3(2);

    brickpi3.utils.resetAllWhenFinished(BrickPi);

    conveyorMotor = brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_A);
    conveyorSensor = {pin: 3};

    rpio.open(conveyorSensor.pin, rpio.INPUT, rpio.PULL_DOWN);
}

async function resetConveyor() {
    return new Promise(async (resolve) => {
        await conveyorMotor.setPower(-50);

        let lastHit = null;
        setTimeout(async () => {
            await rpio.poll(conveyorSensor.pin, async () => {
                if (lastHit === null) {
                    lastHit = Date.now();
                    return;
                }
                if (lastHit && Date.now() - lastHit < 300) {
                    return;
                }

                await conveyorMotor.setPower(0);
                rpio.poll(conveyorSensor.pin);

                await conveyorMotor.setEncoder(await conveyorMotor.getEncoder());

                resolve();
            });
        },100);
    });
}

function letUserControlMotors() {
    console.log("letUserControlMotors");

    keypress(process.stdin);
    process.stdin.on('keypress', async function (ch, key) {
        if (key && key.ctrl && key.name === 'c') {
            process.stdin.pause();
            process.exit();
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();

    io.on('connection', (socket) => {
        socket.on('takeImage', async (settings) => {
            const { exec } = require('child_process');

            let filename = '/images/' + Math.floor(Math.random()*100000000) + '.png';

            await new Promise((resolve, reject) => {
                exec('raspistill ' + [
                    '-t', '1',
                    '-ss', settings.ss,
                    '-ex', settings.ex,
                    '-th', 'none',
                    '-sh', settings.sh,
                    '-co', settings.co,
                    '-br', settings.br,
                    '-sa', settings.sa,
                    '-ISO', settings.ISO,
                    '-awb', settings.awb,
                    '-mm', settings.mm,
                    '-drc', settings.drc,
                    '-st',
                    '-q', settings.q,
                    '-n',
                    '-e', 'jpg',
                    '-o', '/var/www' + filename
                ].join(' '), (err, stdout, stderr) => {
                    if (err || stderr) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });

            await sharp('/var/www' + filename).resize(328*4, 246*4).toFile('/var/www' + filename + '.resized.png');

            console.log(filename);

            let left = Math.floor(settings.cropLeft / 100 * 3280);
            let top = Math.floor(settings.cropTop / 100 * 2464);
            let width = Math.floor((settings.cropRight - settings.cropLeft) / 100 * 3280);
            let height = Math.floor((settings.cropBottom - settings.cropTop) / 100 * 2464);

            await sharp('/var/www' + filename).extract({
                left: left,
                top: top,
                width: width,
                height: height
            }).resize(Math.floor((width / height) * 1000), 1000).toFile('/var/www' + filename + '.cropped.png');

            console.log(settings);
            let success = true;
            try {
                await Jigsawlutioner.BorderFinder.findPieceBorder('/var/www' + filename + '.cropped.png', {debug: true, threshold: parseInt(settings.parseThresh, 10), reduction: parseInt(settings.parseReduction, 10)});
            } catch (e) {
                 console.log(e);
                success = false;
            }

            io.sockets.emit('newImage', filename, success);
        });
        socket.on('nextPlate', () => {
            nextPlate();
        });
        socket.on('prevPlate', () => {
            prevPlate();
        });
    });
}

let conveyorPosition = 0;
async function nextPlate() {
    let partsPerRotation = 10;
    let partsPerPlate = 6;

    conveyorPosition += (partsPerPlate / partsPerRotation * 360);

    await conveyorMotor.setPosition(-conveyorPosition, 50);
}
async function prevPlate() {
    let partsPerRotation = 10;
    let partsPerPlate = 6;

    conveyorPosition -= (partsPerPlate / partsPerRotation * 360);

    await conveyorMotor.setPosition(-conveyorPosition, 50);
}

(async() => {
    await initBricks();
    await resetConveyor();
    letUserControlMotors();
})();


