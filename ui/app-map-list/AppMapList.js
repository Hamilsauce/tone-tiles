import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';
import { AppMapListItem } from './AppMapListItem.js'

const PINNED_MAP_ID = 'AV1lKxUDArOcODrZAgaQ'; // diagnal

export const AppMapList = defineComponent(
  getTemplate('app-map-list-view'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const maps = mapStore.mapIndex
    const displayMode = computed(() => props.displayMode);
    const isCompactMode = computed(() => props.displayMode === 'compact');
    const mapList = computed(() => [...maps.values()].sort((a, b) => a.updated < b.updated || b.id === PINNED_MAP_ID ? 1 : -1))
    const selectedId = ref(null);
    
    const handleNewMap = () => {
      console.warn('CLICK')
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapClick = (id) => {

      if (id && !selectedId.value) {
        router.push({
          name: RouteName.home,
          params: { id },
        })
      }
    };
    
    const handleMapSelect = (id) => {
      selectedId.value = id;
    };
    
    const handleMapEdit = async (id) => {
      if (selectedId.value === id) {
        await mapStore.setCurrentMapById(id)
        router.push({
          name: RouteName.mapProps,
          params: { id },
        })
      }
    };
    
    const handleListItemBlur = () => {
      selectedId.value = null;
    };
    
    const handleListClick = () => {
      selectedId.value = null;
    };
    
    return {
      handleListClick,
      handleListItemBlur,
      handleMapSelect,
      handleMapEdit,
      selectedId: computed(() => selectedId.value),
      mapList,
      handleNewMap,
      handleMapClick,
      isCompact: isCompactMode,
      displayMode,
    }
  }, {
    components: { 'app-map-list-item': AppMapListItem }
  },
)

AppMapList.props = ['displayMode']