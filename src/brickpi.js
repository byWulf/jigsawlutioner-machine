const brickpi3 = require('brickpi3');
const rpio = require('rpio');

function Brickpi() {
    this.isInitialized = false;
    this.conveyorPosition = 0;

    this.init = async () => {
        if (this.isInitialized) return;

        await brickpi3.set_address(1, 'A778704A514D355934202020FF110722');
        await brickpi3.set_address(2, 'DF9E6AC3514D355934202020FF112718');
    
        this.BP = new brickpi3.BrickPi3(2);
    
        brickpi3.utils.resetAllWhenFinished(this.BP);
    
        this.conveyorMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_C);
        this.conveyorSensor = {pin: 3};
    
        this.rotatorYMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_B);
        this.rotatorYSensor = brickpi3.utils.getSensor(this.BP, this.BP.PORT_4);
        await this.rotatorYSensor.setType(this.rotatorYSensor.BP.SENSOR_TYPE.EV3_TOUCH);
        this.rotatorRotateMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_A);
    
        this.plateZSensor = brickpi3.utils.getSensor(this.BP, this.BP.PORT_1);
        await this.plateZSensor.setType(this.plateZSensor.BP.SENSOR_TYPE.EV3_TOUCH);
        this.plateZMotor = brickpi3.utils.getMotor(this.BP, this.BP.PORT_D);
    
        rpio.open(this.conveyorSensor.pin, rpio.INPUT, rpio.PULL_DOWN);

        this.isInitialized = true;
    };

    this.resetMotors = async () => {
        //First all y motors so they dont block anything
        await Promise.all([this._resetRotatorY()]);

        //Then everything else
        await Promise.all([this._resetRotatorRotate(), this._resetConveyor(), this._resetPlateZ()]);
    };

    this._resetRotatorY = async () => {
        let initialSensorState = await this.rotatorYSensor.getValue();

        if (!initialSensorState) {
            await this.rotatorYMotor.setPower(10, async () => {
                return await this.rotatorYSensor.getValue() === 1;
            });
        }
        await this.rotatorYMotor.setEncoder(await this.rotatorYMotor.getEncoder());
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
        if (!this.isInitialized) {
            await this.init();
        }

        let partsPerRotation = 10;
        let partsPerPlate = 6;

        this.conveyorPosition -= (partsPerPlate / partsPerRotation * 360);

        await this.conveyorMotor.setPosition(this.conveyorPosition, 50);
    };


    this.rotatePiece = async (degree) => {
        if (!this.isInitialized) {
            await this.init();
        }

        let rotateConversion = 60/12;
        let extraRotate = 10;

        while (degree > 180) degree -= 360;
        while (degree < -180) degree += 360;

        if (degree < 0) degree -= extraRotate;
        if (degree > 0) degree += extraRotate;

        await this.rotatorYMotor.setPosition(-700);
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

        const cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
        const cmPerRotation = cmPerTeeth * 20; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-20-teeth-unreinforced-32269
        let targetMotorPosition = 360 * x / cmPerRotation;

        await Promise.all([this.plateZMotor.setPosition(-targetMotorPosition, 100)]);
    };
}

module.exports = new Brickpi();