import * as Vue from 'vue'
import App from "./run/App.vue";

import axios from 'axios'
import axiosRetry from 'axios-retry';
import VueAxios from 'vue-axios'

const app = Vue.createApp(App);

// Axios
axiosRetry(axios, { retries: 3 });
app.use(VueAxios, axios);
app.provide('axios', app.config.globalProperties.axios);

// Strategies
const strategyComponents = require.context(
    './run/Strategy',
    false,
    /\w+\.(vue|js)$/
)

strategyComponents.keys().forEach(fileName => {
    const componentConfig = strategyComponents(fileName)

    const componentName = fileName
        .split('/')
        .pop()
        .replace(/\.\w+$/, '');

    app.component(
        componentName,
        componentConfig.default
    )
})

app.mount('#app');
