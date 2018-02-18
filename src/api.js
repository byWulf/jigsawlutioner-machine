const rp = require('request-promise');

let key = null;
function getKey() {
    if (key === null) {
        let filename = __dirname + '/../apiKey';

        const fs = require('fs');
        if (!fs.existsSync(filename)) {
            throw new Error('No apiKey file found. Please create a file called "apiKey" and place it in your root dir. Fill it just with the api key.');
        }

        key = fs.readFileSync(filename, 'utf-8');
    }

    return key;
}

/**
 * @param {string} resource
 * @param {*} postData
 * @return {Promise<*>}
 */
module.exports.call = function(resource, postData) {
    return rp({
        method: 'POST',
        uri: 'https://ojaqssmxoi.execute-api.eu-central-1.amazonaws.com/prod/jigsawlutioner/' + resource,
        headers: {
            'x-api-key': getKey()
        },
        body: postData,
        json: true
    });
};