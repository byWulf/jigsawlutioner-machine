class Statistics {
    constructor(socket) {
        this.socket = socket;

        this.setCount(0);
    }

    addEventListeners() {
        this.socket.on('piecesScannedChanged', (count) => {
            this.setCount(count);
        });
    };

    setCount(count) {
        $('#statisticsPiecesScanned').text(count);
    };
}