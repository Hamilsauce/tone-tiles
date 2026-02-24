import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

export const AppMapList = defineComponent(
  getTemplate('app-map-list-view'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const maps = mapStore.mapIndex
    console.warn({ maps })
    // const footerStateRef = ref('toolbar');
    // const mapNameRef = ref('mapName');
    const mapList = computed(() => [...maps.values()])
    // const footerState = computed(() => footerStateRef.value)
    
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapClick = (id) => {
      console.warn({ id })
      if (id) {
        // mapStore.
        router.push({
          name: RouteName.home,
          params: { id },
        })
        
      }
    };
    
    // const handleMapNameChange = (e) => {
    //   const value = e.target.value.trim()
    //   mapStore.updateMapState({ name: value })
    // };
    
    const handleFooterToggle = () => {
      footerStateRef.value = footerStateRef.value === 'toolbar' ? 'drawer' : 'toolbar';
      ctx.emit('footertoggle', footerState.value)
    };
    
    watch(maps, (newState, lastState) => {
      console.warn('WATCHER mapName', maps)
    })
    
    return { mapList, handleNewMap, handleMapClick }
  }, {},
)