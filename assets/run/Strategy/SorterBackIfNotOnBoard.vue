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
    };
  },
  inject: [
    'axios',
  ],
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
    },
    async handlePlate(plate) {
      const data = await plate.getData();

      if (!data.piece || !data.board) {
        return;
      }

      if (data.piece.box === null) {
        return;
      }

      if (
          data.piece.groupIndex === data.board.groupIndex &&
          data.piece.x >= data.board.startX &&
          data.piece.x <= data.board.endX &&
          data.piece.y >= data.board.startY &&
          data.piece.y <= data.board.endY
      ) {
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

        plate.setNotReady('Moving piece back to box ' + data.piece.box);

        await this.axios.get('/controllers/' + this.controller.id + '/call/move-to-box', {
          params: {
            box: data.piece.box,
            offset: pieceOffset,
          },
        });
      } catch (error) {
        console.log('SortEqual', error);
        plate.setData('error', 'moving to box failed');
        plate.setReady();
        return;
      }

      this.movements++;

      if (this.movements > 20) {
        await this.reset();
        this.movements = 0;
      }

      plate.setData('piece', null);
      plate.setReady();
    },
  }
}
</script>

<style scoped>
</style>
