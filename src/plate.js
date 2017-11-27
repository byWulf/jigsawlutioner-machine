function Plate() {
    this.data = {};
    this.ready = true;

    this.getData = () => {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this.data);
                }
            }, 100);
        });
    };

    this.setData = (key, value) => {
        this.data[key] = value;
    };

    this.setNotReady = () => {
        this.ready = false;
    };

    this.setReady = () =>{
        this.ready = true;
    };
}

module.exports = Plate;