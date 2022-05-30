<template>
  <div v-if="solving">Currently solving... please stand by...</div>
  <div v-else-if="project.solved">Solved! {{ piecesCount }} pieces in {{ groupsCount }} groups.</div>
  <div v-else>Waiting for the solving to start. {{ piecesCount }} pieces.</div>

  <button class="btn btn-primary" v-if="!project.solved && !solving" @click="solve">Start solving</button>
</template>

<script>
export default {
  props: ['controller', 'project'],
  inject: [
    'axios',
  ],
  data() {
    return {
      solving: false,
    };
  },
  computed: {
    piecesCount() {
      return project.pieces.length;
    },
    groupsCount() {
      let count = 0;
      const analyzedGroups = [];
      for (let i in project.pieces) {
        const groupIndex = project.pieces[i].groupIndex;

        if (groupIndex === null) {
          continue;
        }

        if (analyzedGroups.indexOf(groupIndex) > -1) {
          continue;
        }

        analyzedGroups.push(groupIndex);
        count++;
      }

      return count;
    }
  },
  methods: {
    async handlePlate(plate) {
      plate.setNotReady('Solving puzzle...');

      await this.solve();

      plate.setReady();
    },

    async solve() {
      if (this.project.solved) {
        return;
      }

      this.solving = true;
      await this.axios.get('/projects/' + this.project.id + '/solve');

      await this.waitForSolved();
      // TODO: Doesn't work
    },

    waitForSolved() {
      return new Promise((resolve) => {
        const interval = setInterval(async () => {
          try {
            const result = await this.axios.get('/projects/' + this.project.id)
          } catch (error) {
            console.error(error);
            return;
          }

          const project = result.data;

          if (project.solved) {
            clearInterval(interval);

            this.$root.setProject(project);

            resolve();
          }
        }, 5000);
      });
    },
  }
}
</script>

<style scoped>
</style>
