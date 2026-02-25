import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

export const AppMapList = defineComponent(
  getTemplate('app-map-list-view'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const maps = mapStore.mapIndex
    const mapList = computed(() => [...maps.values()])
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapClick = (id) => {
      if (id) {
        router.push({
          name: RouteName.home,
          params: { id },
        })
      }
    };
    
    const handleFooterToggle = () => {
      footerStateRef.value = footerStateRef.value === 'toolbar' ? 'drawer' : 'toolbar';
      ctx.emit('footertoggle', footerState.value)
    };
    
    // watch(maps, (newState, lastState) => {})
    
    return { mapList, handleNewMap, handleMapClick }
  }, {},
)