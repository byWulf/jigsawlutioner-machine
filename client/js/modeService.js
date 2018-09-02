class ModeService {
    constructor(socket) {
        this.MODE_SCAN = 'scan';
        this.MODE_PLACE = 'place';

        this.socket = socket;
    }

    addEventListeners() {
        $('#mode-scan').on('change', () => {
            this.socket.emit('switchMode', 'scan');
        });
        $('#mode-place').on('change', () => {
            this.socket.emit('switchMode', 'place');
        });

        this.socket.on('modeSwitched', (mode) => {
            this.switchMode(mode);
        });
    };

    switchMode(mode) {
        this.mode = mode;

        $('input[name="modeRadio"]').val(mode).closest('label').removeClass('active');

        $('#mode-' + mode).closest('label').addClass('active');

        $('.hideOnMode-' + mode).hide();
        $('.showOnMode-' + mode).show();
    };

    getMode() {
        return this.mode;
    }
}