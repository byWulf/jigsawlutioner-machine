class FsHelper {
    constructor() {
        this.fs = require('fs');
    }

    deleteFolderRecursive(path) {
        if (this.fs.existsSync(path)) {
            this.fs.readdirSync(path).forEach((file) => {
                let curPath = path + '/' + file;
                if (this.fs.lstatSync(curPath).isDirectory()) {
                    this.deleteFolderRecursive(curPath);
                } else {
                    this.fs.unlinkSync(curPath);
                }
            });
            this.fs.rmdirSync(path);
        }
    }
}

module.exports = new FsHelper();