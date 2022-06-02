<template>
  <div class="col-2 plate">
    <template v-if="plate">
      <div class="index">
        #{{ plate.index }}
      </div>
      <div class="row">
        <div class="col-2 plate-image">
          <img v-if="plate.data.piece" :src="setsPublicDir + '/' + plate.data.piece.images.transparentSmall">
        </div>
        <div class="col pt-2">
          <div class="row" v-if="plate.action">
            <div class="col">
              <i class="fa fa-spinner fa-spin"></i>
              {{ plate.action }}
            </div>
          </div>
          <template v-if="plate.data.piece">
            <div class="row">
              <div class="col">
                <strong>PieceIndex:</strong> {{ plate.data.piece.data.index }}
              </div>
            </div>
            <div class="row" v-if="plate.data.piece.groupIndex">
              <div class="col">
                <strong>Position:</strong> Group {{ plate.data.piece.groupIndex }}, {{ plate.data.piece.x }}/{{ plate.data.piece.y}} (Top side: {{ plate.data.piece.topSide }})
              </div>
            </div>
          </template>
          <template v-if="plate.data.error">
            <div class="row">
              <div class="col">
                <strong class="text-danger">{{ plate.data.error }}</strong>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  props: ['plate'],
  data() {
    return {
      setsPublicDir: window.setsPublicDir,
    };
  },
}
</script>

<style scoped>
  .plate {
    height: 100px;
    width: 400px;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-shadow: inset 0 0 40px #fff, inset 0 0 30px #fff, inset 0 0 20px #fff;
    background-color: #eee;
    position: relative;
  }

  .plate-image {
    width: 100px;
  }
  .plate-image img {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
  }

  .index {
    position: absolute;
    right: 5px;
    top: 5px;
    color: #aaa;
    font-size: 80%;
  }
</style>

<style>
  body.ea-dark-scheme .plate {
    background-color: #333333;
    box-shadow: inset 0 0 40px #666666, inset 0 0 30px #666666, inset 0 0 20px #666666;
    border: 1px solid #555555;
  }
</style>
