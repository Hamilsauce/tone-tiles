import { ref, computed, watch } from 'vue';
import { getLinkCoords } from '../lib/graph.model.js';

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
  
  const tilesTotal = graph.width * graph.height
  console.log({ tilesTotal })
  if (tilesTotal > 512) {
    svgCanvas.layers.tile.classList.add('no-shadow')
  } else {
    svgCanvas.layers.tile.classList.remove('no-shadow')
  }
  
  svgCanvas.layers.tile.innerHTML = '';
  
  graph.nodes.forEach(({ x, y, tileType }, rowNumber) => {
    if (tileType === 'start') {
      actor1.setAttribute('transform', `translate(${x},${y})`);
    }
    
    svgCanvas.layers.tile.append(
      svgCanvas.createTile({
        tileType: mapStore.previousMapId.value && tileType === 'start' ? 'empty' : tileType,
        x,
        y,
        current: false,
        active: false,
        isPathNode: false,
      }));
  });
  
  
  
  Object.entries((mapData.linkedMaps)).forEach(([dir, linkedMap], i) => {
    const { x, y } = getLinkCoords(dir, { width: graph.width, height: graph.height })
    
    svgCanvas.layers.tile.append(
      svgCanvas.createTile({
        linkedMap,
        tileType: linkedMap === mapStore.previousMapId.value ? 'start' : 'map-link',
        x,
        y,
        current: false,
        active: false,
        isPathNode: false,
      }));
    
    if (mapStore.previousMapId.value === linkedMap) {
      actor1.setAttribute('transform', `translate(${x},${y})`);
    }
  })
  
  svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graph.width+2)/2)-0.3}, ${Math.floor((graph.height + 2) / 2) - 0.25})`)
  svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graph.height/2))-3}) scale(0.4)`)
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