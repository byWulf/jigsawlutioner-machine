<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      setsPublicDir: window.setsPublicDir,
      currentPieceIndex: 1,
      colorImages: false
    }
  },
  created() {
    for (let key in this.controller.parameters) {
      if (this.controller.parameters[key] === 'colorImages=1') {
        this.colorImages = true;
        break;
      }
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
    sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
    handlePlate(plate) {
      return new Promise(async (resolve) => {
        const pieceIndex = this.currentPieceIndex;
        this.currentPieceIndex++;

        plate.setNotReady('Scanning piece...');

        const topFilename = this.project.id + '/piece' + pieceIndex + '_color';
        const bottomFilename = this.project.id + '/piece' + pieceIndex;

        try {
          if (this.colorImages) {
            const resultTop = await this.axios.get('/controllers/' + this.controller.id + '/call/request-photo', {
              params: { 'light[position]': 'top'}
            });

            await this.axios.get('/controllers/' + this.controller.id + '/fetch-photo/' + resultTop.data + '/' + topFilename);
          }

          const resultBottom = await this.axios.get('/controllers/' + this.controller.id + '/call/request-photo', {
            params: { 'light[position]': 'bottom'}
          });

          // Resolve as early as possible
          resolve();

          try {
            await this.axios.get('/controllers/' + this.controller.id + '/fetch-photo/' + resultBottom.data + '/' + bottomFilename);
          } catch (error) {
            plate.setData('piece', null);
            plate.setReady();

            return;
          }

        } catch (error) {
          plate.setData('piece', null);
          plate.setReady();
          resolve();

          return;
        }

        plate.setNotReady('Analyzing piece...');

        try {
          const result = await this.axios.get('/projects/' + this.project.id + '/pieces/' + pieceIndex + '/analyze', {
            params: {
              silhouetteFilename: bottomFilename,
              colorFilename: this.colorImages ? topFilename : bottomFilename,
            }
          });

          plate.setData('piece', result.data);
          this.project.solved = false;
          this.project.pieces.push(result.data);
        } catch (error) {
          plate.setData('piece', null);
        }

        plate.setReady();
      })
    },
  }
}
</script>
