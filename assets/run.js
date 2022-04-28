import * as Vue from 'vue'
import App from "./run/App.vue";

import axios from 'axios'
import VueAxios from 'vue-axios'


const app = Vue.createApp(App);
app.use(VueAxios, axios);
app.provide('axios', app.config.globalProperties.axios);
app.mount('#app');
