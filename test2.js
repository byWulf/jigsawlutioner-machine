function foobar(a, cb) {
    return new Promise(async (resolve) => {
        setTimeout(() => {
            resolve();
        }, 5000);
    });
}

(async() => {
    await foobar(1);
    console.log("test");
})();