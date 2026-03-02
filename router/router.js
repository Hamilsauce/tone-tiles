import { computed, watch } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AppBody } from '../ui/app-shell/AppBody.js';
import { AppCreateMapView } from '../ui/views/AppCreateMapView.js'
import { AppMapList } from '../ui/views/AppMapList.js'
import { AppMapProps } from '../ui/views/AppMapProps.js'
import { useMapStore } from '../store/map.store.js';

export const RouteName = {
  home: 'home',
  edit: 'edit',
  createMap: 'create',
  mapList: 'list',
  mapProps: 'props',
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
  { path: '/props/:id', component: AppMapProps, name: RouteName.mapProps },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export const route = computed(() => router.currentRoute.value);