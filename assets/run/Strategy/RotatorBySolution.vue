<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
</template>

<script>
import {getAverageRotation} from "../Service/PointService";

export default {
  props: ['controller', 'project'],
  inject: [
    'axios',
  ],
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
    },
    async handlePlate(plate) {
      const data = await plate.getData();

      if (!data.piece) {
        return;
      }

      const sides = data.piece.data.sides;

      const rotation = getAverageRotation(sides[0].startPoint, sides[1].startPoint, sides[2].startPoint, sides[3].startPoint);

      // TODO: add rotation to bring correct side up

      plate.setNotReady('Rotating piece by ' + Math.round(rotation) + '°...');

      try {
        await this.axios.get('/controllers/' + this.controller.id + '/call/rotate', {
          params: {
            degree: -rotation,
          },
        });
      } catch (error) {
        plate.setData('error', 'rotation failed');
      }

      // TODO: Recalculate bounding box of piece

      plate.setReady();
    },
  }
}
</script>

<style scoped>
</style>
