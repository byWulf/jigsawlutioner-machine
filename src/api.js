const rp = require('request-promise');

function call(resource, postData) {
    return rp({
        method: 'POST',
        uri: 'https://ojaqssmxoi.execute-api.eu-central-1.amazonaws.com/prod/jigsawlutioner/' + resource,
        headers: {
            'x-api-key': 'M6ATl0UUuL1MXc5E4ERYn5iwswNcxF7y8zOMR5Bg'
        },
        body: postData,
        json: true
    });
}

module.exports = {
    call: call
};