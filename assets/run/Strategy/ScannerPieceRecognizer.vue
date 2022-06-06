<script>
export default {
  props: ['controller', 'project', 'boards'],
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

        if (!this.project.solved) {
          plate.setData('error', 'Project must be solved, but wasn\'t.');
          resolve();
          return;
        }

        plate.setNotReady('Scanning piece...');

        const filename = this.project.id + '/piece_lookup' + pieceIndex;

        try {
          await this.axios.get('/controllers/' + this.controller.id + '/take-photo/bottom/bottom/' + filename);
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

          for (let i in this.boards) {
            const board = this.boards[i];

            if (
                result.data.groupIndex === board.groupIndex &&
                result.data.x >= board.startX &&
                result.data.x <= board.endX &&
                result.data.y >= board.startY &&
                result.data.y <= board.endY
            ) {
              plate.setData('board', board);
            }
          }
        } catch (error) {
          plate.setData('piece', null);
        }

        plate.setReady();
      })
    },
  }
}
</script>
