const sleep = require('es7-sleep');

module.exports.RESET_MOTOR_LIMIT = RESET_MOTOR_LIMIT = {
    CURRENT_POSITION: 1,
    FORWARD_LIMIT: 2,
    BACKWARD_LIMIT: 3,
    MIDPOINT_LIMIT: 4
};

module.exports.resetMotorEncoder = resetMotorEncoder = async (brickPiInstance, motorPort, limitType = RESET_MOTOR_LIMIT.CURRENT_POSITION, newOffset = 0, maxPower = 25, timeLimit = 10000, motorPower = 100) => {
    let startTime = Date.now();
    const checkPower = async () => {
        await sleep(100);
        while (Date.now() - startTime <= timeLimit) {
            await sleep(20);

            let status = await brickPiInstance.get_motor_status(motorPort);
            if (Math.abs(status[3]) <= maxPower) {
                await brickPiInstance.set_motor_power(motorPort, 0);
                return status[2];
            }
        }

        await brickPiInstance.set_motor_power(motorPort, 0);
        throw new Error('resetMotorEncoder: timeLimit exceeded');
    };

    if (limitType === RESET_MOTOR_LIMIT.CURRENT_POSITION) {
        let offset = await brickPiInstance.get_motor_encoder(motorPort);
        await brickPiInstance.offset_motor_encoder(motorPort, offset - newOffset);

    } else if (limitType === RESET_MOTOR_LIMIT.FORWARD_LIMIT || limitType === RESET_MOTOR_LIMIT.BACKWARD_LIMIT) {
        let power = motorPower;
        if (limitType === RESET_MOTOR_LIMIT.BACKWARD_LIMIT) power = -motorPower;

        await brickPiInstance.set_motor_power(motorPort, power);
        let offset = await checkPower();
        await brickPiInstance.offset_motor_encoder(motorPort, offset - newOffset);

    } else if (limitType === RESET_MOTOR_LIMIT.MIDPOINT_LIMIT) {
        await brickPiInstance.set_motor_power(motorPort, motorPower);
        let offsetForward = await checkPower();

        await brickPiInstance.set_motor_power(motorPort, -motorPower);
        let offsetBackward = await checkPower();

        await brickPiInstance.offset_motor_encoder(motorPort, offsetBackward + (offsetForward - offsetBackward) / 2 - newOffset);
    } else {
        throw new Error('resetMotorEncoder: Invalid limitType.');
    }
};