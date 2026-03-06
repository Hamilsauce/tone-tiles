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
    const currentMap = computed(() => mapStore.currentMap.value)
    console.warn('curre', currentMap.value)
    
    const aggregateTileData = ({ tileData, width, height }) => {
      
      const res = Object.values(tileData).reduce((acc, curr, i) => {
        if (acc[curr.tileType] !== undefined) {
          acc[curr.tileType] === acc[curr.tileType]++;
          acc.total++;
        }
        
        return acc
      }, {
        barrier: 0,
        teleport: 0,
        start: 0,
        end: 0,
        total: 0,
      })
      
      res.empty = (width * height) - res.total
      res.total = (width * height)
      return res
    }
    const mapStats = computed(() => aggregateTileData(currentMap.value))
    
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
    
    watch(currentMap, () => {
      console.warn(mapStats.value)
    }, { immediate: true })
    
    
    return {
      mapStats,
      map,
      editingId,
      handleDoneClick,
      handleDeleteClick
    }
  }, {},
)