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
    const traversalEffectsEnabled = appStore.traversalEffectsEnabled;
    const toolbarEnabled = appStore.toolbarEnabled;
    const mapStore = useMapStore();
    const mapState = mapStore.mapState
    const mapNameRef = ref('mapName');
    const mapName = computed(() => mapState.value?.name ?? 'No Map')
    const shouldDisplay = computed(() => route.value.path !== '/')

    const frameRateFormatted = computed(() => frameRate.value ? `${frameRate.value}fps` : '');

    const handleNewMap = () => {
      router.push({ name: RouteName.createMap });
    };

    const handleMapNameChange = (e) => {
      const value = e.target.value.trim()
      mapStore.updateMapState({ name: value })
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

    return {
      frameRateFormatted,
      shouldDisplay,
      traversalEffectsEnabled,
      handleChangeMap,
      handleMapNameChange,
      handleNewMap,
      handleToggleTraversalEffects,
      handleToggleToolbar,
      mapName,
    }
  }, {},
)
