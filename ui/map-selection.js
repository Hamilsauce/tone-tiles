import { ref, computed, watch } from 'vue';

import { BLANK_MAP_16X16, mapStorageFormatter } from '../maps.js';
import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapIndex } from '../map.service.js';

import { copyTextToClipboard } from '../lib/utils.js';
import { useMapStore } from '../store/map.store.js';

const { forkJoin, Observable, iif, BehaviorSubject, AsyncSubject, Subject, interval, of, fromEvent, merge, empty, delay, from } = rxjs;
const { flatMap, reduce, groupBy, toArray, mergeMap, switchMap, scan, map, tap, filter } = rxjs.operators;

import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { sleep, template, utils, download, TwoWayMap } = ham;

let hasInitViewBox = false;
let mapStore = useMapStore();

const renderMap = (mapData, svgCanvas, graph, actor1, selectionBox) => {
  graph.fromMap(mapData);
  
  selectionBox.setBounds({
    minX: 0,
    minY: 0,
    maxX: graph.width,
    maxY: graph.height
  });
  
  hasInitViewBox = true;
  
  svgCanvas.layers.tile.innerHTML = '';
  
  graph.nodes.forEach(({ x, y, tileType }, rowNumber) => {
    if (tileType === 'start') {
      actor1.setAttribute('transform', `translate(${x},${y})`);
    }
    
    svgCanvas.layers.tile.append(
      svgCanvas.createRect({
        width: 1,
        height: 1,
        classList: ['tile'],
        
        dataset: {
          tileType,
          x,
          y,
          current: false,
          active: false,
          isPathNode: false,
        },
      }));
  });;
  (mapData.linkedMaps || []).forEach((linkedMap, i) => {
    let x
    let y
    if ([0, 2].includes(i)) {
      x = Math.floor(graph.width / 2)
      y = i === 2 ? graph.height : -1
    }
    
    if ([1, 3].includes(i)) {
      y = Math.floor(graph.height / 2)
      x = i === 3 ? graph.width : -1
    }
    
    svgCanvas.layers.tile.append(
      svgCanvas.createRect({
        width: 1,
        height: 1,
        classList: ['tile'],
        
        dataset: {
          linkedMap,
          tileType: 'map-link',
          x,
          y,
          current: false,
          active: false,
          isPathNode: false,
        },
      }));
    
    if (mapStore.previousMapId.value === linkedMap) {
      actor1.setAttribute('transform', `translate(${x},${y})`);
    }
  })
};


export const initMapControls = async (graph, svgCanvas, actor1, selectionBox) => {
  hasInitViewBox = false;
  mapStore = useMapStore();
  
  const app = document.querySelector('#app');
  const appBody = document.querySelector('#app-body');
  const containers = document.querySelectorAll('.container');
  
  const saveButton = document.querySelector('#save-map');
  const newButton = document.querySelector('#new-map');
  
  const mapNames = await loadMapIndex();
  
  
  const blankOpt = { id: null, name: '' };
  const defaultOpt = { id: '', name: '' };
  
  
  saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    let mapId;
    
    const graphOut = graph.toStorageFormat();
    
    if (!mapStore.isMapSaved.value) {
      delete graphOut.id;
    }
    
    mapId = await storeMap({ ...graphOut, ...(mapStore.currentMapIndex.value || {}) });
    
    copyTextToClipboard(graphOut);
    
    return mapId;
  });
  
  
  watch(mapStore.currentMap, (newMap, oldMap) => {
    if (newMap && oldMap && newMap.id === oldMap.id) return;
    renderMap(newMap, svgCanvas, graph, actor1, selectionBox);
  }, { immediate: true });
  
  
  return (id) => {
    mapStore.setCurrentMapById(id);
  }
};