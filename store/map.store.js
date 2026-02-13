import { ref, computed, watch, reactive } from 'vue'
import { Graph, TILE_TYPE_INDEX } from '../lib/graph.model.js';
import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapMeta } from '../map.service.js';
import { MAP_DOC_TEMPLATE } from '../maps.js';


const currentMap = ref(null);
const maps = ref([]);
// const graph = new Graph();

export const useMapStore = () => {
  const isMapSaved = computed(() => !!currentMap.value.id && !currentMap.value.id.includes('TEMP_MAP'));
  
  const setCurrentMap = (mapDoc) => {
    const map = { ...MAP_DOC_TEMPLATE, ...mapDoc }
    map.id = map.id ?? 'TEMP_MAP' + Date.now();
    
    currentMap.value = map;
  };
  
  const createMap = async (map) => {
    currentMap.value = map;
  };
  
  const saveMap = async (map) => {
    // handle updating stored maps here too?
  };
  
  const deleteMap = async (map) => {
    // handle updating stored maps here too?
  };
  
  const loadMap = async (id) => {
    console.warn({ id })
    
    const loaded = await loadMap(id);
    console.warn({ loaded })
    return loaded
    // handle updating stored maps here too?
  };
  
  const initMaps = async () => {
    maps.value = await loadMapMeta();
    // handle updating stored maps here too?
  };
  
  return {
    setCurrentMap,
    createMap,
    saveMap,
    loadMap,
    deleteMap,
    isMapSaved,
    currentMap,
    initMaps,
  }
};