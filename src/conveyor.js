require('colors');

function Conveyor() {
    this.logger = require('./logger').getInstance('Conveyor'.magenta);
    this.events = require('./events');

    this.plateCount = 0;
    this.plateIndex = 0;

    this.forwardFunction = null;
    this.running = false;
    this.finished = true;

    this.events.listen('projectSelected', () => {
        this._initializePlates();
    });

    this.setPlateCount = (plateCount) => {
        this.plateCount = plateCount;
        this._initializeStations();
        this._initializePlates();
    };

    this.setForwardFunction = (forwardFunction) => {
        this.forwardFunction = forwardFunction;
    };

    /**
     * @return {Promise<void>}
     */
    this.start = async () => {
        this.logger.debug('Starting');
        if (!this.finished) {
            this.logger.debug('- already running. Nothing to do');
            return;
        }

        this.running = true;
        this.finished = false;
        this.events.dispatch('conveyorStarted');
        this.logger.debug('Started. Entering loop.');
        while(this.running) {
            this.logger.debug('awaiting move');
            await this._move();
            this.logger.debug('moved');

            this.logger.debug('waiting for all stations ready');
            this._unreadyStations();
            this._executeStations();
            await this._waitForAllStationsReady();
            this.logger.debug('all stations ready');
        }

        this.finished = true;
        this.events.dispatch('conveyorStopped');
    };

    /**
     *
     */
    this.stop = () => {
        this.running = false;
        this.events.dispatch('stoppingConveyor');
    };

    /**
     * @private
     */
    this._initializeStations = () => {
        this.stations = new Array(this.plateCount);
    };

    /**
     * @private
     */
    this._initializePlates = () => {
        const Plate = require('./models/Plate');

        this.plates = new Array(this.plateCount);
        for (let i = 0; i < this.plates.length; i++) {
            this.plates[i] = new Plate(++this.plateIndex);
        }
    };

    /**
     * @param {int} index
     * @param {Station} station
     */
    this.addStation = (index, station) => {
        const Station = require('./stations/station');
        if (!(station instanceof Station)) {
            throw new Error('Station must be an instance of Station');
        }

        this.stations[index] = station;
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._move = async () =>{
        this.logger.debug('mode: typeof forwardFunction', typeof this.forwardFunction);
        if (typeof this.forwardFunction === 'function') {
            this.logger.debug('mode: starting forwardFunction');
            await this.forwardFunction();
            this.logger.debug('mode: forwardFunction finished');
        }

        for (let i = this.plates.length - 1; i > 0; i--) {
            this.plates[i] = this.plates[i - 1];
        }
        const Plate = require('./models/Plate');
        this.plates[0] = new Plate(++this.plateIndex);
    };

    /**
     * @private
     */
    this._unreadyStations = () => {
        for (let i = 0; i < this.stations.length; i++) {
            if (this._isStation(i)) {
                this.stations[i].setNotReady();
            }
        }
    };

    /**
     * @private
     */
    this._executeStations = () => {
        for (let i = 0; i < this.stations.length; i++) {
            if (this._isStation(i)) {
                // noinspection JSIgnoredPromiseFromCall
                this.stations[i].execute(this.plates[i]);
            }
        }
    };

    /**
     * @param {int} index
     * @return {boolean}
     * @private
     */
    this._isStation = (index) => {
        const Station = require('./stations/station');
        return this.stations[index] instanceof Station;
    };

    /**
     * @return {Promise<void>}
     * @private
     */
    this._waitForAllStationsReady = () => {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                let allReady = true;
                for (let i = 0; i < this.stations.length; i++) {
                    if (this._isStation(i) && !this.stations[i].isReady()) {
                        allReady = false;
                        break;
                    }
                }

                if (allReady) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    };
}

module.exports = new Conveyor();