import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

export const AppHeader = defineComponent(
  getTemplate('app-header'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const mapState = mapStore.mapState
    const mapNameRef = ref('mapName');
    const mapName = computed(() => mapState.value?.name ?? 'No Map')
    const shouldDisplay = computed(() => route.value.path !== '/')
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapNameChange = (e) => {
      const value = e.target.value.trim()
      mapStore.updateMapState({ name: value })
    };
    
    const handleChangeMap = () => {
      router.push({ name: RouteName.mapList }) //, params: { id: route.value.params.id ?? undefined } })
    };
    
    watch(mapState, (newState, lastState) => {
      // console.warn('WATCHER mapName', mapName.value)
    })
    
    return { shouldDisplay, handleChangeMap, handleMapNameChange, mapName, handleNewMap }
  }, {},
)