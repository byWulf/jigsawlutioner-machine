export default class Plate {
    data = {};

    ready = true;
    action = null;

    index;
    forceUpdate;

    constructor(index, forceUpdate) {
        this.index = index;
        this.forceUpdate = forceUpdate;
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
        this.forceUpdate();
    }

    setNotReady(action) {
        this.ready = false;
        this.action = action;
        this.forceUpdate();
    }

    setReady() {
        this.ready = true;
        this.action = null;
        this.forceUpdate();
    }
}
