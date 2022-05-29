<script>
export default {
  props: ['controller', 'project'],
  data() {
    return {
      currentPieceIndex: 0,
    }
  },
  methods: {
    handlePlate(plate) {
      return new Promise(async (resolve) => {
        plate.setNotReady('Scanning piece...');

        await this.$root.sleep(1800, 2200);

        resolve();

        plate.setNotReady('Analyzing piece...');

        await this.$root.sleep(800, 1200);

        plate.setData('piece', window.project.pieces[this.currentPieceIndex]);
        this.currentPieceIndex = (this.currentPieceIndex + 1) % window.project.pieces.length;
        plate.setReady();
      })
    },
  }
}
</script>
