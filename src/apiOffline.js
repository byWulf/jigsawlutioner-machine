const Jigsawlutioner = require('jigsawlutioner');
const logger = require('./logger').getInstance('API'.white);
logger.setLevel(logger.LEVEL_NOTICE);

const endpoints = {
    parseimage: async (postData) => {
        let borderData = await Jigsawlutioner.BorderFinder.findPieceBorder(Buffer.from(postData.imageData, 'base64'), {
            threshold: postData.threshold || 225,
            reduction: postData.reduction || 2,
            returnTransparentImage: !!postData.returnTransparentImage
        });
        let sideData = await Jigsawlutioner.SideFinder.findSides(postData.pieceIndex, borderData.path);

        return Jigsawlutioner.PieceHelper.getLimitedPiece(borderData, sideData);
    },

    findexistingpieceindex: async (postData) => {
        return Jigsawlutioner.Matcher.findExistingPieceIndex(postData.pieces, postData.piece);
    },

    getplacements: async (postData) => {
        return Jigsawlutioner.Matcher.getPlacements(postData.pieces, null, {
            ignoreMatches: postData.ignoreMatches
        });
    }
};

/**
 * @param resource
 * @param postData
 * @returns {*}
 */
module.exports.call = async (resource, postData) => {
    const data = JSON.parse(JSON.stringify(postData));
    logger.debug('Sending data for endpoint ' + resource);

    const result = await endpoints[resource](data);

    const parsedResult = JSON.parse(JSON.stringify(result));
    logger.debug('Got response for endpoint ' + resource + ':', parsedResult);

    return parsedResult;
};