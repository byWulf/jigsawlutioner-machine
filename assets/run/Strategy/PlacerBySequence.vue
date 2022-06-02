<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
</template>

<script>
import {getAveragePoint} from "../Service/PointService";

export default {
  props: ['controller', 'project'],
  data() {
    return {
      x: 0,
      y: 0,
    };
  },
  inject: [
    'axios',
  ],
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
    },
    handlePlate(plate) {
      return new Promise(async (resolve) => {
        const data = await plate.getData();

        if (!data.piece) {
          resolve();
          return;
        }

        try {
          const center = getAveragePoint([
            data.piece.data.sides[0].startPoint,
            data.piece.data.sides[1].startPoint,
            data.piece.data.sides[2].startPoint,
            data.piece.data.sides[3].startPoint,
          ]);

          const photoOffset = center.y / data.piece.data.imageHeight;

          const pieceOffset = (7 /* scannable area length */ / 14 /* plate length */) * ((photoOffset * -2) + 1 /* move range of 0 to 1 to range of 1 to -1 */);

          plate.setNotReady('Placing piece on board to ' + this.x + '/' + this.y + '...');

          await this.axios.get('/controllers/' + this.controller.id + '/call/place', {
            params: {
              pieceOffset: -pieceOffset,
              plateOffset: 4 * this.y,
              boardOffset: 4 * this.x, // TODO: Add horizontal piece offset
            },
          });

          resolve();
        } catch (error) {
          console.log('PlacerBySequence', error);
          plate.setData('error', 'placing piece failed');
          plate.setReady();
          resolve();
          return;
        }

        if (this.y >= 5) {
          this.x++;
          this.y = 0;
        } else {
          this.y++;
        }
      });
    },
  }
}
</script>

<style scoped>
</style>
