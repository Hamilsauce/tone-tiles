import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

export const AppHeader = defineComponent(
  getTemplate('app-header'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const mapState = mapStore.mapState
    
    const footerStateRef = ref('toolbar');
    const mapNameRef = ref('mapName');
    const mapName = computed(() => mapState.value?.name ?? 'No Map')
    const footerState = computed(() => footerStateRef.value)
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapNameChange = (e) => {
      const value = e.target.value.trim()
      mapStore.updateMapState({ name: value })
    };
    
    const handleFooterToggle = () => {
      footerStateRef.value = footerStateRef.value === 'toolbar' ? 'drawer' : 'toolbar';
      ctx.emit('footertoggle', footerState.value)
    };
    
    watch(mapState, (newState, lastState) => {
      console.warn('WATCHER mapName', mapName.value)
    })
    
    return { handleMapNameChange, mapName, footerState, handleFooterToggle, handleNewMap }
  }, {},
)