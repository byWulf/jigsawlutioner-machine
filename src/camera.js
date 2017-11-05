const spawn = require('child_process').spawn;

function Camera() {
    this.isInitialized = false;
    this.currentCameraResolver = null;
    this.cameraProcess = null;

    this.init = () => {
        return new Promise((resolve) => {
            if (this.isInitialized) {
                return;
            }

            this.cameraProcess = spawn('raspistill', [
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
            ]);

            let currentImageBuffer = null;
            this.cameraProcess.stdout.on('data', (data) => {
                if (currentImageBuffer === null) {
                    currentImageBuffer = data;
                } else {
                    currentImageBuffer = Buffer.concat([currentImageBuffer, data]);
                }

                let eoi;
                while ((eoi = currentImageBuffer.indexOf(Buffer.from([0xff, 0xd9]))) > -1) {
                    let imageBuffer = currentImageBuffer.slice(0, eoi + 2);
                    currentImageBuffer = currentImageBuffer.slice(eoi + 2);

                    if (this.currentCameraResolver !== null) {
                        this.currentCameraResolver(imageBuffer);
                    }
                }
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


    this.takeImage = () => {
        return new Promise(async (resolve) => {
            if (!this.isInitialized) {
                await this.init();
            }

            this.currentCameraResolver = resolve;
            this.cameraProcess.kill('SIGUSR1');
        });
    };
}
module.exports = new Camera();