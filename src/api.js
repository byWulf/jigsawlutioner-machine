const rp = require('request-promise');
const fs = require('fs');

/**
 * @param {string} resource
 * @param {*} postData
 * @return {Promise<*>}
 */
module.exports.call = function(resource, postData) {
    if (resource === 'getplacements') fs.writeFileSync(__dirname + '/../getplacements.json',JSON.stringify(postData));

    return rp({
        method: 'POST',
        uri: 'https://ojaqssmxoi.execute-api.eu-central-1.amazonaws.com/prod/jigsawlutioner/' + resource,
        headers: {
            'x-api-key': 'M6ATl0UUuL1MXc5E4ERYn5iwswNcxF7y8zOMR5Bg'
        },
        body: postData,
        json: true
    });
};