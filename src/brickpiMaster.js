require('colors');

function BrickPiMaster() {
    this.logger = require('./logger').getInstance('BrickPi (arm)'.red);
    this.brickPi = require('brickpi3');
    this.brickPiHelper = require('./brickPiHelper');
    this.rpio = require('rpio');

    this.isInitialized = false;
    this.conveyorPosition = 0;
    this.modeSwitcherCallbacks = [];

    this.boxCount = 6;

    this.rotatorYMovements = 0;

    this.currentSortBoxIndex = 0;

    /**
     * @return {Promise<void>}
     */
    this.init = async () => {
        if (this.isInitialized) return;

        await this.brickPi.set_address(1, 'df9e6ac3514d355934202020ff112718');
        await this.brickPi.set_address(2, '09f95596514d32384e202020ff0f272f');

        this.BP1 = new this.brickPi.BrickPi3(1);
        this.BP2 = new this.brickPi.BrickPi3(2);

        this.brickPi.utils.resetAllWhenFinished(this.BP1);
        this.brickPi.utils.resetAllWhenFinished(this.BP2);

        // noinspection JSUnresolvedFunction
        this.conveyorMotor = this.brickPi.utils.getMotor(this.BP1, this.BP1.PORT_A);
        this.conveyorSensor = {pin: 3};
    
        // noinspection JSUnresolvedFunction
        this.rotatorYMotor = this.brickPi.utils.getMotor(this.BP1, this.BP1.PORT_D);
        // noinspection JSUnresolvedFunction
        this.rotatorRotateMotor = this.brickPi.utils.getMotor(this.BP1, this.BP1.PORT_C);
    
        // noinspection JSUnresolvedFunction
        this.plateZMotor = this.brickPi.utils.getMotor(this.BP1, this.BP1.PORT_B);
    
        this.rpio.open(this.conveyorSensor.pin, this.rpio.INPUT, this.rpio.PULL_DOWN);

        // noinspection JSUnresolvedFunction
        this.modeSwitcher = this.brickPi.utils.getSensor(this.BP1, this.BP1.PORT_3);
        await this.modeSwitcher.setType(this.BP1.SENSOR_TYPE.EV3_TOUCH);
        // noinspection JSIgnoredPromiseFromCall
        this._startModeSwitcherListener();

        // noinspection JSUnresolvedFunction
        this.sorterMotor = this.brickPi.utils.getMotor(this.BP2, this.BP2.PORT_D);

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

        await Promise.all([this._resetRotatorY(), this._resetRotatorRotate(), this._resetConveyor(), this._resetPlateZ(), this._resetBox()]);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetRotatorY = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.rotatorYMotor.BP, this.rotatorYMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, -50, 10, 10000, 30);
        await this.rotatorYMotor.setPosition(0);
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
     * @returns {Promise<void>}
     * @private
     */
    this._resetBox = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.sorterMotor.BP, this.sorterMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 20, 10000, 40);
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

        await this.rotatorYMotor.setPosition(270);
        await this.rotatorRotateMotor.setPosition(degree * rotateConversion);

        await this.rotatorYMotor.setPosition(0);
        await this.rotatorRotateMotor.setPosition(0);

        this.rotatorYMovements++;
        if (this.rotatorYMovements === 10) {
            await this._resetRotatorY();
            this.rotatorYMovements = 0;
        }
    };

    /**
     * @param {number} x
     * @param {number} offset
     * @return {Promise<void>}
     */
    this.prepareBoard = async (x, offset) => {
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
        let offsetPosition = 360 * offset * (6/*cm of plate width*/ / 2) / cmPerRotation;

        await Promise.all([this.plateZMotor.setPosition(maxMotorPosition - targetMotorPosition + offsetPosition, 100)]);
    };

    this.moveBoardToStandby = async () => {
        await this.plateZMotor.setPosition(3200);
    };

    /**
     * @param {function} callback
     */
    this.onModeSwitch = (callback) => {
        this.modeSwitcherCallbacks.push(callback);
    };

    this.selectSortBox = async (boxIndex) => {
        if (boxIndex < 0 || boxIndex > this.boxCount - 1) {
            throw new Error('We only have ' + this.boxCount + ' boxes. Please select a box between 0 and ' + (this.boxCount - 1));
        }

        await this.sorterMotor.setPosition(950 * boxIndex + 200);
        this.currentSortBoxIndex = boxIndex;
    };

    this.shakeSortBox = async () => {
        for (let i = 0; i < 3; i++) {
            await this.sorterMotor.setPosition(950 * this.currentSortBoxIndex + 150);
            await this.sorterMotor.setPosition(950 * this.currentSortBoxIndex + 250);
        }
        await this.sorterMotor.setPosition(950 * this.currentSortBoxIndex + 200);
    };

    this.moveSortBoxToStandby = async () => {
        await this.sorterMotor.setPosition(-3400);
    };
}

module.exports = new BrickPiMaster();