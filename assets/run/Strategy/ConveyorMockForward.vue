<template>
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
  beforeUnmount() {
    this.stopping = true;
  },
  methods: {
    async moveConveyor() {
      while (!this.stopping) {
        this.$root.movePlates(500);
        await this.$root.sleep(500);

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
