<template>
  <div v-if="solving">
    <div class="row">
      <div class="col">
        Solving: {{ project.solvingStatus }}
      </div>
    </div>
    <div class="row">
      <div class="col-2">Groups:</div>
      <div class="col">
        <div class="progress">
          <div class="progress-bar" role="progressbar" :style="{width: (project.solvedGroups / piecesCount * 100) + '%'}" :aria-valuenow="project.solvedGroups" aria-valuemin="0" :aria-valuemax="piecesCount">
            {{ project.solvedGroups }} / {{ piecesCount }}
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-2">Biggest group:</div>
      <div class="col">
        <div class="progress">
          <div class="progress-bar" role="progressbar" :style="{width: (project.biggestGroup / piecesCount * 100) + '%'}" :aria-valuenow="project.biggestGroup" aria-valuemin="0" :aria-valuemax="piecesCount">
            {{ project.biggestGroup }} / {{ piecesCount }}
          </div>
        </div>
      </div>
    </div>
  </div>
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
      timeout: null,
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
  beforeUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
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

      await this.checkForSolved();
    },

    async checkForSolved() {
      try {
        const result = await this.axios.get('/projects/' + this.project.id);

        const project = result.data;
        this.$root.setProject(project);

        if (project.solved) {
          clearInterval(this.interval);
          this.interval = null;

          this.solving = false;

          return;
        }
      } catch (error) {
        console.error(error);
      }

      // Check again after 1 second
      await this.$root.sleep(1000);
      await this.checkForSolved();
    }
  }
}
</script>

<style scoped>
</style>
