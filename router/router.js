import { createMemoryHistory, createRouter } from 'vue-router'
import { AppBody } from '../ui/app-shell/AppBody.js';
console.warn(AppBody)
const routes = [
  { path: '/', component: AppBody },
  // { path: '/about', component: AboutView },
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
})