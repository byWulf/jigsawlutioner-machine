const brickpi3 = require('brickpi3');
const keypress = require('keypress');

let BrickPi;
let plateXSensor, plateXMotor, armXSensor, armXMotor, armYMotor, armToPlateRatio;

async function initBricks() {
    BrickPi = new brickpi3.BrickPi3();

    brickpi3.utils.resetAllWhenFinished(BrickPi);

    plateXSensor = brickpi3.utils.getSensor(BrickPi, BrickPi.PORT_1);
    await plateXSensor.setType(plateXSensor.BP.SENSOR_TYPE.EV3_TOUCH);
    plateXMotor = brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_A);

    armXSensor = brickpi3.utils.getSensor(BrickPi, BrickPi.PORT_2);
    await armXSensor.setType(armXSensor.BP.SENSOR_TYPE.EV3_TOUCH);
    armXMotor = brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_D);

    armYMotor = brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_B);

    armToPlateRatio = Math.abs(new brickpi3.utils.Gear(24).drive(12).getFactor());
}

async function resetMotors() {
    await Promise.all([resetArmY()]);
    await Promise.all([resetPlateX(),resetArmX()]);
}

async function resetArmY() {
    await brickpi3.utils.resetMotorEncoder(armYMotor.BP, armYMotor.port, brickpi3.utils.RESET_MOTOR_LIMIT.BACKWARD_LIMIT, 0, 10, 10000, 30);
}

async function resetArmX() {
    let initialSensorState = await armXSensor.getValue();

    if (!initialSensorState) {
        await armXMotor.setPower(50, async () => {
            return await armXSensor.getValue() === 1;
        });
    }
    await armXMotor.setEncoder(await armXMotor.getEncoder());
}

async function resetPlateX() {
    let initialSensorState = await plateXSensor.getValue();

    if (!initialSensorState) {
        await plateXMotor.setPower(-50, async () => {
            return await plateXSensor.getValue() === 1;
        });
    }
    await plateXMotor.setEncoder(await plateXMotor.getEncoder());
}

function letUserControlMotors() {
    console.log("letUserControlMotors");

    let mapping = [
        {motor: brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_A), power: 0, keyForward: 'q', keyBackward: 'a'},
        {motor: brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_B), power: 0, keyForward: 'w', keyBackward: 's'},
        {motor: brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_C), power: 0, keyForward: 'e', keyBackward: 'd'},
        {motor: brickpi3.utils.getMotor(BrickPi, BrickPi.PORT_D), power: 0, keyForward: 'r', keyBackward: 'f'}
    ];

    keypress(process.stdin);
    process.stdin.on('keypress', async function (ch, key) {
        if (key && key.ctrl && key.name === 'c') {
            process.stdin.pause();
        }

        for (let i = 0; i < mapping.length; i++) {
            if (key && (key.name === mapping[i].keyForward || key.name === mapping[i].keyBackward)) {
                if (key.name === mapping[i].keyForward) {
                    mapping[i].power = mapping[i].power === 50 ? 0 : 50;
                }
                if (key.name === mapping[i].keyBackward) {
                    mapping[i].power = mapping[i].power === -50 ? 0 : -50;
                }

                await mapping[i].motor.setPower(mapping[i].power);
                if (mapping[i].power === 0) {
                    console.log('Encoder now: ', await mapping[i].motor.getEncoder());
                }
            }
        }
        if (key && key.name === 'b') {
            await placePiece(0,0);
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}

let pos = 5;
async function placePiece(x, y) {
    x = pos;
    pos += 2;
    const plateXMotorDockPosition = 3500;

    const cmPerTeeth = 3.2 / 10; //https://www.brickowl.com/catalog/lego-gear-rack-4-3743
    const cmPerRotation = cmPerTeeth * 12; //https://www.brickowl.com/catalog/lego-double-bevel-gear-with-12-teeth-32270
    let targetPlateXMotorPosition = plateXMotorDockPosition - (360 * x / cmPerRotation);

    await plateXMotor.setPosition(plateXMotorDockPosition, 100);
    await armXMotor.setPosition(-400, 100);
    await armYMotor.setPosition(275, 70);
    await armXMotor.setPosition(0, 70);
    await plateXMotor.setPosition(targetPlateXMotorPosition, 100);
    await Promise.all([
        armXMotor.setPosition(-300, 70),
        plateXMotor.setPosition(targetPlateXMotorPosition - 300 * armToPlateRatio, 70 * armToPlateRatio),
        armYMotor.setPosition(275, 70)]
    );
    await armYMotor.setPosition(0, 100);
}

(async() => {
    await initBricks();
    await resetMotors();
    letUserControlMotors();
})();