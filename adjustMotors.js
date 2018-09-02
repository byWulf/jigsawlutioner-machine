const brickpi3 = require('brickpi3');
const keypress = require('keypress');

let BP;

function letUserControlMotors() {
    let mapping = [
        {label: 'A', motor: brickpi3.utils.getMotor(BP, BP.PORT_A), power: 0, keyForward: 'q', keyBackward: 'a'},
        {label: 'B', motor: brickpi3.utils.getMotor(BP, BP.PORT_B), power: 0, keyForward: 'w', keyBackward: 's'},
        {label: 'C', motor: brickpi3.utils.getMotor(BP, BP.PORT_C), power: 0, keyForward: 'e', keyBackward: 'd'},
        {label: 'D', motor: brickpi3.utils.getMotor(BP, BP.PORT_D), power: 0, keyForward: 'r', keyBackward: 'f'}
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
                    console.log('Encoder of ' + mapping[i].label + ' now: ', await mapping[i].motor.getEncoder());
                }
            }
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}

(async () => {

    await brickpi3.set_address(1, 'df9e6ac3514d355934202020ff112718');
    await brickpi3.set_address(2, '09f95596514d32384e202020ff0f272f');

    BP = new brickpi3.BrickPi3(2);

    brickpi3.utils.resetAllWhenFinished(BP);

    await brickpi3.utils.resetMotorEncoder(BP, BP.PORT_A);
    await brickpi3.utils.resetMotorEncoder(BP, BP.PORT_B);
    await brickpi3.utils.resetMotorEncoder(BP, BP.PORT_C);
    await brickpi3.utils.resetMotorEncoder(BP, BP.PORT_D);

    letUserControlMotors();
})();