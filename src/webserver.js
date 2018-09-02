require('colors');

class Webserver {
    constructor() {
        this.logger = require('./logger').getInstance('Webserver'.green);
        this.logger.setLevel(this.logger.LEVEL_INFO);

        this.express = require('express');
        this.started = false;
        this.port = 1301;
        this.boardSwitching = false;

        this.events = require('./events');
        this.conveyor = require('./conveyor');
        this.modeService = require('./modeService');
        this.projectManager = require('./projectManager');
        this.arm = require('./stations/arm');
    }

    start() {
        this.app = this.express();
        this.http = require('http').Server(this.app);

        this.io = require('socket.io')(this.http);

        this.app.use(this.express.static('client'));

        this.app.use('/jquery', this.express.static('node_modules/jquery/dist'));
        this.app.use('/bootstrap', this.express.static('node_modules/bootstrap/dist'));
        this.app.use('/fontawesome', this.express.static('node_modules/font-awesome'));
        this.app.use('/tether', this.express.static('node_modules/tether/dist'));
        this.app.use('/popper', this.express.static('node_modules/popper.js/dist/umd'));
        this.app.use('/animate.css', this.express.static('node_modules/animate.css'));

        this.http.listen(this.port, () => {
            this.logger.info('Webserver started on port ' + this.port);
        });

        this.io.on('connection', (socket) => {
            this.logger.debug('New connection ' + socket.id);

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

        this.started = true;
    }

    registerConveyorEvents() {
        this.events.listen('conveyorStarted', () => {
            this.conveyorState = 'running';

            this.io.emit('conveyorState', this.conveyorState);
        });

        this.events.listen('conveyorStopped', () => {
            this.conveyorState = 'stopped';

            this.io.emit('conveyorState', this.conveyorState);
        });

        this.events.listen('stoppingConveyor', () => {
            this.conveyorState = 'stopping';

            this.io.emit('conveyorState', this.conveyorState);
        });
    }

    registerClientConveyorEvents(socket) {
        socket.emit('conveyorState', this.conveyorState || 'stopped');

        socket.on('startConveyor', () => {
            this.logger.debug('Got message: startConveyor');
            this.conveyor.start();
        });

        socket.on('stopConveyor', () => {
            this.logger.debug('Got message: stopConveyor');
            this.conveyor.stop();
        });
    }

    registerModeEvents() {
        this.events.listen('modeSwitched', (mode) => {
            this.mode = mode;

            this.io.emit('modeSwitched', this.mode);
        });
    }

    registerClientModeEvents(socket) {
        socket.emit('modeSwitched', this.mode || this.modeService.MODE_SCAN);

        socket.on('switchMode', (mode) => {
            this.logger.debug('Got message: switchMode', mode);
            this.modeService.switchMode(mode);
        });
    }

    registerProjectManagerEvents() {
        this.events.listen('projectSelected', (name) => {
            this.projectName = name;

            this.io.emit('projectSelected', this.projectName);
        });
        this.events.listen('projectDeleted', (name) => {
            this.io.emit('projectDeleted', name);
        });
    }

    registerClientProjectManagerEvents(socket) {
        socket.emit('projectSelected', this.projectName || '');

        socket.on('getProjects', () => {
            this.logger.debug('Got message: getProjects');
            socket.emit('projectList', this.projectManager.getProjectNames());
        });

        socket.on('createProject', (name) => {
            this.logger.debug('Got message: createProject', name);
            try {
                this.projectManager.createProject(name);
                this.projectManager.selectProject(name);
            } catch (e) {
                socket.emit('createProjectError', e.toString());
            }
        });

        socket.on('deleteProject', (name) => {
            this.logger.debug('Got message: deleteProject', name);
            try {
                this.projectManager.deleteProject(name);
            } catch(e) {}
        });

        socket.on('loadProject', (name) => {
            this.logger.debug('Got message: loadProject', name);
            try {
                this.projectManager.selectProject(name);
            } catch(e) {}
        })
    }

    registerStatisticsEvents() {
        this.events.listen('piecesScannedChanged', (piecesCount) => {
            this.piecesScanned = piecesCount;

            this.io.emit('piecesScannedChanged', piecesCount);
        });
    }

    registerClientStatisticsEvents(socket) {
        socket.emit('piecesScannedChanged', this.piecesScanned || 0);
    }

    registerBoardEvents() {
        this.events.listen('boardSelected', (boardIndex) => {
            this.io.emit('boardSelected', boardIndex);
        });
        this.events.listen('boardStatistics', (boardStatistics) => {
            this.io.emit('boardStatistics', boardStatistics);
        });
        this.events.listen('switchBoardAndBox', () => {
            this.io.emit('switchBoardAndBox');
            this.boardSwitching = true;
        });
        this.events.listen('continueAfterBoardSwitch', () => {
            this.io.emit('boardSwitched');
            this.boardSwitching = false;
        });
    }

    registerClientBoardEvents(socket) {
        socket.emit('boardSelected', this.arm.getSelectedBoard());
        socket.emit('boardStatistics', this.arm.getBoardStatistics());
        if (this.boardSwitching) {
            socket.emit('switchBoardAndBox');
        }

        socket.on('selectNextBoard', async () => {
            this.logger.debug('Got message: nextBoard');
            await this.arm.selectNextBoard();
        });
        socket.on('boardSwitched', () => {
            this.logger.debug('Got message: boardSwitched');
            this.arm.continueAfterSwitch();
        });
    }
}

module.exports = new Webserver();