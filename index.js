import 'colors';

import Webserver from './src/webserver.js';
import projectManager from './src/projectManager.js';

import Logger from './src/logger.js';
Logger.setGlobalLevel(Logger.LEVEL_DEBUG);
const logger = new Logger('Main'.green);

import ControllerRequest from "./src/controllerRequest.js";
ControllerRequest.port = 3000;
ControllerRequest.pis = {
    'pi1': {
        dns: 'http://jigsawlutioner-master',
        bricks: {
            1: {
                address: 'df9e6ac3514d355934202020ff112718',
            },
        },
    },
    'pi2': {
        dns: 'http://jigsawlutioner-arm',
        bricks: {
            1: {
                address: 'A778704A514D355934202020FF110722',
            },
        },
    },
};
import Conveyor from "./src/conveyor.js";
import Scanner from './src/stations/scanner.js';
import Rotator from './src/stations/rotator.js';

(async () => {
    logger.info('Setting up conveyor');
    const conveyor = new Conveyor(8, 'pi1', 1, 'A', 4, 135);
    conveyor.addStation(3, new Scanner('pi2', 26, 68, 25, 82, 245, 2));
    conveyor.addStation(5, new Rotator('pi2', 1, 'A', 1, 'B'));

    logger.info('Resetting motors');
    await conveyor.resetMotors();

    projectManager.init();
    const webserver = new Webserver(9999, conveyor);
})();
