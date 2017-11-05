const Station = require('./station');

class Arm extends Station {
    async execute(plate) {
        let data = await plate.getData();

        setTimeout(() => {
            plate.setData('foo', 1);
            this.setReady();
        }, 1500);
    }
}

module.exports = new Arm();