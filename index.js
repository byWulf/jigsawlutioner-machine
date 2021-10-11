import 'colors';

import Webserver from './src/webserver.js';
import projectManager from './src/projectManager.js';

import Logger from './src/logger.js';
Logger.setGlobalLevel(Logger.LEVEL_DEBUG);
const logger = new Logger('Main'.green);

import './controllerConfig';
import Conveyor from "./src/conveyor.js";
import Scanner from './src/stations/scanner.js';
import Rotator from './src/stations/rotator.js';
import Sorter from './src/stations/sorter.js';

(async () => {
    logger.info('Setting up conveyor');
    const conveyor = new Conveyor(8, 'pi1', 'df', 'A', 4, 135);
    conveyor.addStation(3, new Scanner('pi2', 26, 68, 25, 82, 245, 2));
    conveyor.addStation(5, new Rotator('pi2', 'a7', 'A', 'a7', 'B'));
    conveyor.addStation(7, new Sorter('pi1', 'a7', 'B', 'a7', 'C', 'a7', 'D'));

    logger.info('Resetting motors');
    await conveyor.resetMotors();

    projectManager.init();
    const webserver = new Webserver(9999, conveyor);
})();
