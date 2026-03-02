import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

const PINNED_MAP_ID = 'AV1lKxUDArOcODrZAgaQ'; // diagnal

export const AppMapList = defineComponent(
  getTemplate('app-map-list-view'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const maps = mapStore.mapIndex
    const mapList = computed(() => [...maps.values()].sort((a, b) => a.updated < b.updated || b.id === PINNED_MAP_ID ? 1 : -1))
    const editingId = ref(null);
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleMapClick = (id) => {
      if (editingId.value) return
      
      if (id) {
        router.push({
          name: RouteName.home,
          params: { id },
        })
      }
    };
    
    const handleMapContextMenu = (id) => {
      editingId.value = id;
      
      if (id) {
        router.push({
          name: RouteName.mapProps,
          params: { id },
        })
      }
    };
    
    const handleListItemBlur = () => {
      editingId.value = null;
    };
    
    const handleListClick = () => {
      editingId.value = null;
    };
    
    
    return { handleListClick, handleListItemBlur, handleMapContextMenu, editingId, mapList, handleNewMap, handleMapClick }
  }, {},
)