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

const renderMap = (mapData, svgCanvas, graph, actor1, selectionBox) => {
  graph.fromMap(mapData);
  
  if (!hasInitViewBox) {
    // svgCanvas.setViewBox({
    //   x: 0,
    //   y: 0,
    //   width: graph.width+5,
    //   height: graph.height+5,
    // });
  }
  
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
        // textContent: `${x},${y}`,
        // classList: ['tile'],
        classList: ['tile'],
        
        dataset: {
          tileType,
          x: x,
          y: y,
          current: false,
          active: false,
          isPathNode: false,
        },
      }));
  });
};


export const initMapControls = async (graph, svgCanvas, actor1, selectionBox) => {
  hasInitViewBox = false;
  const mapStore = useMapStore();
  
  const app = document.querySelector('#app');
  const appBody = document.querySelector('#app-body');
  const containers = document.querySelectorAll('.container');
  const mapInput = document.querySelector('#map-input');
  
  const mapInput$ = fromEvent(mapInput, 'change');
  
  const saveButton = document.querySelector('#save-map');
  const newButton = document.querySelector('#new-map');
  
  const mapNames = await loadMapIndex();
  
  [...mapInput.options].forEach((e) => {
    e.remove();
  });
  
  const blankOpt = { id: null, name: '' };
  const defaultOpt = { id: '', name: '' };
  
  [defaultOpt, ...mapNames].forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    
    mapInput.add(opt);
  });
  
  saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    let mapId;
    
    const graphOut = graph.toStorageFormat();
    
    if (!mapStore.isMapSaved.value) {
      delete graphOut.id;
    }
    console.warn('STORE', { graphOut, currindex: mapStore.currentMapIndex.value })
    
    mapId = await storeMap({ ...graphOut, ...(mapStore.currentMapIndex.value || {}) });
    
    copyTextToClipboard(graphOut);
    
    return mapId;
  });
  
  // newButton.addEventListener('click', async (e) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   e.stopImmediatePropagation();
  
  //   renderMap(BLANK_MAP_16X16, svgCanvas, graph, actor1, selectionBox);
  // });
  
  watch(mapStore.currentMap, (newMap, oldMap) => {
    if (newMap && oldMap && newMap.id === oldMap.id) return;
    renderMap(newMap, svgCanvas, graph, actor1, selectionBox);
  }, { immediate: true });
  
  
  
  mapInput$.pipe(
    tap(async ({ target }) => {
      const sel = target.selectedOptions[0].value;
      
      // const loadedMap = await loadMap(sel);
      
      mapStore.setCurrentMapById(sel);
    }),
  ).subscribe();
  
  // setTimeout(() => {
  //   mapStore.setCurrentMap(BLANK_MAP_16X16);
  // }, 500);
  
};