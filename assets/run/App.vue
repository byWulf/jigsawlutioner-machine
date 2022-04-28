<script>
import { inject } from 'vue';

export default {
  data() {
    return {
      resetRunning: false,
      controllers: window.controllers,
    }
  },
  inject: [
      'axios',
  ],
  methods: {
    async isUp(controller) {
      console.log(await this.axios.get(controller.baseUri + '/up'));
    },
    async reset() {
      if (this.resetRunning) {
        return;
      }

      this.resetRunning = true;

      await this.axios.get('http://192.168.0.108:3000/reset?motor[port]=D&sensor[pin]=4&additionalForward=105');

      this.resetRunning = false;
    }
  }
}
</script>

<template>
  <div v-for="controller in controllers">
    <span>{{ controller.name }}</span>
    <i v-if="isUp(controller)" class="fa fa-circle text-success"></i>
    <i v-else class="fa fa-circle text-danger"></i>
  </div>
  <button :class="'btn btn-warning ' + (resetRunning ? 'disabled ' : '')" @click="reset()">Reset motors</button>
</template>

<style scoped>
</style>
