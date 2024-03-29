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
  props: ['controller', 'project', 'boards'],
  inject: [
    'axios',
  ],
  data() {
    return {
      solving: false,
      timeout: null,

      width: 20,
      height: 10,
    };
  },
  computed: {
    piecesCount() {
      return this.project.pieces.length;
    },
    groupsCount() {
      let count = 0;
      const analyzedGroups = [];
      for (let i in this.project.pieces) {
        const groupIndex = this.project.pieces[i].groupIndex;

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
  mounted() {
    if (this.project.solved) {
      this.splitIntoBoards();
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
        this.splitIntoBoards();
        return;
      }

      this.$root.setBoards([]);
      this.solving = true;
      await this.axios.get('/projects/' + this.project.id + '/solve');

      await this.checkForSolved();

      this.splitIntoBoards();
    },

    async checkForSolved() {
      try {
        const result = await this.axios.get('/projects/' + this.project.id + '/solution-status');

        this.project.solved = result.data.solved;
        this.project.solvingStatus = result.data.solvingStatus;
        this.project.solvedGroups = result.data.solvedGroups;
        this.project.biggestGroup = result.data.biggestGroup;

        if (project.solved) {
          clearInterval(this.interval);
          this.interval = null;

          const result = await this.axios.get('/projects/' + this.project.id);
          this.$root.setProject(result.data);
          this.$forceUpdate();

          this.solving = false;

          return;
        }
      } catch (error) {
        console.error(error);
      }

      // Check again after 1 second
      await this.$root.sleep(1000);
      await this.checkForSolved();
    },

    splitIntoBoards() {
      const groupIndexes = [];
      for (let i in this.project.pieces) {
        const piece = this.project.pieces[i];
        if (groupIndexes.indexOf(piece.groupIndex) > -1) {
          continue;
        }

        groupIndexes.push(piece.groupIndex);
      }

      const boards = [];
      for (let j = 0; j < groupIndexes.length; j++) {
        const groupIndex = groupIndexes[j];

        let minX = null;
        let maxX = null;
        let minY = null;
        let maxY = null;
        for (let i in this.project.pieces) {
          const piece = this.project.pieces[i];
          if (piece.groupIndex !== groupIndex) {
            continue;
          }

          minX = minX === null || piece.x < minX ? piece.x : minX;
          maxX = maxX === null || piece.x > maxX ? piece.x : maxX;
          minY = minY === null || piece.y < minY ? piece.y : minY;
          maxY = maxY === null || piece.y > maxY ? piece.y : maxY;
        }

        for (let startX = minX; startX <= maxX; startX += this.width) {
          for (let startY = minY; startY <= maxY; startY += this.height) {
            boards.push({boardIndex: boards.length, groupIndex: groupIndex, startX: startX, endX: startX + this.width - 1, startY: startY, endY: startY + this.height - 1 });
          }
        }
      }

      this.$root.setBoards(boards);
    },
  }
}
</script>

<style scoped>
</style>
