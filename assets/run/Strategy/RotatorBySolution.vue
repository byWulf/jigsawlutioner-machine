<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
</template>

<script>
import { getAverageRotation, rotatePoint } from '../Service/PointService';

export default {
  props: ['controller', 'project'],
  data() {
    return {
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
    async handlePlate(plate) {
      if (!this.resetted) {
        await this.reset();
      }

      const data = await plate.getData();

      if (!data.piece) {
        return;
      }

      const sides = data.piece.data.sides;

      const rotation = -getAverageRotation(sides[0].startPoint, sides[1].startPoint, sides[2].startPoint, sides[3].startPoint) + (data.piece.topSide + 1) * 90; // TODO: Check for correct +/-

      plate.setNotReady('Rotating piece by ' + Math.round(rotation) + '°...');

      try {
        await this.axios.get('/controllers/' + this.controller.id + '/call/rotate', {
          params: {
            degree: rotation,
          },
        });

        const centerPoint = {x: data.piece.data.imageWidth / 2, y: data.piece.data.imageHeight / 2};
        for (let i in sides) {
          sides[i].startPoint = rotatePoint(centerPoint, sides[i].startPoint, -rotation);
          sides[i].endPoint = rotatePoint(centerPoint, sides[i].endPoint, -rotation);
        }

        plate.setData('rotation', rotation);
      } catch (error) {
        plate.setData('error', 'rotation failed');
      }

      plate.setReady();
    },
  }
}
</script>

<style scoped>
</style>
