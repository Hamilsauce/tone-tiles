import { createApp, ref } from 'vue';
import { App } from './ui/App.js';

const apphost = document.querySelector('#app-host');

const app = createApp(App).mount(apphost);
