const net = require('net');
const JsonSocket = require('json-socket');

const port = 1201;
const host = '192.168.0.36'; //jigsawlutioner-arm

const colors = require('colors');
const logger = require('./logger').getInstance('ArmClient'.yellow);

function ArmClient() {
    this.socket = null;
    this.isConnected = false;
    this.connecting = false;
    this._index = 0;
    this._answers = {};

    this.waitForConnect = () => {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.isConnected) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    };

    this.connect = () => {
        if (this.isConnected) return;
        if (this.connecting) {
            return this.waitForConnect();
        }

        this.connecting = true;

        return new Promise((resolve) => {
            this.socket = new JsonSocket(new net.Socket());
            this.socket.connect(port, host);
            this.socket.on('connect', () => {
                this.socket.on('message', (message) => {
                    this._answers[message.index] = message;
                });
                this.socket.on('error', () => {
                    logger.error('Connection error.');
                });
                this.socket.on('close', () => {
                    logger.error('Server closed connection.');
                });

                this.isConnected = true;

                resolve();
            });
        });
    };

    this._sendCommand = (command, additionalData) => {
        logger.debug("sending command");
        return new Promise(async (resolve) => {
            if (!this.isConnected) {
                logger.debug("connecting");
                await this.connect();
                logger.debug("connected");
            }

            let index = this._index++;
            logger.debug("sending message", {index: index, command: command, data: additionalData});
            this.socket.sendMessage({index: index, command: command, data: additionalData});
            logger.debug("message sent.");

            let timeoutFunction = () => {
                logger.debug("waiting for answer " + index);
                if (typeof this._answers[index] !== 'undefined') {
                    logger.debug("got answer. resolving");

                    let answer = this._answers[index];
                    delete this._answers[index];

                    resolve(answer);
                } else {
                    setTimeout(timeoutFunction, 100);
                }
            };

            setTimeout(timeoutFunction, 100);
        });
    };

    this.reset = () => {
        return this._sendCommand('reset');
    };

    this.collect = (offset) => {
        return this._sendCommand('collect', {offset: offset});
    };

    this.moveTo = (x) => {
        return this._sendCommand('moveTo', {x: x});
    };

    this.place = () => {
        return this._sendCommand('place');
    };
}

module.exports = new ArmClient();