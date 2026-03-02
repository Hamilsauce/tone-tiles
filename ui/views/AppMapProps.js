import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

const PINNED_MAP_ID = 'AV1lKxUDArOcODrZAgaQ'; // diagnal

export const AppMapProps = defineComponent(
  getTemplate('app-map-props-view'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const maps = mapStore.mapIndex
    const mapId = computed(() => route.value.params.id)
    const map = computed(() => mapStore.mapIndex.get(mapId.value))
    const editingId = ref(null);
    
    const handleNewMap = () => {
      router.push({ name: RouteName.createMap })
    };
    
    const handleDoneClick = (id) => {
      router.push({
        name: RouteName.mapList,
      })
    };
    
    const handleDeleteClick = (id) => {
      editingId.value = id;
    };
    
    const handleListItemBlur = () => {
      editingId.value = null;
    };
    
    const handleListClick = () => {
      editingId.value = null;
    };
    
    onMounted(() => {
      console.warn(map.value)
    })
    
    
    return { map, editingId, handleDoneClick, handleDeleteClick }
  }, {},
)