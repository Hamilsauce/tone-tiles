import { computed, watch } from 'vue'
import { createMemoryHistory, createWebHashHistory, createRouter } from 'vue-router'
import { AppBody } from '../ui/app-shell/AppBody.js';
import { AppCreateMapView } from '../ui/views/AppCreateMapView.js'
import { AppMapList } from '../ui/app-map-list/AppMapList.js'
import { AppMapProps } from '../ui/views/AppMapProps.js'
import { AppSplashView } from '../ui/views/AppSplashView.js'
import { useMapStore } from '../store/map.store.js';

let hasAppLoaded = false;

export const RouteName = {
  home: 'home',
  edit: 'edit',
  splash: 'splash',
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
      if (!hasAppLoaded) {
        hasAppLoaded = true;
        
        return { name: RouteName.splash };
      }
      
      if (!to.params.id) {
        return { name: RouteName.mapList };
      }
      
      return { name: RouteName.edit, params: { id: to.params.id } }
    },
  },
  {
    path: '/edit/:id',
    component: AppBody,
    name: RouteName.edit,
    beforeEnter: async (to, from) => {
      hasAppLoaded = true;
      
      const mapStore = useMapStore();
      await mapStore.setCurrentMapById(to.params.id);
      
      return true;
    },
  },
  { path: '/splash', component: AppSplashView, name: RouteName.splash },
  { path: '/create', component: AppCreateMapView, name: RouteName.createMap },
  { path: '/list', component: AppMapList, name: RouteName.mapList },
  {
    path: '/props/:id',
    components: { default: AppMapProps, panel: AppBody, },
    name: RouteName.mapProps
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export const route = computed(() => router.currentRoute.value);