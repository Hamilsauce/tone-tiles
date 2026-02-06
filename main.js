import { createApp, ref } from 'vue';
import { App } from './ui/App.js';
import { router } from './router/router.js';
// console.warn({App})

const apphost = document.querySelector('#app-host');
const app = createApp(App)
  .use(router)
  .mount(apphost);