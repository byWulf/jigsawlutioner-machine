const rp = require('request-promise');

/**
 * Toggle this, if the API is not available (offline or new features)
 *
 * @type {boolean}
 */
const offline = true;

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

const offlineEndpoints = {
    parseimage: async (postData) => {
        const Jigsawlutioner = require('jigsawlutioner');

        let borderData = await Jigsawlutioner.BorderFinder.findPieceBorder(Buffer.from(postData.imageData, 'base64'), {
            threshold: postData.threshold || 225,
            reduction: postData.reduction || 2,
            returnTransparentImage: !!postData.returnTransparentImage
        });
        let sideData = await Jigsawlutioner.SideFinder.findSides(postData.pieceIndex, borderData.path);

        return Jigsawlutioner.PieceHelper.getLimitedPiece(borderData, sideData);
    },

    findexistingpieceindex: async (postData) => {
        const Jigsawlutioner = require('jigsawlutioner');

        return Jigsawlutioner.Matcher.findExistingPieceIndex(postData.pieces, postData.piece);
    },

    getplacements: async (postData) => {
        const Jigsawlutioner = require('jigsawlutioner');

        return Jigsawlutioner.Matcher.getPlacements(postData.pieces, null, {
            ignoreMatches: postData.ignoreMatches
        });
    }
};

/**
 * @param {string} resource
 * @param {*} postData
 * @return {Promise<*>}
 */
module.exports.call = function(resource, postData) {
    if (offline) {
        return new Promise(async (resolve) => {
            const result = await offlineEndpoints[resource](JSON.parse(JSON.stringify(postData)));
            resolve(JSON.parse(JSON.stringify(result)));
        });
    }

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