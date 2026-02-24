import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapIndex } from '../map.service.js';

import { ref, computed, watch, reactive } from 'vue'
import { Graph, TILE_TYPE_INDEX } from '../lib/graph.model.js';
import { MAP_DOC_TEMPLATE } from '../maps.js';


const currentMap = ref({
  tileData: {},
  width: 0,
  height: 0,
  id: '',
});

const currentMapIndex = ref({
  width: 0,
  height: 0,
  id: '',
  meta: {},
  name: 'No Mapzorz',
  updated: 0,
});
const mapIndexArray = ref([]);
const mapIndex = reactive(new Map());

export const useMapStore = () => {
  const isMapSaved = computed(() => !!currentMap.value.id && !currentMap.value.id.includes('TEMP'));
  const mapList = computed(() => [...mapIndex.values()])
  const mapState = computed(() => currentMapIndex.value)
  
  const setCurrentMap = (mapDoc) => {
    currentMap.value = { ...MAP_DOC_TEMPLATE, ...mapDoc, id: mapDoc.id ?? `TEMP_MAP_${Date.now()}`, };
    currentMapIndex.value = mapIndex.has(mapDoc.id) ? mapIndex.get(mapDoc.id) : null;
    // console.warn('currentMapIndex.value', currentMapIndex.value)
    // return currentMap.value.id;
  };
  
  const saveMap = async (map) => {
    // handle updating stored maps here too?
  };
  
  const deleteMap = async (map) => {
    // handle updating stored maps here too?
  };
  
  const createMap = async (id) => {
    
    const loaded = await loadMap(id);
    return loaded
    // handle updating stored maps here too?
  };
  
  const initMaps = async () => {
    const res = await loadMapIndex();
    // console.warn('init maps', res)
    res.forEach(m => mapIndex.set(m.id, m))
    // mapIndex.value = await loadMapIndex();
  };
  
  const setCurrentMapById = async (mapId) => {
    const loaded = await loadMap(mapId);
    // currentMap.value = 
    // console.warn('setCurrentMapById', loaded)
    
    setCurrentMap(loaded);
    // currentMap.value = setCurrentMap(loaded);
  };
  
  const updateMapState = async (mapPatch = {}) => {
    if (mapPatch.name) {
      currentMapIndex.value.name = mapPatch.name
    }
  };
  
  
  return {
    setCurrentMap,
    updateMapState,
    createMap,
    saveMap,
    loadMap,
    deleteMap,
    isMapSaved,
    currentMap,
    currentMapIndex,
    mapIndex,
    mapState,
    initMaps,
    setCurrentMapById,
  }
};