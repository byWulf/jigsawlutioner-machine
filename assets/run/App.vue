<template>
  <div class="row pb-3">
    <div v-for="controller in controllers" class="col-xl-1 col-lg-2 col-md-3 col-sm-4">
      <i v-if="controller.up" class="fa fa-circle text-success"></i>
      <i v-else class="fa fa-circle text-danger"></i>

      <span class="px-1">{{ controller.name }}</span>
    </div>
  </div>
  <div class="row pb-3">
    <div class="col">
      <button v-for="setup in setups" @click="currentSetup = setup" :class="'btn btn-' + (setup === currentSetup ? 'primary' : 'secondary')">{{ setup.name }}</button>
    </div>
  </div>
  <template v-if="currentSetup">
    <div v-for="stationData in filledStations" class="row pb-3">
      <div class="col">
        <h3 v-if="stationData.station">
          {{ stationData.position }}. {{ stationData.station.strategy }}
          <span class="badge badge-info"><i class="fab fab-raspberry-pi"></i> {{ stationData.station.controller.name }}</span>
        </h3>
        <h3 v-else>{{ stationData.position }}. (empty)</h3>
        <component v-if="stationData.station" :ref="'station' + stationData.station.id" :is="stationData.station.strategy" :controller="stationData.station.controller" :project="project"></component>
      </div>
      <div class="col-2" style="min-height: 100px;">
        <template v-if="plates[(stationData.position - 1) * 2]">
          <img v-if="plates[(stationData.position - 1) * 2].data.piece" :src="setsPublicDir + '/' + plates[(stationData.position - 1) * 2].data.piece.images.transparentSmall" style="height: 100px;">
        </template>
      </div>
    </div>
  </template>
</template>

<script>
import AutomaticConveyor from './Strategy/AutomaticConveyor';
import PhotoTaker from './Strategy/PhotoTaker';
import Plate from './Model/Plate';

export default {
  components: {
    AutomaticConveyor,
    PhotoTaker,
  },
  data() {
    return {
      project: window.project,
      setsPublicDir: window.setsPublicDir,
      setups: window.setups,
      currentSetup: null,
      controllers: {},
      currentPiece: null,
      currentPieceIndex: 1,
      takingPhoto: false,
      plates: [],
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
  computed: {
    filledStations() {
      const stations = [];

      let currentIndex = 0.5;
      for (let i in this.currentSetup.stations) {
        const station = this.currentSetup.stations[i];
        for (let index = currentIndex + 0.5; index < station.position; index += 0.5) {
          stations.push({station: null, position: index})
        }
        stations.push({station: station, position: station.position});

        currentIndex = station.position;
      }

      return stations;
    }
  },
  methods: {
    async checkControllerUp() {
      const result = await this.axios.get('/controllers/up');

      for (let controllerId in result.data) {
        this.controllers[controllerId].up = result.data[controllerId];
      }

      this.$forceUpdate();

      setTimeout(() => this.checkControllerUp(), 5000);
    },

    async handleStations() {
      const promises = [];
      let highestPosition = 0;
      for (let i in this.currentSetup.stations) {
        const station = this.currentSetup.stations[i];

        if (station.position > highestPosition) {
          highestPosition = station.position;
        }

        const plate = this.plates[(station.position * 2) - 1];
        if (typeof plate === 'undefined') {
          continue;
        }

        const handler = this.$refs['station' + station.id][0].handlePlate;
        if (typeof handler !== 'function') {
          continue;
        }

        promises.push(handler(plate));
      }

      await Promise.all(promises);

      // Add a new plate at the beginning
      this.plates.splice(0, 0, new Plate());

      // Remove the last plate if it reached the end of the setup
      if (this.plates.length > highestPosition * 2) {
        this.plates.pop();
      }
    }
  }
}
</script>
