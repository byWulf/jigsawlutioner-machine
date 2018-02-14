require('colors');

const Station = require('./station');

class NextButton extends Station {
    constructor() {
        super();

        const brickPi = require('../brickpiMaster');
        brickPi.onModeSwitch(() => {
            this.setReady();
        });
    }
    async execute(plate) {
    }
}

module.exports = new NextButton();