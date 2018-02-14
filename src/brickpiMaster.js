require('colors');

function BrickPiMaster() {
    this.logger = require('./logger').getInstance('BrickPi (arm)'.red);
    this.brickPi = require('brickpi3');
    this.brickPiHelper = require('./brickPiHelper');
    this.rpio = require('rpio');

    this.isInitialized = false;
    this.conveyorPosition = 0;
    this.modeSwitcherCallbacks = [];

    /**
     * @return {Promise<void>}
     */
    this.init = async () => {
        if (this.isInitialized) return;

        await this.brickPi.set_address(1, 'A778704A514D355934202020FF110722');
        await this.brickPi.set_address(2, 'DF9E6AC3514D355934202020FF112718');
    
        this.BP = new this.brickPi.BrickPi3(2);
    
        this.brickPi.utils.resetAllWhenFinished(this.BP);
    
        // noinspection JSUnresolvedFunction
        this.conveyorMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_A);
        this.conveyorSensor = {pin: 3};
    
        // noinspection JSUnresolvedFunction
        this.rotatorYMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_D);
        // noinspection JSUnresolvedFunction
        this.rotatorRotateMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_C);
    
        // noinspection JSUnresolvedFunction
        this.plateZMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_B);
    
        this.rpio.open(this.conveyorSensor.pin, this.rpio.INPUT, this.rpio.PULL_DOWN);

        // noinspection JSUnresolvedFunction
        this.modeSwitcher = this.brickPi.utils.getSensor(this.BP, this.BP.PORT_3);
        await this.modeSwitcher.setType(this.modeSwitcher.BP.SENSOR_TYPE.EV3_TOUCH);
        // noinspection JSIgnoredPromiseFromCall
        this._startModeSwitcherListener();

        this.isInitialized = true;
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._startModeSwitcherListener = () => {
        return new Promise(async() => {
            // noinspection InfiniteLoopJS
            while (true) {
                await this.modeSwitcher.waitFor(1);
                for (let i = 0; i < this.modeSwitcherCallbacks.length; i++) {
                    this.modeSwitcherCallbacks[i]();
                }
                await this.modeSwitcher.waitFor(0);
            }
        });
    };

    /**
     * @return {Promise<void>}
     */
    this.resetMotors = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        //First all y motors so they dont block anything
        await Promise.all([this._resetRotatorY()]);

        //Then everything else
        await Promise.all([this._resetRotatorRotate(), this._resetConveyor(), this._resetPlateZ()]);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetRotatorY = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.rotatorYMotor.BP, this.rotatorYMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 10, 10000, 30);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetRotatorRotate = async () => {
        await this.rotatorRotateMotor.setEncoder(await this.rotatorRotateMotor.getEncoder());
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetConveyor = async () => {
        return new Promise(async (resolve) => {
            await this.conveyorMotor.setPower(-50);

            let lastHit = null;
            setTimeout(async () => {
                await this.rpio.poll(this.conveyorSensor.pin, async () => {
                    if (lastHit === null) {
                        lastHit = Date.now();
                        return;
                    }
                    if (lastHit && Date.now() - lastHit < 300) {
                        return;
                    }

                    await this.conveyorMotor.setPower(0);
                    this.rpio.poll(this.conveyorSensor.pin);

                    await this.conveyorMotor.setEncoder(await this.conveyorMotor.getEncoder());
                    this.conveyorPosition = 0;

                    resolve();
                });
            },100);
        });
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetPlateZ = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.plateZMotor.BP, this.plateZMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 20, 10000, 40);
    };

    /**
     * @return {Promise<void>}
     */
    this.nextPlate = async () => {
        this.logger.debug('nextPlate: beginning');
        if (!this.isInitialized) {
            this.logger.debug('nextPlate: awaiting init');
            await this.init();
        }

        let partsPerRotation = 10;
        let partsPerPlate = 6;

        this.conveyorPosition += (partsPerPlate / partsPerRotation * 360);

        this.logger.debug('nextPlate: setting position');
        await this.conveyorMotor.setPosition(-this.conveyorPosition, 50);
        this.logger.debug('nextPlate: position set');
    };

    /**
     * @param {number} degree
     * @return {Promise<void>}
     */
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

    /**
     * @param {number} x
     * @return {Promise<void>}
     */
    this.prepareBoard = async (x) => {
        if (!this.isInitialized) {
            await this.init();
        }
        let sizeCm = 37;
        if (x > sizeCm) {
            throw new Error('Board is only ' + sizeCm + 'cm long. Please specify a value below or equal ' + sizeCm + 'cm.');
        }
        if (x < 0) {
            throw new Error('Board x position must be at least at 0cm. Got ' + x + 'cm.');
        }

        this.logger.debug('prepareBoard: ', x);

        const cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
        const cmPerRotation = cmPerTeeth * 20; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-20-teeth-unreinforced-32269
        let targetMotorPosition = 360 * x / cmPerRotation;
        let maxMotorPosition = 360 * sizeCm / cmPerRotation;

        await Promise.all([this.plateZMotor.setPosition(maxMotorPosition - targetMotorPosition, 100)]);
    };

    /**
     * @param {function} callback
     */
    this.onModeSwitch = (callback) => {
        this.modeSwitcherCallbacks.push(callback);
    }
}

module.exports = new BrickPiMaster();