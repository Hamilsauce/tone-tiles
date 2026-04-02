import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js'

import { useMapStore } from '../../store/map.store.js';
import { useAppState } from '../../store/app.store.js';

export const AppHeader = defineComponent(
  getTemplate('app-header'),
  (props, ctx) => {
    // console.warn(ctx)
    
    const appStore = useAppState();
    const frameRate = appStore.frameRate
    const mapStore = useMapStore();
    const mapState = mapStore.mapState
    const mapNameRef = ref('mapName');
    const mapName = computed(() => mapState.value?.name ?? 'No Map')
    const shouldDisplay = computed(() => route.value.path !== '/')
    
    const frameRateFormatted = computed(() => frameRate.value ? `${frameRate.value}fps` : '');
    
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
    
    // watch(frameRateFormatted, (fps) => {
    //   console.warn('WATCHER frameRateFormatted', frameRateFormatted.value)
    // }, { immediate: true })
    
    return { frameRateFormatted, shouldDisplay, handleChangeMap, handleMapNameChange, mapName, handleNewMap }
  }, {},
)