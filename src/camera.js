const spawn = require('child_process').spawn;
const logger = require('./logger').getInstance('Camera'.white);

function Camera() {
    this.isInitialized = false;
    this.currentCameraResolver = null;
    this.cameraProcess = null;
    this.buffer = null;
    this.startTime = 0;

    this.parameters = [
        '-t', '0',
        '-s',
        '-ss', '21000',
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

    /**
     * @return {Promise<void>}
     */
    this.init = () => {
        return new Promise((resolve) => {
            if (this.isInitialized) {
                resolve();
                return;
            }

            this.cameraProcess = spawn('raspistill', this.parameters);

            this.cameraProcess.stdout.on('data', (data) => {
                this.handleImageData(data);
            });

            this.cameraProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });
            this.cameraProcess.on('close', () => {
                throw new Error('Camera closed.');
            });

            setTimeout(() => {
                this.isInitialized = true;
                resolve();
            }, 500);
        });
    };

    /**
     * @param {Buffer} data
     */
    this.handleImageData = (data) => {
        if (this.buffer === null) {
            this.buffer = data;
        } else {
            this.buffer = Buffer.concat([this.buffer, data]);
        }

        let eoi;
        while ((eoi = this.buffer.indexOf(Buffer.from([0xff, 0xd9]))) > -1) {
            let finishedImageBuffer = this.buffer.slice(0, eoi + 2);
            this.buffer = this.buffer.slice(eoi + 2);

            if (this.currentCameraResolver !== null) {
                logger.debug('Taking image took ' + (Date.now() - this.startTime) + 'ms (buffer length ' + this.buffer.length + ' remaining)');

                this.currentCameraResolver(finishedImageBuffer);
            }
        }
    };

    /**
     * @return {Promise<Buffer>}
     */
    this.takeImage = () => {
        return new Promise(async (resolve) => {
            if (!this.isInitialized) {
                await this.init();
            }

            this.startTime = Date.now();
            this.currentCameraResolver = resolve;
            this.cameraProcess.kill('SIGUSR1');
        });
    };
}
module.exports = new Camera();