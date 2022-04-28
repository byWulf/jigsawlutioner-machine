<template>
  <div class="row pb-3">
    <div v-for="controller in controllers" class="col-xl-1 col-lg-2 col-md-3 col-sm-4">
      <i v-if="controller.up" class="fa fa-circle text-success"></i>
      <i v-else class="fa fa-circle text-danger"></i>

      <span class="px-1">{{ controller.name }}</span>
    </div>
  </div>
  <button :class="'btn btn-warning ' + (resetRunning ? 'disabled ' : '')" @click="reset()">Reset motors</button>
  <button @click="takeImage('top')">Bild (Oberbeleuchtung)</button>
  <button @click="takeImage('bottom')">Bild (Unterbeleuchtung)</button>
  <img :src="imageData" alt="">
</template>

<script>
import base64 from 'base64-js';

export default {
  data() {
    return {
      resetRunning: false,
      controllers: {},
      imageData: '',
    }
  },
  mounted() {
    for (let i in window.controllers) {
      window.controllers[i].up = false;
      this.controllers[window.controllers[i].id] = window.controllers[i];
    }

    this.checkControllerUp();
  },
  inject: [
      'axios',
  ],
  methods: {
    async checkControllerUp() {
      const result = await this.axios.get('/controllers/up');

      for (let controllerId in result.data) {
        this.controllers[controllerId].up = result.data[controllerId];
      }

      this.$forceUpdate();

      setTimeout(() => this.checkControllerUp(), 5000);
    },
    async reset() {
      if (this.resetRunning) {
        return;
      }

      this.resetRunning = true;

      //await this.axios.get('/controllers/{id}/call/{path}''/reset?motor[port]=D&sensor[pin]=4&additionalForward=105');

      this.resetRunning = false;
    },

    getControllerByName(name) {
      for (let controllerId in this.controllers) {
        if (this.controllers[controllerId].name === name) {
          return this.controllers[controllerId];
        }
      }

      return null;
    },

    async takeImage(lightPosition) {
      const controller = this.getControllerByName('scanner');
      if (controller === null) {
        return;
      }

      const result = await this.axios.get('/controllers/' + controller.id + '/call/take-photo', {
        params: {'light[position]': lightPosition},
      });

      this.imageData = 'data:image/jpg;base64,' + base64.fromByteArray(result.data);
    }
  }
}
</script>

<style scoped>
</style>
