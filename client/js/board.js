class Board {
    constructor(socket) {
        this.socket = socket;

        this.selectedBoard = 0;
        this.setBoard(0);
    }

    addEventListeners() {
        this.socket.on('boardSelected', (boardIndex) => {
            this.setBoard(boardIndex);
        });

        this.socket.on('boardStatistics', (boardStatistics) => {
            this.setStatistics(boardStatistics);
        });

        this.socket.on('switchBoardAndBox', (takeBox) => {
            $('#boardSwitchModal').modal('show');
            $('#boardSwitchModal .boxIndex').text(takeBox);
        });

        this.socket.on('boardSwitched', () => {
            $('#boardSwitchModal').modal('hide');
        });

        $('#boardSelectNext').on('click', () => {
            socket.emit('selectNextBoard');
        });

        $('#boardSwitchedButton').on('click', () => {
            socket.emit('boardSwitched');
        });
    };

    setBoard(boardIndex) {
        this.selectedBoard = boardIndex;
        $('#boardSelectedBoard').text(boardIndex + 1);
    };

    setStatistics(statistics) {
        $('#boardStatistics').empty();

        for (let index in statistics) {
            $('<div class="col-6">Board ' + (parseInt(index) + 1) + '</div><div class="col-6">' + statistics[index].placed + ' / ' + statistics[index].count + '</div>').appendTo($('#boardStatistics'));
        }
    }
}