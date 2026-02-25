import { ref, computed, watch, reactive, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';

import { AppHeader } from './app-shell/AppHeader.js';
import { AppBody } from './app-shell/AppBody.js';
import { AppFooter } from './app-shell/AppFooter.js';
import { AppFloatingMenu } from './AppFloatingMenu.js';
import { useMapStore } from '../store/map.store.js';
import { router, RouteName, route } from '../router/router.js'

const t = getTemplate('app');

export const App = defineComponent(
  getTemplate('app', true),
  () => {
    const mapStore = useMapStore();
    const activeMapId = computed(() => route.value.path !== '/')
    const shouldDisplay = computed(() => route.value.name !== 'list')
   
    console.warn(route.value)
    
    onMounted(() => {
      mapStore.initMaps();
    });
    
    // watch(route, (newState, lastState) => {
    //   const params = route.value.params
    // })
    
    return { shouldDisplay }
  },
  {
    components: {
      'app-header': AppHeader,
      'app-body': AppBody,
      'app-footer': AppFooter,
      'app-floating-menu': AppFloatingMenu,
    }
  },
)