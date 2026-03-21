import { ref, computed, watch, toValue } from 'vue';
import { getLinkCoords, getDirectionFromPoints } from '../lib/graph.model.js';

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

const renderMap = async (mapData, svgCanvas, graph, actor1, selectionBox) => {
	mapData = toValue(mapData);
	graph.fromMap(mapData);
	
	const previousMapId = mapStore.previousMapId.value;
	
	selectionBox.setBounds({
		minX: 0,
		minY: 0,
		maxX: graph.width,
		maxY: graph.height
	});
	
	hasInitViewBox = true;
	
	const scene = svgCanvas.scene;
	const tileLayer = scene.getLayer('tile');
	tileLayer.clear();
	
	const tilesTotal = graph.width * graph.height;
	
	
	if (tilesTotal > 512) {
		tileLayer.dom.classList.add('no-shadow');
	} else {
		tileLayer.dom.classList.remove('no-shadow');
	}
	
	
	
	graph.nodes.forEach((node, rowNumber) => {
		node.tileType = previousMapId && node.tileType === 'start' ? 'empty' : node.tileType;
		node.tileType = previousMapId && previousMapId === node.linkedMap ? 'start' : node.tileType;
		
		if (node.tileType === 'start') {
			actor1.setAttribute('transform', `translate(${node.x},${node.y})`);
		}
		
		const tile = tileLayer.add(node.data());
		// tileLayer.add(node);
		
		node.on('node:update', ({ id, data }) => {
			tile.update({ ...data })
		})
	});
	
	// Object.entries((mapData.linkedMaps)).forEach(([dir, linkedMap], i) => {
	//   const { x, y } = getLinkCoords(dir, { width: graph.width, height: graph.height });
	//   const tileType = linkedMap === mapStore.previousMapId.value ? 'start' : 'map-link';
	
	//   if (tileType === 'start') {
	//     actor1.setAttribute('transform', `translate(${x},${y})`);
	//   }
	
	//   tileLayer.add({
	//     type: 'tile',
	//     id: `${x}_${y}`,
	//     address: `${x}_${y}`,
	//     linkedMap,
	//     tileType,
	//     x,
	//     y,
	//     current: false,
	//     active: false,
	//     isPathNode: false,
	//   })
	// });
	
	svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graph.width + 2) / 2) - 0.3}, ${Math.floor((graph.height + 2) / 2) - 0.25})`);
	svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graph.height / 2)) - 3}) scale(0.4)`);
	
	// await navigator.clipboard.writeText(tileLayer.dom.closest('svg').outerHTML)
	// await navigator.clipboard.writeText(JSON.stringify(graph.nodes, null, 2))
	
};

let stuff = {
	graph: null,
	svgCanvas: null,
	actor1: null,
	selectionBox: null
}

export const initMapControls = async (graph, svgCanvas, actor1, selectionBox) => {
	hasInitViewBox = false;
	mapStore = useMapStore();
	stuff.graph = graph;
	stuff.svgCanvas = svgCanvas;
	stuff.actor1 = actor1;
	stuff.selectionBox = selectionBox;
	const saveButton = document.querySelector('#save-map');
	
	saveButton.addEventListener('click', async (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		
		let mapId;
		
		const graphOut = stuff.graph.toStorageFormat();
		
		if (!mapStore.isMapSaved.value) {
			delete graphOut.id;
		}
		
		mapId = await storeMap({ ...graphOut, ...(mapStore.currentMapIndex.value || {}) });
		
		copyTextToClipboard(graphOut);
		
		return mapId;
	});
	
	watch(mapStore.currentMap, (newMap, oldMap) => {
		// if (!newMap.id || newMap && oldMap && newMap.id === oldMap.id) return;
		renderMap(mapStore.currentMap, stuff.svgCanvas, graph, stuff.actor1, stuff.selectionBox);
	}, { immediate: true });
	
	return async (id) => {
		await mapStore.setCurrentMapById(id);
	};
};