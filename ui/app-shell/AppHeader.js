import { ref, computed, watch } from 'vue';
import ham from 'ham';
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js';

import { useMapStore } from '../../store/map.store.js';
import { useAppState } from '../../store/app.store.js';
const { download } = ham
export const AppHeader = defineComponent(
  getTemplate('app-header'),
  (props, ctx) => {
    // console.warn(ctx)
    
    const appStore = useAppState();
    const frameRate = appStore.frameRate;
    const traversalEffectsEnabled = appStore.traversalEffectsEnabled;
    const toolbarEnabled = appStore.toolbarEnabled;
    const mapStore = useMapStore();
    const mapState = mapStore.mapState;
    const mapNameRef = ref('mapName');
    const mapName = computed(() => mapState.value?.name ?? 'No Map');
    const shouldDisplay = computed(() => route.value.path !== '/');
    
    const frameRateFormatted = computed(() => frameRate.value ? `${frameRate.value}fps` : '');
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap });
    };
    
    const handleMapNameChange = (e) => {
      const value = e.target.value.trim();
      mapStore.updateMapState({ name: value });
    };
    
    const handleChangeMap = () => {
      router.push({ name: RouteName.mapList });
    };
    
    const handleToggleTraversalEffects = () => {
      appStore.toggleTraversalEffects();
    };
    
    const handleToggleToolbar = () => {
      appStore.toggleToolbar();
    };
    
    const handleCopyEvents = async () => {
      
      await download('tt-runtime-events2_20260513.json', JSON.stringify(window.graphEvents, null, 2));
      // navigator.clipboard.writeText(JSON.stringify(window.graphEvents, null, 2));
    };
    
    return {
      frameRateFormatted,
      shouldDisplay,
      traversalEffectsEnabled,
      handleChangeMap,
      handleMapNameChange,
      handleNewMap,
      handleToggleTraversalEffects,
      handleToggleToolbar,
      toolbarEnabled,
      mapName,
      handleCopyEvents
    };
  }, {},
);