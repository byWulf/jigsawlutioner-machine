const brickpi3 = require('brickpi3');
const keypress = require('keypress');

let BP;

function letUserControlMotors() {
    let mapping = [
        {motor: brickpi3.utils.getMotor(BP, BP.PORT_A), power: 0, keyForward: 'q', keyBackward: 'a'},
        {motor: brickpi3.utils.getMotor(BP, BP.PORT_B), power: 0, keyForward: 'w', keyBackward: 's'},
        {motor: brickpi3.utils.getMotor(BP, BP.PORT_C), power: 0, keyForward: 'e', keyBackward: 'd'},
        {motor: brickpi3.utils.getMotor(BP, BP.PORT_D), power: 0, keyForward: 'r', keyBackward: 'f'}
    ];

    keypress(process.stdin);
    process.stdin.on('keypress', async function (ch, key) {
        if (key && key.ctrl && key.name === 'c') {
            process.stdin.pause();
        }

        for (let i = 0; i < mapping.length; i++) {
            if (key && (key.name === mapping[i].keyForward || key.name === mapping[i].keyBackward)) {
                if (key.name === mapping[i].keyForward) {
                    mapping[i].power += 10;
                    if (mapping[i].power > 100) mapping[i].power = 100;
                }
                if (key.name === mapping[i].keyBackward) {
                    mapping[i].power -= 10;
                    if (mapping[i].power < -100) mapping[i].power = -100;
                }

                await mapping[i].motor.setPower(mapping[i].power);
                if (mapping[i].power === 0) {
                    console.log('Encoder now: ', await mapping[i].motor.getEncoder());
                }
            }
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}

(async () => {
    await brickpi3.set_address(1, 'A778704A514D355934202020FF110722');
    await brickpi3.set_address(2, 'DF9E6AC3514D355934202020FF112718');

    BP = new brickpi3.BrickPi3(1);

    brickpi3.utils.resetAllWhenFinished(BP);

    brickpi3.utils.resetMotorEncoder(BP, BP.PORT_A);
    brickpi3.utils.resetMotorEncoder(BP, BP.PORT_B);
    brickpi3.utils.resetMotorEncoder(BP, BP.PORT_C);
    brickpi3.utils.resetMotorEncoder(BP, BP.PORT_D);

    letUserControlMotors();
})();