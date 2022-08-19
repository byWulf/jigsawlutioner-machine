<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
  <div v-if="boxCount === null" class="alert alert-danger">
    No boxCount specified. Please add "boxCount=X" (with X as the boxCount) to the list of the parameters of the controller.
  </div>
</template>

<script>
import {getAveragePoint} from "../Service/PointService";

export default {
  props: ['controller', 'project'],
  data() {
    return {
      currentBox: 0,
      boxCount: null,
      movements: 0,
    };
  },
  inject: [
    'axios',
  ],
  created() {
    for (let key in this.controller.parameters) {
      const match = this.controller.parameters[key].match(/^boxCount=(\d+)$/);
      if (match !== null) {
        this.boxCount = parseInt(match[1], 10);
        break;
      }
    }
  },
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
    },
    async handlePlate(plate) {
      const data = await plate.getData();

      if (!data.piece) {
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

        plate.setNotReady('Moving piece to box ' + this.currentBox);

        await this.axios.get('/controllers/' + this.controller.id + '/call/move-to-box', {
          params: {
            box: this.currentBox,
            offset: pieceOffset,
          },
        });
      } catch (error) {
        console.log('SortEqual', error);
        plate.setData('error', 'moving to box failed');
        plate.setReady();
        return;
      }

      try {
        await this.axios.get('/projects/' + this.project.id + '/pieces/' + data.piece.pieceIndex + '/box/' + this.currentBox);
      } catch (error) {
        console.log(error);
        plate.setData('error', 'saving box failed');
      }

      this.movements++;

      if (this.movements > 20) {
        await this.reset();
        this.movements = 0;
        this.currentBox = (this.currentBox + 1) % this.boxCount;
      }

      plate.setData('piece', null);
      plate.setReady();
    },
  }
}
</script>

<style scoped>
</style>
