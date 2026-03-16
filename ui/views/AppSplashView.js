import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js'
// import { useMapStore } from '../../store/map.store.js';

const PINNED_MAP_ID = 'AV1lKxUDArOcODrZAgaQ'; // diagnal

export const AppSplashView = defineComponent(
  getTemplate('app-splash-view'),
  (props, ctx) => {
    // const mapStore = useMapStore();
    const fade = ref(false);
    
    const handleClick = () => {
      fade.value = true;
      
      setTimeout(() => {
        router.push({
          name: RouteName.mapList,
        })
      }, 2000);
    };
    
    // watch(currentMap, () => {
    //   console.warn(mapStats.value)
    // }, { immediate: true })
    
    
    return {
      fade,
      handleClick
    }
  }, {},
)