const net = require('net');
const JsonSocket = require('json-socket');
const brickPi = require('./src/brickpiArm');

const colors = require('colors');
const logger = require('./src/logger').getInstance('Main'.green);

const port = 1201;
const server = net.createServer();
server.listen(port);
logger.info('Server started on Port ' + port);
server.on('connection', (socket) => {
    logger.notice('New client connected');
    socket = new JsonSocket(socket);

    socket.on('message', async (message) => {
        logger.notice('got message', message);
        switch (message.command) {
            case 'reset':
                await brickPi.resetMotors();
                break;
            case 'collect':
                logger.debug("collect start");
                await brickPi.collect(message.data.offset);
                logger.debug("collect end");
                break;
            case 'moveTo':
                logger.debug("moveTo start");
                await brickPi.moveTo(message.data.x);
                logger.debug("moveTo end");
                break;
            case 'place':
                logger.debug("place start");
                await brickPi.place();
                logger.debug("place end");
                break;
            default:
                socket.sendMessage({index: message.index, success: false});
                return;
        }

        logger.notice(message.index + ": done");
        socket.sendMessage({index: message.index, success: true});
    });

    socket.on('error', () => {
        logger.error('Error with client.');
    });

    socket.on('close', () => {
        logger.info('Client closed connection');
    });
});