import { ref, computed, watch, reactive } from 'vue'
import { Graph, TILE_TYPE_INDEX } from './lib/graph.model.js';
import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapMeta } from '../map.service.js';


const currentMap = ref(null);
const maps = ref([]);
// const graph = new Graph();

export const useMapStore = () => {
  const isMapSaved = computed(() => !!currentMap.value.id);
  
  const setCurrentMap = (map) => {
    currentMap.value = map;
  };
  
  const createMap = (map) => {
    currentMap.value = map;
  };
  
  const saveMap = (map) => {
    // handle updating stored maps here too?
  };
  
  const deleteMap = (map) => {
    // handle updating stored maps here too?
  };
  
  const initMaps = () => {
    maps.value = await loadMapMeta();
    // handle updating stored maps here too?
  };
  
  return {
    setCurrentMap,
    createMap,
    saveMap,
    deleteMap,
    isMapSaved,
    initMaps,
  }
};