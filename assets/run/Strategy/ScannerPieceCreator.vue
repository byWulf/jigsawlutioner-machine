<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      setsPublicDir: window.setsPublicDir,
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

        plate.setNotReady('Scanning piece...');

        const topFilename = this.project.id + '/piece' + pieceIndex + '_color';
        const bottomFilename = this.project.id + '/piece' + pieceIndex;

        try {
          const resultTop = await this.axios.get('/controllers/' + this.controller.id + '/take-photo/top/bottom/' + topFilename);

          const resultBottom = await this.axios.get('/controllers/' + this.controller.id + '/take-photo/bottom/top/' + bottomFilename);
        } catch (error) {
          plate.setData('piece', null);
          plate.setReady();
          resolve();

          return;
        }

        resolve();

        plate.setNotReady('Analyzing piece...');

        try {
          const result = await this.axios.get('/projects/' + this.project.id + '/pieces/' + pieceIndex + '/analyze', {
            params: {
              silhouetteFilename: bottomFilename,
              colorFilename: topFilename,
            }
          });

          plate.setData('piece', result.data);
          this.project.solved = false;
        } catch (error) {
          plate.setData('piece', null);
        }

        plate.setReady();
      })
    },
  }
}
</script>
