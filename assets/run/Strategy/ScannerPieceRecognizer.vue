<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      setsPublicDir: window.setsPublicDir,
      currentPieceIndex: 1,
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

        const filename = this.project.id + '/piece_lookup' + pieceIndex;

        try {
          await this.axios.get('/controllers/' + this.controller.id + '/take-photo/bottom/top/' + filename);
        } catch (error) {
          plate.setData('piece', null);
          plate.setReady();
          resolve();

          return;
        }

        resolve();

        plate.setNotReady('Analyzing piece...');

        try {
          const result = await this.axios.get('/projects/' + this.project.id + '/pieces/recognize', {
            params: {
              silhouetteFilename: filename,
            }
          });

          plate.setData('piece', result.data);
        } catch (error) {
          plate.setData('piece', null);
        }

        plate.setReady();
      })
    },
  }
}
</script>
