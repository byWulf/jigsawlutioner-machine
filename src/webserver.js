import Logger from "./logger.js";
const logger = new Logger('Webserver'.green);
logger.setLevel(Logger.LEVEL_INFO);

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import modeService from "./modeService.js";
import projectManager from "./projectManager.js";

export default class Webserver {
    conveyor;
    port;

    conveyorState = false;
    boardSwitching = false;
    takeBox = 0;

    app;
    http;
    io;

    constructor(port, conveyor) {
        this.port = port;
        this.conveyor = conveyor;

        this.app = express();
        this.http = http.createServer(this.app);

        this.io = new Server(this.http);

        this.app.use(express.static('client'));

        this.app.use('/jquery', express.static('node_modules/jquery/dist'));
        this.app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
        this.app.use('/fontawesome', express.static('node_modules/font-awesome'));
        this.app.use('/tether', express.static('node_modules/tether/dist'));
        this.app.use('/popper', express.static('node_modules/popper.js/dist/umd'));
        this.app.use('/animate.css', express.static('node_modules/animate.css'));
        this.app.use('/projects', express.static('projects'));

        this.http.listen(this.port, () => {
            logger.info('Webserver started on port ' + this.port);
        });

        this.io.on('connection', (socket) => {
            logger.debug('New connection ' + socket.id);

            this.registerClientConveyorEvents(socket);
            this.registerClientModeEvents(socket);
            this.registerClientProjectManagerEvents(socket);
            this.registerClientStatisticsEvents(socket);
            this.registerClientBoardEvents(socket);
        });

        this.registerConveyorEvents();
        this.registerModeEvents();
        this.registerProjectManagerEvents();
        this.registerStatisticsEvents();
        this.registerBoardEvents();
    }

    registerConveyorEvents() {
        process.on('jigsawlutioner.conveyorStarted', () => {
            this.conveyorState = 'running';

            this.io.emit('conveyorState', this.conveyorState);
        });

        process.on('jigsawlutioner.conveyorStopped', () => {
            this.conveyorState = 'stopped';

            this.io.emit('conveyorState', this.conveyorState);
        });

        process.on('jigsawlutioner.stoppingConveyor', () => {
            this.conveyorState = 'stopping';

            this.io.emit('conveyorState', this.conveyorState);
        });
    }

    registerClientConveyorEvents(socket) {
        socket.emit('conveyorState', this.conveyorState || 'stopped');

        socket.on('startConveyor', () => {
            logger.debug('Got message: startConveyor');
            this.conveyor.start();
        });

        socket.on('stopConveyor', () => {
            logger.debug('Got message: stopConveyor');
            this.conveyor.stop();
        });
    }

    registerModeEvents() {
        process.on('jigsawlutioner.modeSwitched', (mode) => {
            this.io.emit('modeSwitched', modeService.getMode());
        });
    }

    registerClientModeEvents(socket) {
        socket.emit('modeSwitched', modeService.getMode());

        socket.on('switchMode', async (mode) => {
            logger.debug('Got message: switchMode', mode);
            await modeService.switchMode(mode);
        });
    }

    registerProjectManagerEvents() {
        process.on('jigsawlutioner.projectSelected', (name) => {
            this.io.emit('projectSelected', projectManager.getCurrentProjectName());
        });
        process.on('jigsawlutioner.projectDeleted', (name) => {
            this.io.emit('projectDeleted', name);
        });
    }

    registerClientProjectManagerEvents(socket) {
        socket.emit('projectSelected', projectManager.getCurrentProjectName());

        socket.on('getProjects', () => {
            logger.debug('Got message: getProjects');
            socket.emit('projectList', projectManager.getProjectNames());
        });

        socket.on('createProject', (name) => {
            logger.debug('Got message: createProject', name);
            try {
                projectManager.createProject(name);
                projectManager.selectProject(name);
            } catch (e) {
                socket.emit('createProjectError', e.toString());
            }
        });

        socket.on('deleteProject', (name) => {
            logger.debug('Got message: deleteProject', name);
            try {
                projectManager.deleteProject(name);
            } catch(e) {}
        });

        socket.on('loadProject', (name) => {
            logger.debug('Got message: loadProject', name);
            try {
                projectManager.selectProject(name);
            } catch(e) {}
        })
    }

    registerStatisticsEvents() {
        process.on('jigsawlutioner.piecesScannedChanged', (piecesCount) => {
            this.piecesScanned = piecesCount;

            this.io.emit('piecesScannedChanged', piecesCount);
        });

        process.on('jigsawlutioner.pieceScanned', (piece) => {
            this.io.emit('pieceScanned', piece);
        });

        process.on('jigsawlutioner.timingStatistics', (statistics) => {
            this.io.emit('timingStatistics', statistics);
        })
    }

    registerClientStatisticsEvents(socket) {
        socket.emit('piecesScannedChanged', this.piecesScanned || 0);
    }

    registerBoardEvents() {
        process.on('jigsawlutioner.boardSelected', (boardIndex) => {
            this.io.emit('boardSelected', boardIndex);
        });
        process.on('jigsawlutioner.boardStatistics', (boardStatistics) => {
            this.io.emit('boardStatistics', boardStatistics);
        });
        process.on('jigsawlutioner.switchBoardAndBox', (takeBox) => {
            this.takeBox = takeBox;
            this.io.emit('switchBoardAndBox', takeBox);
            this.boardSwitching = true;
        });
        process.on('jigsawlutioner.continueAfterBoardSwitch', () => {
            this.io.emit('boardSwitched');
            this.boardSwitching = false;
        });
    }

    registerClientBoardEvents(socket) {
        //TODO adjust when arm is built

        // socket.emit('boardSelected', this.arm.getSelectedBoard());
        // socket.emit('boardStatistics', this.arm.getBoardStatistics());
        // if (this.boardSwitching) {
        //     socket.emit('switchBoardAndBox', this.takeBox);
        // }
        //
        // socket.on('selectNextBoard', async () => {
        //     logger.debug('Got message: nextBoard');
        //     await this.arm.selectNextBoard();
        // });
        // socket.on('boardSwitched', () => {
        //     logger.debug('Got message: boardSwitched');
        //     this.arm.continueAfterSwitch();
        // });
    }
}
