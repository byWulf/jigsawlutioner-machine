require('colors');

class Webserver {
    constructor() {
        this.logger = require('./logger').getInstance('Webserver'.green);
        this.logger.setLevel(this.logger.LEVEL_INFO);

        this.express = require('express');
        this.started = false;
        this.port = 1301;

        this.events = require('./events');
        this.conveyor = require('./conveyor');
        this.modeService = require('./modeService');
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
        });

        this.registerConveyorEvents();
        this.registerModeEvents();

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
            this.conveyor.start();
        });

        socket.on('stopConveyor', () => {
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
            this.modeService.switchMode(mode);
        });
    }
}

module.exports = new Webserver();