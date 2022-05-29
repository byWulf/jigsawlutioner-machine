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

        const bottomFilename = this.project.id + '/piece_lookup' + pieceIndex;

        try {
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
          // TODO: Find the existing piece and its position in the solution
          // const result = await this.axios.get('/projects/' + this.project.id + '/pieces/recognize' + pieceIndex, {
          //   params: {
          //     filename: bottomFilename,
          //   }
          // });

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
