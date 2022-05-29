<template>
  <div v-if="currentPiece" class="row">
    <div class="col-2">
      <h3>Silhouette</h3>
      <img :src="setsPublicDir + '/' + currentPiece.images.silhouette" alt="" class="photo">
    </div>
    <div class="col-2">
      <h3>Color</h3>
      <img :src="setsPublicDir + '/' + currentPiece.images.color" alt="" class="photo">
    </div>
    <div class="col-2">
      <h3>Mask</h3>
      <img :src="setsPublicDir + '/' + currentPiece.images.mask" alt="" class="photo">
    </div>
    <div class="col-2">
      <h3>Transparent</h3>
      <img :src="setsPublicDir + '/' + currentPiece.images.transparent" alt="" class="photo">
    </div>
    <div class="col-2">
      <h3>Trans small</h3>
      <img :src="setsPublicDir + '/' + currentPiece.images.transparentSmall" alt="" class="photo">
    </div>
  </div>
</template>

<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      setsPublicDir: window.setsPublicDir,
      currentPiece: null,
      currentPieceIndex: 1,
    }
  },
  mounted() {
    for (let i in window.project.pieces) {
      const piece = window.project.pieces[i];

      if (piece.pieceIndex >= this.currentPieceIndex) {
        this.currentPieceIndex = piece.pieceIndex + 1;
      }
    }
  },
  inject: [
    'axios',
  ],
  methods: {
    handlePlate(plate) {
      return new Promise(async (resolve) => {
        const pieceIndex = this.currentPieceIndex;
        this.currentPieceIndex++;

        plate.setNotReady();
        this.$forceUpdate();

        const topFilename = this.project.id + '/piece' + pieceIndex + '_color';
        const bottomFilename = this.project.id + '/piece' + pieceIndex;

        try {
          const resultTop = await this.axios.get('/controllers/' + this.controller.id + '/take-photo/top/bottom/' + topFilename);

          const resultBottom = await this.axios.get('/controllers/' + this.controller.id + '/take-photo/bottom/top/' + bottomFilename);
        } catch (error) {
          plate.setData('piece', null);
          plate.setReady();
          this.$forceUpdate();
          resolve();

          return;
        }

        resolve();

        try {
          const result = await this.axios.get('/projects/' + this.project.id + '/pieces/' + pieceIndex + '/analyze', {
            params: {
              silhouetteFilename: bottomFilename,
              colorFilename: topFilename,
            }
          });

          plate.setData('piece', result.data);
        } catch (error) {
          plate.setData('piece', null);
        }

        plate.setReady();
        this.$forceUpdate();
      })
    },
  }
}
</script>

<style scoped>
img.photo {
  width: 100%;
}
</style>
