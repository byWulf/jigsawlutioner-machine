const Station = require('./station');
const brickPi = require('../brickpiMaster');
const colors = require('colors');
const logger = require('../logger').getInstance('Station'.cyan + ' NextButton'.green);
const mode = require('../mode');

class NextButton extends Station {
    constructor() {
        super();
        brickPi.onModeSwitch(() => {
            this.setReady();
        });
    }
    async execute(plate) {
    }
}

module.exports = new NextButton();