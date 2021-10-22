import got from 'got';

import Logger from "./logger.js";
const logger = new Logger('Request'.gray);

export default class ControllerRequest {
    static port = 3000;
    static pis;

    constructor(pi, url, parameters, options) {
        this.pi = pi;
        this.url = url;
        this.parameters = parameters || {};
        this.options = options || {};
    }

    addMotor(name, port) {
        this.parameters[name + '[port]'] = port;

        return this;
    }

    addSensor(name, pin) {
        this.parameters[name + '[pin]'] = pin;

        return this;
    }

    setParameter(name, value) {
        this.parameters[name] = value;

        return this;
    }

    call() {
        const url = ControllerRequest.pis[this.pi].dns + this.url;

        logger.debug('Calling ' + url + ' with parameters:', this.parameters);

        this.options.searchParams = this.parameters;

        return new Promise(async (resolve) => {
            const startTime = Date.now();
            const response = await got.get(url, this.options);
            logger.debug(url + ' took ' + (Date.now() - startTime) + 'ms');

            resolve(response);
        });
    }
}
