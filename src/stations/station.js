class Station {
    constructor() {
        this.ready = true;
    }

    /**
     *
     * @param {Plate} plate
     */
    async execute(plate) {
        throw new Error('Must implement execute method.');
    }

    setReady() {
        this.ready = true;
    }

    setNotReady() {
        this.ready = false;
    }

    isReady() {
        return this.ready;
    }
}

module.exports = Station;