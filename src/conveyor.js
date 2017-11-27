const Plate = require('./plate');
const Station = require('./stations/station');

const logger = require('./logger').getInstance('Conveyor'.magenta);

function Conveyor(plateCount, forwardFunction) {
    this.forwardFunction = forwardFunction;
    this.running = false;

    this.start = async () => {
        logger.debug('Starting');
        if (this.running) {
            logger.debug('- already running. Nothing to do');
            return;
        }

        this.running = true;
        logger.debug('Started. Entering loop.');
        while(this.running) {
            logger.debug('awaiting move');
            await this._move();
            logger.debug('moved');
            logger.debug('waiuting for all stations ready');
            this._unreadyStations();
            this._executeStations();
            await this._waitForAllStationsReady();
            logger.debug('all stations ready');
        }
    };

    this.stop = () => {
        this.running = false;
    };

    this._initializeStations = (plateCount) => {
        this.stations = new Array(plateCount);
    };

    this._initializePlates = (plateCount) => {
        this.plates = new Array(plateCount);
        for (let i = 0; i < plateCount; i++) {
            this.plates[i] = new Plate();
        }
    };

    this.addStation = (index, station) => {
        if (!(station instanceof Station)) {
            throw new Error('Station must be an instance of Station');
        }

        this.stations[index] = station;
    };

    this._move = async () =>{
        logger.debug('mode: typeof forwardFunction', typeof this.forwardFunction);
        if (typeof this.forwardFunction === 'function') {
            logger.debug('mode: starting forwardFunction');
            await this.forwardFunction();
            logger.debug('mode: forwardFunction finished');
        }

        for (let i = this.plates.length - 1; i > 0; i--) {
            this.plates[i] = this.plates[i - 1];
        }
        this.plates[0] = new Plate();
    };

    this._unreadyStations = () => {
        for (let i = 0; i < this.stations.length; i++) {
            if (this._isStation(i)) {
                this.stations[i].setNotReady();
            }
        }
    };

    this._executeStations = () => {
        for (let i = 0; i < this.stations.length; i++) {
            if (this._isStation(i)) {
                // noinspection JSIgnoredPromiseFromCall
                this.stations[i].execute(this.plates[i]);
            }
        }
    };

    this._isStation = (index) => {
        return this.stations[index] instanceof Station;
    };

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

    this._initializeStations(plateCount);
    this._initializePlates(plateCount);
}

module.exports = Conveyor;