<template>
  <button @click="reset()" class="btn btn-warning">Reset</button>
  <div v-if="boxCount === null" class="alert alert-danger">
    No boxCount specified. Please add "boxCount=X" (with X as the boxCount) to the list of the parameters of the controller.
  </div>
  <template v-else-if="project.solved">
    <div class="row">
      <div class="col">Select boards:</div>
    </div>
    <div class="row">
      <div v-for="(boardIndexes, boxIndex) in boardToBoxMapping" :class="boards.length <= 8 ? 'col' : (boards.length <= 16 ? 'col-6' : 'col-12')">
        Box {{ boxIndex + 1 }}:
        <div class="btn-group" v-if="boards">
          <button v-for="(board, index) in boards" :class="'btn ' + (boardIndexes.indexOf(index) > -1 ? 'btn-primary active' : 'btn-secondary')" @click="toggleBoardToBox(boxIndex, index)">{{ index + 1}}</button>
        </div>
      </div>
    </div>

  </template>
</template>

<script>
import {getAveragePoint} from "../Service/PointService";

export default {
  props: ['controller', 'project', 'boards'],
  data() {
    return {
      boxCount: null,
      boardToBoxMapping: [],
      movements: 0,
      resetted: false,
    };
  },
  inject: [
    'axios',
  ],
  created() {
    for (let key in this.controller.parameters) {
      const match = this.controller.parameters[key].match(/^boxCount=(\d+)$/);
      if (match !== null) {
        this.boxCount = parseInt(match[1], 10);
        for (let i = 0; i < this.boxCount; i++) {
          this.boardToBoxMapping.push([]);
        }
        break;
      }
    }
  },
  methods: {
    async reset() {
      await this.axios.get('/controllers/' + this.controller.id + '/call/reset');
      this.resetted = true;
    },
    toggleBoardToBox(boxIndex, boardIndex) {
      for (let i = 0; i < this.boardToBoxMapping.length; i++) {
        const arrayIndex = this.boardToBoxMapping[i].indexOf(boardIndex);
        if (arrayIndex > -1) {
          this.boardToBoxMapping[i].splice(arrayIndex, 1);
          if (i === boxIndex) {
            return;
          }
        }
      }

      this.boardToBoxMapping[boxIndex].push(boardIndex);
    },
    async handlePlate(plate) {
      if (!this.resetted) {
        await this.reset();
      }

      const data = await plate.getData();

      if (!data.piece || !data.board) {
        return;
      }

      let boxIndex = null;
      for (let i in this.boardToBoxMapping) {
        if (this.boardToBoxMapping[i].indexOf(data.board.boardIndex) > -1) {
          boxIndex = i;
          break;
        }
      }
      if (boxIndex === null) {
        return;
      }

      try {
        const center = getAveragePoint([
          data.piece.data.sides[0].startPoint,
          data.piece.data.sides[1].startPoint,
          data.piece.data.sides[2].startPoint,
          data.piece.data.sides[3].startPoint,
        ]);

        const photoOffset = center.y / data.piece.data.imageHeight;

        const pieceOffset = (7 /* scannable area length */ / 14 /* plate length */) * ((photoOffset * -2) + 1 /* move range of 0 to 1 to range of 1 to -1 */);

        plate.setNotReady('Moving piece to box ' + (boxIndex + 1));

        await this.axios.get('/controllers/' + this.controller.id + '/call/move-to-box', {
          params: {
            box: boxIndex,
            offset: pieceOffset,
          },
        });
      } catch (error) {
        console.log('SortEqual', error);
        plate.setData('error', 'moving to box failed');
        plate.setReady();
        return;
      }

      try {
        await this.axios.get('/projects/' + this.project.id + '/pieces/' + data.piece.pieceIndex + '/box/' + boxIndex);
      } catch (error) {
        console.log(error);
        plate.setData('error', 'saving box failed');
      }

      this.movements++;

      if (this.movements > 20) {
        await this.reset();
        this.movements = 0;
      }

      plate.setData('piece', null);
      plate.setReady();
    },
  }
}
</script>

<style scoped>
</style>
