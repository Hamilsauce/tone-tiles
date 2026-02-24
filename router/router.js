import { computed, watch } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AppBody } from '../ui/app-shell/AppBody.js';
import { AppCreateMapView } from '../ui/views/AppCreateMapView.js'
import { AppMapList } from '../ui/views/AppMapList.js'
import { useMapStore } from '../store/map.store.js';

export const RouteName = {
  home: 'home',
  edit: 'edit',
  createMap: 'create',
  mapList: 'list',
};

const routes = [
  {
    path: '/:id?',
    name: RouteName.home,
    components: {
      default: AppBody,
      panel: AppCreateMapView,
    },
    beforeEnter: (to, from) => {
      console.warn('in /:id', to, from)
      if (!to.params.id) {
        return { name: RouteName.mapList }
      }
      
      const mapStore = useMapStore();
      mapStore.setCurrentMapById(to.params.id)
      return { name: RouteName.edit, params: { id: to.params.id } }
    },
  },
  { path: '/edit/:id', component: AppBody, name: RouteName.edit },
  { path: '/create', component: AppCreateMapView, name: RouteName.createMap },
  { path: '/list', component: AppMapList, name: RouteName.mapList },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export const route = computed(() => router.currentRoute.value);