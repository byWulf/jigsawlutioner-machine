import Logger from "../logger.js";
import modeService from "../modeService.js";

export default class Station {
    ready = true;
    logger;
    conveyor;

    constructor(colorizedName) {
        this.logger = new Logger('Station'.cyan + ' ' + colorizedName);
    }

    setConveyor(conveyor) {
        this.conveyor = conveyor;
    }

    /**
     *
     * @param {Plate} plate
     */
    async execute(plate) {
        throw new Error('Must implement execute method.');
    }

    isScanMode() {
        return modeService.getMode() === modeService.MODE_SCAN;
    }

    isPlaceMode() {
        return modeService.getMode() === modeService.MODE_PLACE;
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

    async reset() {
        // Can be implemented by the stations to reset their motors
    }
}
