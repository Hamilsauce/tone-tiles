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
    const editingId = ref(null);
    
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
    
    const handleMapContextMenu = (id) => {
      editingId.value = id;
    };
    
    const handleListItemBlur = () => {
      console.warn('item blur', editingId.value)
      editingId.value = null;
    };
    
    // watch(maps, (newState, lastState) => {})
    
    return { handleListItemBlur, handleMapContextMenu, editingId, mapList, handleNewMap, handleMapClick }
  }, {},
)