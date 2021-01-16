import ControllerRequest from "./controllerRequest.js";
import Station from "./stations/station.js";
import Logger from "./logger.js";
const logger = new Logger('Conveyor'.magenta);

import Plate from "./models/Plate.js";

export default class Conveyor {
    resetApi;
    moveToNextPlateApi;

    plateCount = 0;
    plateIndex = 0;

    running = false;
    finished = true;

    constructor(plateCount, pi, motorBrick, motorPort, sensorPort, additionalForward) {
        this.plateCount = plateCount;

        this.resetApi = new ControllerRequest(pi, '/conveyor/reset', {additionalForward: additionalForward})
            .addMotor('motor', motorBrick, motorPort)
            .addSensor('sensor', sensorPort);

        this.moveToNextPlateApi = new ControllerRequest(pi, '/conveyor/move-to-next-plate')
            .addMotor('motor', motorBrick, motorPort);

        process.on('jigsawlutioner.projectSelected', this.initializePlates);

        this.initializeStations();
        this.initializePlates();
    }

    /**
     * @return {Promise<void>}
     */
    async start() {
        logger.debug('Starting');
        if (!this.finished) {
            logger.debug('- already running. Nothing to do');
            return;
        }

        this.running = true;
        this.finished = false;
        process.emit('jigsawlutioner.conveyorStarted');
        logger.debug('Started. Entering loop.');
        while(this.running) {
            logger.debug('awaiting move');
            let moveStartTime = Date.now();
            await this.move();
            logger.debug('moved (took ' + (Date.now() - moveStartTime) + 'ms)');

            logger.debug('waiting for all stations ready');
            let executeStartTime = Date.now();
            this.unreadyStations();
            this.executeStations();
            await this.waitForAllStationsReady();
            logger.debug('all stations ready after ' + (Date.now() - executeStartTime) + 'ms');
        }

        this.finished = true;
        process.emit('jigsawlutioner.conveyorStopped');
    };

    stop() {
        this.running = false;
        process.emit('jigsawlutioner.stoppingConveyor');
    };

    initializeStations() {
        this.stations = new Array(this.plateCount);
    };

    initializePlates() {
        this.plates = new Array(this.plateCount);
        for (let i = 0; i < this.plates.length; i++) {
            this.plates[i] = new Plate(++this.plateIndex);
        }
    };

    /**
     * @param {int} index
     * @param {Station} station
     */
    addStation(index, station) {
        if (!(station instanceof Station)) {
            throw new Error('Station must be an instance of Station');
        }

        station.setConveyor(this);
        this.stations[index] = station;
    };

    /**
     * @return {Promise<void>}
     */
    async move() {
        await this.moveToNextPlateApi.call();

        for (let i = this.plates.length - 1; i > 0; i--) {
            this.plates[i] = this.plates[i - 1];
        }
        this.plates[0] = new Plate(++this.plateIndex);
    };

    unreadyStations() {
        for (let i = 0; i < this.stations.length; i++) {
            if (this.isStation(i)) {
                this.stations[i].setNotReady();
            }
        }
    };

    executeStations() {
        for (let i = 0; i < this.stations.length; i++) {
            if (this.isStation(i)) {
                this.stations[i].execute(this.plates[i]);
            }
        }
    };

    /**
     * @param {int} index
     * @return {boolean}
     */
    isStation(index) {
        return !!this.stations[index];
    };

    /**
     * @return {Promise<void>}
     */
    waitForAllStationsReady() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                for (let i = 0; i < this.stations.length; i++) {
                    if (this.isStation(i) && !this.stations[i].isReady()) {
                        return;
                    }
                }

                clearInterval(interval);
                resolve();
            }, 25);
        });
    };

    resetMotors() {
        const promises = [];
        promises.push(this.resetApi.call());

        for (let i = 0; i < this.stations.length; i++) {
            if (this.isStation(i)) {
                promises.push(this.stations[i].reset());
            }
        }

        return Promise.all(promises);
    }
}
