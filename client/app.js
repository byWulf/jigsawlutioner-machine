const socket = io();

$('#scanButton').on('click', () => {
    socket.emit('mode', 'scan');
});
$('#compareButton').on('click', () => {
    socket.emit('mode', 'compare');
});

socket.on('mode', (mode) => {
    console.log("mode", mode);
    if (mode === 'compare') {
        $('#scanButton').removeClass('active');
        $('#compareButton').addClass('active');
    } else {
        $('#scanButton').addClass('active');
        $('#compareButton').removeClass('active');
    }
});

$('#startButton').on('click', () => {
    socket.emit('startMachine');
});

$('#stopButton').on('click', () => {
    socket.emit('stopMachine');
});

socket.on('machineState', (state) => {
    $('#startButton').toggle(!state);
    $('#stopButton').toggle(!!state);
});

const $waitInModal = $('#waitInModal');
socket.on('waitIn', (task, placements) => {
    if (!task) {
        $waitInModal.modal('hide');
        return;
    }

    $waitInModal.find('.modal-body').text(task);

    if (placements) {
        let $board = $('<div class="placementBoard"></div>');
        let highestY = 0;
        let lowestY = 0;
        for (let x in placements) {
            if (!placements.hasOwnProperty(x)) continue;

            for (let y in placements[x]) {
                if (!placements[x].hasOwnProperty(y)) continue;

                $('<div class="piece ' + (placements[x][y].current ? 'current' : '') + ' ' + (placements[x][y].found ? 'found' : '') + '"></div>').css({
                    left: parseInt(x, 10) * 50,
                    top: parseInt(y, 10) * 50
                }).appendTo($board);
                highestY = Math.max(highestY, parseInt(y, 10));
                lowestY = Math.min(lowestY, parseInt(y, 10));
            }
        }
        $board.css({
            marginTop: -lowestY * 50 + 'px',
            height: (highestY + 1) * 50 + 'px'
        });

        $board.appendTo($waitInModal.find('.modal-body'));
    }

    $waitInModal.modal('show');
});

$waitInModal.find('.btn-primary').on('click', () => {
    $waitInModal.modal('hide');
    socket.emit('startMachine');
});