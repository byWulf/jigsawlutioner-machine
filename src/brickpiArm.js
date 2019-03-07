require('colors');

function BrickPiArm() {
    this.logger = require('./logger').getInstance('BrickPi (arm)'.red);

    this.brickPi = require('brickpi3');
    this.brickPiHelper = require('./brickPiHelper');

    this.isInitialized = false;
    this.conveyorPosition = 0;

    this.collectConveyorCenter = 544; //ArmX has to go to this position, so it is exactly in the middle over the conveyor
    this.collectBottom = -177;  //ArmY has to go down to this position to "press" the piece
    this.collectToPlatform = 866; //ArmX has to move to this position, so the piece is pulled onto the moving platform

    this.cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
    this.cmPerRotation = this.cmPerTeeth * 36; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-36-teeth-32498

    this.armYMovements = 0;

    /**
     * @return {Promise<void>}
     */
    this.init = async () => {
        if (this.isInitialized) return;

        await this.brickPi.set_address(1, 'A778704A514D355934202020FF110722');

        this.BP = new this.brickPi.BrickPi3(1);

        this.brickPi.utils.resetAllWhenFinished(this.BP);

        // noinspection JSUnresolvedFunction
        this.plateXMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_B);
        // noinspection JSUnresolvedFunction
        this.armXMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_A);
        // noinspection JSUnresolvedFunction
        this.armYMotor = this.brickPi.utils.getMotor(this.BP, this.BP.PORT_D);

        this.isInitialized = true;
    };

    /**
     * @return {Promise<void>}
     */
    this.resetMotors = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([this._resetArmY()]);
        await Promise.all([this._resetPlateX(), this._resetArmX()]);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetArmY = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.armYMotor.BP, this.armYMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.FORWARD_LIMIT, 0, 10, 10000, 30);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetArmX = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.armXMotor.BP, this.armXMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 1, 10000, 60);
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._resetPlateX = async () => {
        await this.brickPiHelper.resetMotorEncoder(this.plateXMotor.BP, this.plateXMotor.port, this.brickPiHelper.RESET_MOTOR_LIMIT.FORWARD_LIMIT, 0, 1, 10000, 60);
    };

    this.standby = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([
            this.armYMotor.setPosition(0, 100),
            this.plateXMotor.setPosition(0, 100),
            this.armXMotor.setPosition(this.collectConveyorCenter, 100)
        ]);

        this.armYMovements++;
        if (this.armYMovements === 10) {
            await this._resetArmY();
            this.armYMovements = 0;
        }
    };

    /**
     * @param {int} offset
     * @return {Promise<void>}
     */
    this.collect = async (offset) => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([
            this.plateXMotor.setPosition(0, 100),
            this.armXMotor.setPosition(this.collectConveyorCenter + 360 * offset * (6/*cm plate height*/ / 2) / this.cmPerRotation, 100)
        ]);

        await this.armYMotor.setPosition(this.collectBottom, 70);
    };

    /**
     * @return {Promise<void>}
     */
    this.moveToPlatform = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([
            this.armXMotor.setPosition(this.collectToPlatform, 70),
            this.armYMotor.setPosition(this.collectBottom - 30, 70)
        ]);
        await this.armYMotor.setPosition(this.collectBottom - 70);
    };

    /**
     * @return {Promise<void>}
     */
    this.moveToBoxRamp = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await this.armXMotor.setPosition(227, 70);
    };

    /**
     * @return {Promise<void>}
     */
    this.moveToBox = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([
           this.armXMotor.setPosition(0, 70),
           this.armYMotor.setPosition(this.collectBottom - 130, 70)
        ]);
    };

    /**
     * @param {number} x
     * @return {Promise<void>}
     */
    this.moveTo = async (x) => {
        if (!this.isInitialized) {
            await this.init();
        }

        let sizeCmTo = 44;
        let sizeCmFrom = 7;
        if (x > sizeCmTo - sizeCmFrom) {
            throw new Error('Board is only ' + (sizeCmTo - sizeCmFrom) + 'cm long. Please specify a value below or equal ' + (sizeCmTo - sizeCmFrom) + 'cm.');
        }
        if (x < 0) {
            throw new Error('Board x position must be at least at 0cm. Got ' + x + 'cm.');
        }

        let xOffset = (360 * (x + sizeCmFrom) / this.cmPerRotation);
        await Promise.all([
            this.plateXMotor.setPosition(-xOffset, 100),
            this.armXMotor.setPosition(this.collectToPlatform + xOffset, 100),
        ]);
    };

    /**
     * @return {Promise<void>}
     */
    this.place = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        let additionalOffset = (360 * 8/*cm*/ / this.cmPerRotation); //5cm to move the puzzle from the platform
        let currentEncoder = await this.plateXMotor.getEncoder();

        this.logger.debug('Current encoder: ' + currentEncoder + ', additionalOffset: ' + additionalOffset + ', result: ' + (currentEncoder - additionalOffset));

        await Promise.all([
            this.plateXMotor.setPosition(currentEncoder - additionalOffset, 100),
            this.armYMotor.setPosition(this.collectBottom - 90, 70)
        ]);
    };
}

module.exports = new BrickPiArm();