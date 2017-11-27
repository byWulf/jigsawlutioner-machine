const brickpi3 = require('brickpi3');

const colors = require('colors');
const logger = require('./logger').getInstance('BrickPi (arm)'.red);

function BrickPiArm() {
    this.isInitialized = false;
    this.conveyorPosition = 0;

    this.plateXMotorDockPosition = 1200;

    this.cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
    this.cmPerRotation = this.cmPerTeeth * 36; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-12-teeth-32270

    this.init = async () => {
        if (this.isInitialized) return;

        await brickpi3.set_address(1, 'A778704A514D355934202020FF110722');
        await brickpi3.set_address(2, 'DF9E6AC3514D355934202020FF112718');

        this.BP = new brickpi3.BrickPi3(1);

        brickpi3.utils.resetAllWhenFinished(this.BP);

        this.plateXSensor = brickpi3.utils.getSensor(this.BP, this.BP.PORT_3);
        await this.plateXSensor.setType(this.plateXSensor.BP.SENSOR_TYPE.EV3_TOUCH);
        this.plateXMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_C);

        this.armXSensor = brickpi3.utils.getSensor(this.BP, this.BP.PORT_1);
        await this.armXSensor.setType(this.armXSensor.BP.SENSOR_TYPE.EV3_TOUCH);
        this.armXMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_A);

        this.armYMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_D);

        this.armToPlateRatio = Math.abs(new brickpi3.utils.Gear(24).drive(12).getFactor());

        this.isInitialized = true;
    };

    this.resetMotors = async () => {
        if (!this.isInitialized) {
            await this.init();
        }

        await Promise.all([this._resetArmY()]);
        await Promise.all([this._resetPlateX(), this._resetArmX()]);
    };

    this._resetArmY = async () => {
        await brickpi3.utils.resetMotorEncoder(this.armYMotor.BP, this.armYMotor.port, brickpi3.utils.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 10, 10000, 30);
    };

    this._resetArmX = async () => {
        let initialSensorState = await this.armXSensor.getValue();

        if (!initialSensorState) {
            await this.armXMotor.setPower(50, async () => {
                return await this.armXSensor.getValue() === 1;
            });
        }
        await this.armXMotor.setEncoder(await this.armXMotor.getEncoder());
    };

    this._resetPlateX = async () => {
        let initialSensorState = await this.plateXSensor.getValue();

        if (!initialSensorState) {
            await this.plateXMotor.setPower(50, async () => {
                return await this.plateXSensor.getValue() === 1;
            });
        }
        await this.plateXMotor.setEncoder(await this.plateXMotor.getEncoder());
    };

    this.collect = async (offset) => {
        if (!this.isInitialized) {
            await this.init();
        }

        offset = Math.max(-100, Math.min(100, offset));

        await this.plateXMotor.setPosition(-this.plateXMotorDockPosition, 100);
        await this.armXMotor.setPosition(-444 + offset, 100);
        await this.armYMotor.setPosition(275, 70);
        await this.armXMotor.setPosition(0, 70);
        await this.plateXMotor.setPosition(-this.plateXMotorDockPosition + 33, 100);
    };

    this.moveTo = async (x) => {
        if (!this.isInitialized) {
            await this.init();
        }

        let targetPlateXMotorPosition = this.plateXMotorDockPosition - (360 * x / this.cmPerRotation);
        if (targetPlateXMotorPosition < 300 * this.armToPlateRatio) {
            targetPlateXMotorPosition = 300 * this.armToPlateRatio;
        }
        await this.plateXMotor.setPosition(-targetPlateXMotorPosition, 100);
    };

    this.place = async () => {
        logger.debug("place method");
        if (!this.isInitialized) {
            logger.debug("must init");
            await this.init();
        }

        logger.debug("0");
        let plateXPosition = await this.plateXMotor.getEncoder();
        logger.debug("a");
        await Promise.all([
            this.armXMotor.setPosition(-300, 70),
            this.plateXMotor.setPosition(plateXPosition + 100 * this.armToPlateRatio, 70 * this.armToPlateRatio),
            this.armYMotor.setPosition(275, 70)]
        );
        logger.debug("b");
        await this.armYMotor.setPosition(0, 100);
        logger.debug("c");
    };
}

module.exports = new BrickPiArm();