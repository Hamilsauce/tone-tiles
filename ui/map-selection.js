import { ref, computed, watch, toValue } from 'vue';
import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapIndex } from '../map.service.js';
import { copyTextToClipboard } from '../lib/utils.js';
import { useMapStore } from '../store/map.store.js';
import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { sleep } = ham
let hasInitViewBox = false;
let mapStore = useMapStore();

const renderMap = async (mapData, svgCanvas, graph, actor1, selectionBox) => {
	// mapData = toValue(mapData);
	// graph.fromMap(mapData);
	
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
	
	const tilesTotal = graph.width * graph.height;
	
	if (tilesTotal > 512) {
		tileLayer.dom.classList.add('no-shadow');
	} else {
		tileLayer.dom.classList.remove('no-shadow');
	}
	
	// graph.nodes.forEach((node, rowNumber) => {
	// 	if (node.tileType === 'start') {
	// 		actor1.setAttribute('transform', `translate(${node.x},${node.y})`);
	// 	}
	// });
	
	actor1.setAttribute('transform', `translate(${graph.startNode.x},${graph.startNode.y})`);
	
	
	// tileLayer.loadTiles(graph.nodes)
	
	svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graph.width + 2) / 2) - 0.3}, ${Math.floor((graph.height + 2) / 2) - 0.25})`);
	svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graph.height / 2)) - 3}) scale(0.4)`);
};

let stuff = {
	graph: null,
	svgCanvas: null,
	actor1: null,
	selectionBox: null
}

export const initMapControls = async (graph, svgCanvas, actor1, selectionBox) => {
	hasInitViewBox = false;
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
	
	graph.on('map:load', async ({ width, height, nodes, startNode }) => {
		selectionBox.setBounds({
			minX: 0,
			minY: 0,
			maxX: graph.width,
			maxY: graph.height
		});
		// await sleep(100)
		
		actor1.setAttribute('transform', `translate(${graph.startNode.x},${graph.startNode.y})`);
		
		
		svgCanvas.layers.surface.setAttribute('transform', `translate(${Math.floor((graph.width + 2) / 2) - 0.3}, ${Math.floor((graph.height + 2) / 2) - 0.25})`);
		svgCanvas.layers.surface.querySelector('#surface-map-name').setAttribute('transform', `translate(0, ${-((graph.height / 2)) - 3}) scale(0.4)`);
	});
	
	watch(mapStore.currentMap, (newMap, oldMap) => {
		if (!newMap.id) return //|| newMap && oldMap && newMap.id === oldMap.id) return;
		const mapData = toValue(newMap);
		graph.fromMap(mapData)
		// renderMap(mapStore.currentMap, stuff.svgCanvas, graph, stuff.actor1, stuff.selectionBox);
		
	}, { immediate: true });
	
	return async (id) => {
		await mapStore.setCurrentMapById(id);
	};
};