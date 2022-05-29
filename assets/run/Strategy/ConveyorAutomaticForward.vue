<template>
  <button @click="resetConveyor()" class="btn btn-warning">Reset conveyor</button>
  <button v-if="!running" @click="start()" class="btn btn-success">Start conveyor</button>
  <button v-else-if="!stopping" @click="stop()" class="btn btn-danger">Stop conveyor</button>
</template>

<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      running: false,
      stopping: false,
    };
  },
  inject: [
    'axios',
  ],
  beforeUnmount() {
    this.stopping = true;
  },
  methods: {
    async resetConveyor() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
    },

    async moveConveyor() {
      while (!this.stopping) {
        await this.axios.get('/controllers/' + this.controller.id + '/call/move-to-next-plate');

        await this.$parent.handleStations();
      }

      this.stopping = false;
      this.running = false;
    },

    start() {
      if (this.running) {
        return;
      }

      this.running = true;
      this.moveConveyor();
    },

    stop() {
      if (!this.running || this.stopping) {
        return;
      }

      this.stopping = true;
    },
  }
}
</script>
