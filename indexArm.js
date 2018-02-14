require('colors');

const net = require('net');
const JsonSocket = require('json-socket');
const brickPi = require('./src/brickpiArm');

const logger = require('./src/logger').getInstance('Main'.green);

const port = 1201;
const server = net.createServer();
server.listen(port);
logger.info('Server started on Port ' + port);
server.on('connection', (socket) => {
    logger.notice('New client connected');
    socket = new JsonSocket(socket);

    // noinspection JSUnresolvedFunction
    socket.on('message', async (message) => {
        logger.notice('got message', message);
        switch (message.command) {
            case 'reset':
                await brickPi.resetMotors();
                break;

            case 'standby':
                await brickPi.standby();
                break;

            case 'collect':
                await brickPi.collect(message.data.offset);
                break;

            case 'moveToPlatform':
                await brickPi.moveToPlatform();
                break;

            case 'moveToTrash':
                await brickPi.moveToTrash();
                break;

            case 'moveTo':
                await brickPi.moveTo(message.data.x);
                break;

            case 'place':
                await brickPi.place();
                break;

            default:
                // noinspection JSUnresolvedFunction
                socket.sendMessage({index: message.index, success: false});
                return;
        }

        logger.notice(message.index + ": done");
        // noinspection JSUnresolvedFunction
        socket.sendMessage({index: message.index, success: true});
    });

    // noinspection JSUnresolvedFunction
    socket.on('error', () => {
        logger.error('Error with client.');
    });

    // noinspection JSUnresolvedFunction
    socket.on('close', () => {
        logger.info('Client closed connection');
    });
});