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

  <div v-if="project.solved">
    <div class="row">
      <div class="col-3">Current board:</div>
      <div class="col">
        <div class="btn-group">
          <button v-for="(board, index) in boards" :class="'btn ' + (currentBoardIndex === index ? 'btn-primary active' : 'btn-secondary')" @click="currentBoardIndex = index">{{ index + 1}}</button>
        </div>
      </div>
    </div>
  </div>
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

      width: 16,
      height: 8,
      boards: null,
      currentBoardIndex: null,
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

      if (this.boards === null) {
        this.splitIntoBoards();
      }

      plate.setData('board', this.boards[this.currentBoardIndex]);

      plate.setReady();
    },

    async solve() {
      if (this.project.solved) {
        return;
      }

      this.boards = null;
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

      this.boards = [];
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
            this.boards.push({groupIndex: groupIndex, startX: startX, endX: startX + this.width - 1, startY: startY, endY: startY + this.height - 1 });
          }
        }
      }

      this.currentBoardIndex = 0;
    },
  }
}
</script>

<style scoped>
</style>
