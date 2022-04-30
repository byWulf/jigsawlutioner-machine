<template>
  <div class="row pb-3">
    <div v-for="controller in controllers" class="col-xl-1 col-lg-2 col-md-3 col-sm-4">
      <i v-if="controller.up" class="fa fa-circle text-success"></i>
      <i v-else class="fa fa-circle text-danger"></i>

      <span class="px-1">{{ controller.name }}</span>
    </div>
  </div>
  <button @click="resetConveyor()" class="btn btn-warning">Reset conveyor</button>
  <button @click="takePhoto()" :class="'btn btn-primary ' + (takingPhoto ? 'disabled' : '')">Take photo</button>
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
  data() {
    return {
      project: window.project,
      setsPublicDir: window.setsPublicDir,
      controllers: {},
      currentPiece: null,
      currentPieceIndex: 1,
      takingPhoto: false,
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

    getControllerByName(name) {
      for (let controllerId in this.controllers) {
        if (this.controllers[controllerId].name === name) {
          return this.controllers[controllerId];
        }
      }

      return null;
    },

    async takePhoto() {
      if (this.takingPhoto) {
        return;
      }
      this.takingPhoto = true;

      const controller = this.getControllerByName('scanner');
      if (controller === null) {
        return;
      }

      const topFilename = this.project.id + '/piece' + this.currentPieceIndex + '_color';
      const bottomFilename = this.project.id + '/piece' + this.currentPieceIndex;

      const resultTop = await this.axios.get('/controllers/' + controller.id + '/take-photo/top/bottom/' + topFilename);
      this.imageTopSrc = resultTop.data.src + '?' + Math.random();

      const resultBottom = await this.axios.get('/controllers/' + controller.id + '/take-photo/bottom/top/' + bottomFilename);
      this.imageBottomSrc = resultBottom.data.src + '?' + Math.random();

      await Promise.all([
          this.moveToNextPlate(),
          this.savePiece(this.currentPieceIndex, bottomFilename, topFilename),
      ]);

      this.currentPieceIndex++;
      this.takingPhoto = false;
    },

    async savePiece(pieceIndex, bottomFilename, topFilename) {
      try {
        const result = await this.axios.post('/projects/' + this.project.id + '/pieces/' + pieceIndex, null, {
          params: {
            silhouetteFilename: bottomFilename,
            colorFilename: topFilename,
          }
        });

        this.currentPiece = result.data;
      } catch (error) {
        this.currentPiece = null;
      }
    },

    async resetConveyor() {
      const controller = this.getControllerByName('conveyor');
      if (controller === null) {
        return;
      }

      await this.axios.get('/controllers/' + controller.id + '/call/reset');
    },

    async moveToNextPlate() {
      const controller = this.getControllerByName('conveyor');
      if (controller === null) {
        return;
      }

      await this.axios.get('/controllers/' + controller.id + '/call/move-to-next-plate');
    }
  }
}
</script>

<style scoped>
  img.photo {
    width: 100%;
  }
</style>
