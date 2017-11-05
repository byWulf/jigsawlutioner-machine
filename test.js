const Conveyor = require('./src/conveyor');
const brickPi = require('./src/brickpi');

const conveyor = new Conveyor(11, brickPi.nextPlate);

conveyor.addStation(3, require('./src/stations/photobox'));
//conveyor.addStation(5, require('./src/stations/rotator'));
//conveyor.addStation(8, require('./src/stations/arm'));

conveyor.start();

setTimeout(() => {
    conveyor.stop();
}, 30000);