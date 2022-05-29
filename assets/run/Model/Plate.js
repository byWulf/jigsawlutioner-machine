export default class Plate {
    data = {};

    ready = true;

    index;

    constructor(index) {
        this.index = index;
    }

    getData() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve(this.data);
                }
            }, 25);
        });
    }

    setData(key, value) {
        this.data[key] = value;
    }

    setNotReady() {
        this.ready = false;
    }

    setReady() {
        this.ready = true;
    }
}
