require('colors');

const Station = require('./station');

class Solver extends Station {
    constructor() {
        super();

        this.logger = require('../logger').getInstance('Station'.cyan + ' Solver'.blue);
        //this.logger.setLevel(this.logger.LEVEL_DEBUG);
        this.modeService = require('../modeService');
        this.projectManager = require('../projectManager');
        this.fs = require('fs');

        this.placements = null;
        this.resolve = null;
    }

    async execute(plate) {
        //If we are in scan mode, invalidate placements file and reset placements variable
        if (this.modeService.getMode() !== this.modeService.MODE_PLACE) {
            if (this.fs.existsSync(this.projectManager.getCurrentProjectFolder() + 'placements')) {
                this.fs.unlinkSync(this.projectManager.getCurrentProjectFolder() + 'placements')
            }

            this.placements = null;
            this.setReady();
            return;
        }

        //If we have a placements file, read from it
        if (!this.placements && this.fs.existsSync(this.projectManager.getCurrentProjectFolder() + 'placements')) {
            this.placements = JSON.parse(this.fs.readFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', 'utf-8'));
        //If we dont have a placements file yet, let the user fix the placements
        } else if (!this.placements) {
            this.placements = await this.getPlacementsFromUser([]);
        }

        plate.setData('placements', this.placements);
        this.setReady();
    }

    getPlacementsFromUser (ignoreMatches) {
        return new Promise(async (resolve) => {
            await this.calculatePlacements([]);

            this.resolve = resolve;
        });
    };

    async calculatePlacements(ignoreMatches) {
        const api = require('../apiOffline'); //TODO: toggle api with apiOffline
        const photobox = require('./photobox');
        const events = require('../events');

        events.dispatch('calculatingPlacements');
        this.placements = await api.call('getplacements', {pieces: photobox.pieces, ignoreMatches: ignoreMatches});
        events.dispatch('placements', {placements: this.placements, ignoreMatches: ignoreMatches});
    }

    finishPlacementCorrection() {
        this.fs.writeFileSync(this.projectManager.getCurrentProjectFolder() + 'placements', JSON.stringify(this.placements));

        this.resolve(this.placements);
    }
}

module.exports = new Solver();