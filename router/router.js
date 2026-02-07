import { createMemoryHistory, createRouter } from 'vue-router'
import { AppBody } from '../ui/app-shell/AppBody.js';
import { AppCreateMapView } from '../ui/views/AppCreateMapView.js'

export const RouteName = {
  home: 'home',
  createMap: 'create',
};

const routes = [
  {
    path: '/',
    components: {
      default: AppBody,
      panel: AppCreateMapView,
    },
    name: RouteName.home
  },
  { path: '/create', component: AppCreateMapView, name: RouteName.createMap },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});