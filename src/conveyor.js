const Plate = require('./plate');
const Station = require('./stations/station');

function Conveyor(plateCount, forwardFunction) {
    this.forwardFunction = forwardFunction;
    this.running = false;

    this.start = async () => {
        if (this.running) return;

        this.running = true;
        while(this.running) {
            await this._move();
            this._unreadyStations();
            this._executeStations();
            await this._waitForAllStationsReady();
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
        if (typeof this.forwardFunction === 'function') {
            await this.forwardFunction();
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
            }, 10);
        });
    };

    this._initializeStations(plateCount);
    this._initializePlates(plateCount);
}

module.exports = Conveyor;