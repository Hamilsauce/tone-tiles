import { storeMaps, storeMap, updateMap, loadMap, loadMaps, clearMaps, loadMapIndex } from '../map.service.js';
import { copyTextToClipboard } from '../lib/utils.js';

import { useMapStore } from '../store/map.store.js';

let hasInitViewBox = false;
let mapStore = useMapStore();


// TODO: MOVE TO COMPONENT
export const initMapControls = async (graph, svgCanvas, actor1, selectionBox) => {
	hasInitViewBox = false;
	const saveButton = document.querySelector('#save-map');
	
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
	
	return async (id) => {
		await mapStore.setCurrentMapById(id);
	};
};