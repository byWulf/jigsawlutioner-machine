<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
</template>

<script>
import {getAveragePoint} from "../Service/PointService";

export default {
  props: ['controller', 'project'],
  data() {
    return {
      movements: 0,
      resetted: false,
    };
  },
  inject: [
    'axios',
  ],
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
      this.resetted = true;
    },
    handlePlate(plate) {
      return new Promise(async (resolve) => {
        if (!this.resetted) {
          await this.reset();
        }

        const data = await plate.getData();

        if (!data.piece || !data.board) {
          resolve();
          return;
        }

        const x = data.piece.x - data.board.startX;
        const y = data.piece.y - data.board.startY;

        try {
          const center = getAveragePoint([
            data.piece.data.sides[0].startPoint,
            data.piece.data.sides[1].startPoint,
            data.piece.data.sides[2].startPoint,
            data.piece.data.sides[3].startPoint,
          ]);

          const pieceXOffset = ((center.x / data.piece.data.imageWidth) - 0.5) * 6.4 /* scannable area width */;
          const pieceYOffset = (7 /* scannable area length */ / 14 /* plate length */) * (((center.y / data.piece.data.imageHeight) * -2) + 1 /* move range of 0 to 1 to range of 1 to -1 */);

          plate.setNotReady('Placing piece on board to ' + x + '/' + y + '...');

          await this.axios.get('/controllers/' + this.controller.id + '/call/place', {
            params: {
              pieceOffset: -pieceYOffset,
              plateOffset: 2.8 * y,
              boardOffset: 4 + 2.8 * x - pieceXOffset,
            },
          });

          plate.setData('piece', null);
        } catch (error) {
          console.log('PlacerBySequence', error);
          plate.setData('error', 'placing piece failed');
          plate.setReady();
          resolve();
          return;
        }

        this.movements++;

        if (this.movements > 20) {
          await this.reset();
          this.movements = 0;
        }

        plate.setReady();
        resolve();
      });
    },
  }
}
</script>

<style scoped>
</style>
