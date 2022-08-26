<template>
  <button @click="resetConveyor()" class="btn btn-warning">Reset conveyor</button>
  <button @click="forward()" :class="'btn btn-success ' + (running ? 'disabled' : '')">Forward one plate</button>
</template>

<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      running: false,
      resetted: false,
    };
  },
  inject: [
    'axios',
  ],
  methods: {
    async resetConveyor() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
      this.resetted = true;
    },

    async forward() {
      if (this.running) {
        return;
      }

      this.running = true;

      if (!this.resetted) {
        await this.resetConveyor();
      }

      this.$root.movePlates(500);
      await this.axios.get('/controllers/' + this.controller.id + '/call/move-to-next-plate');

      await this.$parent.handleStations();

      this.running = false;
    },
  }
}
</script>
