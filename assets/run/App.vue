<template>
  <div class="row pb-3">
    <div class="col">
      <button v-for="setup in setups" @click="currentSetup = setup" :class="'btn btn-' + (setup === currentSetup ? 'primary' : 'secondary')">{{ setup.name }}</button>
    </div>
  </div>
  <template v-if="currentSetup">
    <div v-for="(stationData, index) in filledStations" :class="'row pb-3 ' + (index === 0 ? 'hide-overflow' : '')">
      <Plate
          class="plate"
          :plate="plates[stationData.position * 2]"
          :style="{animationDuration: movePlatesDuration + 'ms', animationName: movePlatesDuration ? 'moveplate' : ''}"
      />

      <div class="col">
        <h3 v-if="stationData.station">
          {{ stationData.position }}. {{ stationData.station.strategy }}
          <span :class="'badge ' + (controllers[stationData.station.controller.id].up ? 'badge-success' : 'badge-danger')">
            <i class="fab fa-raspberry-pi"></i> {{ stationData.station.controller.name }}
          </span>
        </h3>
        <component v-if="stationData.station" :ref="'station' + stationData.station.id" :is="stationData.station.strategy" :controller="stationData.station.controller" :project="project"></component>
      </div>
    </div>
  </template>
</template>

<script>
import PlateModel from './Model/Plate';
import Plate from './Component/Plate';

export default {
  components: {
    Plate,
  },
  data() {
    return {
      project: window.project,
      setups: window.setups,
      currentSetup: null,
      controllers: {},
      currentPiece: null,
      currentPieceIndex: 1,
      takingPhoto: false,
      plateIndex: 0,
      plates: [],
      movePlatesDuration: null,
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

      stations.push({station: null, position: currentIndex + 0.5});
      stations.push({station: null, position: currentIndex + 1});

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

    movePlates(time) {
      let highestPosition = 0;
      for (let i in this.currentSetup.stations) {
        const station = this.currentSetup.stations[i];

        if (station.position > highestPosition) {
          highestPosition = station.position;
        }
      }

      // Add a new plate at the beginning
      this.plates.splice(0, 0, new PlateModel(this.plateIndex++, this.$forceUpdate));

      // Remove the last plate if it reached the end of the setup
      if (this.plates.length > 50) {
        this.plates.pop();
      }

      this.movePlatesDuration = time;
    },

    async handleStations() {
      this.movePlatesDuration = null;

      const promises = [];
      let highestPosition = 0;
      for (let i in this.currentSetup.stations) {
        const station = this.currentSetup.stations[i];

        if (station.position > highestPosition) {
          highestPosition = station.position;
        }

        const plate = this.plates[station.position * 2];
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
    },

    setProject(project) {
      this.project = window.project = project;
    },

    sleep(time, maxTime) {
      return new Promise((resolve) => {
        setTimeout(resolve, (maxTime ? (Math.random() * (maxTime - time)) : 0) + time);
      });
    }
  }
}
</script>

<style>
  @keyframes moveplate {
    from {
      margin-top: -100px;
      margin-bottom: 100px;
    }

    to {
      margin-top: 0;
      margin-bottom: 0;
    }
  }
</style>

<style scoped>
  .hide-overflow {
    overflow: hidden;
  }
</style>
