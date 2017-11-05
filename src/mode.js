function Mode() {
    this.mode = 'scan';

    this.switchMode = (mode) => {
        this.mode = mode;
    };
    this.getMode = () => {
        return this.mode;
    };
}

module.exports = new Mode();