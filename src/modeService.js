const logger = require('./logger').getInstance('Mode'.blue);
logger.setLevel(logger.LEVEL_INFO);
const events = require('./events');


function ModeService() {
    this.MODE_SCAN = 'scan';
    this.MODE_PLACE = 'place';

    this.mode = 'scan';

    this.switchMode = async (mode) => {
        this.mode = mode;
        logger.info('=========================');
        logger.info('== Switched to mode ' + mode);
        logger.info('=========================');

        events.dispatch('modeSwitched', mode);

        if (mode === this.MODE_PLACE) {
            await this.recalculatePlacements([]);
        }
    };
    this.getMode = () => {
        return this.mode;
    };


    this.getPlacementsData = async (ignoreMatches) => {
        const api = require('./apiOffline'); //TODO: toggle api with apiOffline
        const photobox = require('./stations/photobox');

        /*if (this.fs.existsSync(this.projectManager.getCurrentProjectFolder() + 'placements')) {
            return JSON.parse(this.fs.readFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', 'utf-8'));
        }*/

        let placements = await api.call('getplacements', {pieces: photobox.pieces, ignoreMatches: ignoreMatches});
        // this.fs.writeFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', JSON.stringify(placements));


        return placements;
    };

    this.recalculatePlacements = async (ignoreMatches) => {
        let placements = await this.getPlacementsData(ignoreMatches);

        events.dispatch('placements', {placements: placements, ignoreMatches: ignoreMatches});
    };
}

module.exports = new ModeService();