const brickpi3 = require('brickpi3');
const rpio = require('rpio');

const colors = require('colors');
const logger = require('./logger').getInstance('BrickPi (master)'.red);

function BrickPiMaster() {
    this.isInitialized = false;
    this.conveyorPosition = 0;
    this.modeSwitcherCallbacks = [];

    this.init = async () => {
        if (this.isInitialized) return;

        await brickpi3.set_address(1, 'A778704A514D355934202020FF110722');
        await brickpi3.set_address(2, 'DF9E6AC3514D355934202020FF112718');
    
        this.BP = new brickpi3.BrickPi3(2);
    
        brickpi3.utils.resetAllWhenFinished(this.BP);
    
        this.conveyorMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_C);
        this.conveyorSensor = {pin: 3};
    
        this.rotatorYMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_B);
        this.rotatorRotateMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_A);
    
        this.plateZSensor = brickpi3.utils.getSensor(this.BP, this.BP.PORT_1);
        await this.plateZSensor.setType(this.plateZSensor.BP.SENSOR_TYPE.EV3_TOUCH);
        this.plateZMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_D);
    
        rpio.open(this.conveyorSensor.pin, rpio.INPUT, rpio.PULL_DOWN);

        this.modeSwitcher = brickpi3.utils.getSensor(this.BP, this.BP.PORT_2);
        await this.modeSwitcher.setType(this.modeSwitcher.BP.SENSOR_TYPE.EV3_TOUCH);
        this._startModeSwitcherListener();

        this.isInitialized = true;
    };

    this._startModeSwitcherListener = () => {
        return new Promise(async(resolve) => {
            while (true) {
                await this.modeSwitcher.waitFor(1);
                for (let i = 0; i < this.modeSwitcherCallbacks.length; i++) {
                    this.modeSwitcherCallbacks[i]();
                }
                await this.modeSwitcher.waitFor(0);
            }
        });
    };

    this.resetMotors = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        //First all y motors so they dont block anything
        await Promise.all([this._resetRotatorY()]);

        //Then everything else
        await Promise.all([this._resetRotatorRotate(), this._resetConveyor(), this._resetPlateZ()]);
    };

    this._resetRotatorY = async () => {
        await brickpi3.utils.resetMotorEncoder(this.rotatorYMotor.BP, this.rotatorYMotor.port, brickpi3.utils.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 10, 10000, 30);
    };

    this._resetRotatorRotate = async () => {
        await this.rotatorRotateMotor.setEncoder(await this.rotatorRotateMotor.getEncoder());
    };

    this._resetConveyor = async () => {
        return new Promise(async (resolve) => {
            await this.conveyorMotor.setPower(-50);

            let lastHit = null;
            setTimeout(async () => {
                await rpio.poll(this.conveyorSensor.pin, async () => {
                    if (lastHit === null) {
                        lastHit = Date.now();
                        return;
                    }
                    if (lastHit && Date.now() - lastHit < 300) {
                        return;
                    }

                    await this.conveyorMotor.setPower(0);
                    rpio.poll(this.conveyorSensor.pin);

                    await this.conveyorMotor.setEncoder(await this.conveyorMotor.getEncoder());
                    this.conveyorPosition = 0;

                    resolve();
                });
            },100);
        });
    };

    this._resetPlateZ = async () => {
        let initialSensorState = await this.plateZSensor.getValue();

        if (!initialSensorState) {
            await this.plateZMotor.setPower(50, async () => {
                return await this.plateZSensor.getValue() === 1;
            });
        }
        await this.plateZMotor.setEncoder(await this.plateZMotor.getEncoder());
    };

    this.nextPlate = async () => {
        logger.debug('nextPlate: beginning');
        if (!this.isInitialized) {
            logger.debug('nextPlate: awaiting init');
            await this.init();
        }

        let partsPerRotation = 10;
        let partsPerPlate = 6;

        this.conveyorPosition -= (partsPerPlate / partsPerRotation * 360);

        logger.debug('nextPlate: setting position');
        await this.conveyorMotor.setPosition(this.conveyorPosition, 50);
        logger.debug('nextPlate: position set');
    };


    this.rotatePiece = async (degree) => {
        if (!this.isInitialized) {
            await this.init();
        }

        let rotateConversion = 60/12;
        let extraRotate = 2;

        while (degree > 180) degree -= 360;
        while (degree < -180) degree += 360;

        if (degree < 0) degree -= extraRotate;
        if (degree > 0) degree += extraRotate;

        await this.rotatorYMotor.setPosition(370);
        await this.rotatorRotateMotor.setPosition(degree * rotateConversion);

        await this.rotatorYMotor.setPosition(0);
        await this.rotatorRotateMotor.setPosition(0);
    };

    this.prepareBoard = async (x) => {
        if (!this.isInitialized) {
            await this.init();
        }
        if (x > 40) {
            throw new Error('Board is only 40cm long. Please specify a value below or equal 40cm.');
        }
        if (x < 0) {
            throw new Error('Board x position must be at least at 0cm. Got ' + x + 'cm.');
        }

        logger.debug('prepareBoard: ', x);

        const cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
        const cmPerRotation = cmPerTeeth * 20; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-20-teeth-unreinforced-32269
        let targetMotorPosition = 360 * x / cmPerRotation;

        await Promise.all([this.plateZMotor.setPosition(-targetMotorPosition, 100)]);
    };

    this.selectBox1 = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await this.plateZMotor.setPosition(-528, 100);
    };

    this.selectBox2 = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await this.plateZMotor.setPosition(-1595, 100);
    };

    this.onModeSwitch = (callback) => {
        this.modeSwitcherCallbacks.push(callback);
    }
}

module.exports = new BrickPiMaster();