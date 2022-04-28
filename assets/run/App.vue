<template>
  <div class="row pb-3">
    <div v-for="controller in controllers" class="col-xl-1 col-lg-2 col-md-3 col-sm-4">
      <i v-if="controller.up" class="fa fa-circle text-success"></i>
      <i v-else class="fa fa-circle text-danger"></i>

      <span class="px-1">{{ controller.name }}</span>
    </div>
  </div>
  <button :class="'btn btn-warning ' + (resetRunning ? 'disabled ' : '')" @click="reset()">Reset motors</button>
</template>

<script>
export default {
  data() {
    return {
      resetRunning: false,
      controllers: {},
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
    }
  }
}
</script>

<style scoped>
</style>
