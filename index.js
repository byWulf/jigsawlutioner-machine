import 'colors';

import Webserver from './src/webserver.js';
import projectManager from './src/projectManager.js';

import Logger from './src/logger.js';
Logger.setGlobalLevel(Logger.LEVEL_DEBUG);
const logger = new Logger('Main'.green);

import './controllerConfig.js';
import Conveyor from "./src/conveyor.js";
import Scanner from './src/stations/scanner.js';
import Rotator from './src/stations/rotator.js';
import SorterByNops from './src/stations/sorterByNops.js';

(async () => {
    logger.info('Setting up conveyor');
    const conveyor = new Conveyor(6, 'pi8', 'D', 4, 135);
    conveyor.addStation(2, new Scanner('pi2', -2, 25, 72, 25, 83, 245, 2));
    conveyor.addStation(3, new Rotator('pi5', 'A', 'D'));
    conveyor.addStation(5, new SorterByNops('pi6', 'B', 'C', 'A'));

    logger.info('Resetting motors');
    await conveyor.resetMotors();

    projectManager.init();
    const webserver = new Webserver(9999, conveyor);
})();
