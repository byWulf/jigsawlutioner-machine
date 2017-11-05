const Conveyor = require('./src/conveyor');

let conveyour = new Conveyor(5, () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2500);
    });
});

conveyour.addStation(2, require('./src/stations/photobox'));
conveyour.addStation(3, require('./src/stations/rotator'));

conveyour.start();

setTimeout(() => {
    conveyour.stop();
}, 30000);