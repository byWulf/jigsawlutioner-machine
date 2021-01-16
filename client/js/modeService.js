class ModeService {
    constructor(socket) {
        this.MODE_SCAN = 'scan';
        this.MODE_PLACE = 'place';

        this.socket = socket;
        this.placements = null;
        this.ignoreMatches = null;
    }

    addEventListeners() {
        $('input[name="modeRadio"]').on('change', (event) => {
            const newValue = $(event.currentTarget).attr('value');

            if (newValue === this.mode) {
                return;
            }

            this.socket.emit('switchMode', newValue);
        });

        this.socket.on('modeSwitched', (mode) => {
            this.switchMode(mode);
        });
    };

    switchMode(mode) {
        this.mode = mode;

        $('#mode-' + mode).closest('.btn').button('toggle');

        $('.hideOnMode-' + mode).hide();
        $('.showOnMode-' + mode).show();
    };

    getMode() {
        return this.mode;
    }
}
