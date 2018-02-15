class Conveyor {
    constructor(socket) {
        this.STATE_RUNNING = 'running';
        this.STATE_STOPPED = 'stopped';

        this.socket = socket;

        this.setState(this.STATE_STOPPED);
    }

    addEventListeners() {
        $('#conveyorStartButton').on('click', () => {
            if ($(this).hasClass('disabled')) return;
            $(this).addClass('disabled');

            this.socket.emit('startConveyor');
        });
        $('#conveyorStopButton').on('click', () => {
            if ($(this).hasClass('disabled')) return;
            $(this).addClass('disabled');

            this.socket.emit('stopConveyor');
        });

        this.socket.on('conveyorState', (state) => {
            this.setState(state);
        });
    };

    setState(state) {
        $("[class^='conveyor-state-'],[class*=' conveyor-state-']").hide();

        this.state = state;

        $('.conveyor-state-' + state).show();
    };
}