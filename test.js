const brickpi3 = require('brickpi3');

function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    })
}

(async () => {
    try {
        let BP = new brickpi3.BrickPi3();
        console.log(await BP.get_id());

        brickpi3.utils.resetAllWhenFinished(BP);

        await brickpi3.utils.resetMotorEncoder(BP, BP.PORT_A);

        await brickpi3.utils.getMotor(BP, BP.PORT_A).setPosition(360);
    } catch (err) {
        console.log(err);
    }

})();
