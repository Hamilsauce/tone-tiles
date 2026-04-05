import { TileObject } from './TileObject.js';
import { SceneLayer } from './SceneLayer.js';
import graph from '../lib/graph.model.js';
const loadLogs = []
window.loadLogs = loadLogs

export class TileLayer extends SceneLayer {
	#name = null;
	#mapLinkTiles = new Map();
	cancelSub
	
	constructor(ctx, options = {}) {
		const { objects, ...opts } = options;
		
		super(ctx, 'tile', opts);
		this.#name = 'tile';
		
		// this.cancelGraphLoad = graph.on('map:load', ({ width, height, nodes }) => {
		// 	const tilesTotal = width * height;
		
		// 	if (tilesTotal > 512) {
		// 		this.dom.classList.add('no-shadow');
		// 	} else {
		// 		this.dom.classList.remove('no-shadow');
		// 	}
		
		// 	this.forEach((t) => {
		// 		if (t.linkedMap) this.remove(t.id)
		// 		else this.unload(t.id)
		// 	});
		
		// 	this.loadTiles(nodes)
		// });
		
		graph.on('node:update', ({ id, data }) => {
			if (this.objects.has(id)) {
				this.get(id).update(data);
			}
		});
	};
	
	getRange({ start, end }) {
		let range = [];
		
		for (let x = start.x; x < end.x; x++) {
			for (let y = start.y; y < end.y; y++) {
				const tile = this.getTileAt(x, y);
				range.push(tile);
			}
		}
		
		return range;
	};
	
	loadTileSet({ width, height, nodes }) {
		const tilesTotal = width * height;
		
		if (tilesTotal > 512) {
			this.dom.classList.add('no-shadow');
		} else {
			this.dom.classList.remove('no-shadow');
		}
		
		this.forEach((t) => {
			if (t.linkedMap) this.remove(t.id)
			else this.unload(t.id)
		});
		
		this.loadTiles(nodes)
	};
	
	loadTiles(nodes) {
		nodes.forEach((newNode, i) => {
			if (this.objects.has(newNode.id)) {
				this.load(newNode.id, newNode.data());
			} else {
				this.add(newNode);
			}
		})
	}
	
	add(node) {
		if (node.type !== 'tile') {
			throw new Error('No object type in layer add');
		}
		
		// const cObj = obj instanceof TileObject ? obj :new TileObject(this.context, {
		// 		id: node.id,
		// 		model: node.data()
		// 	});
		// const cObj = this.context.createObject('tile', node.data())
		
		
		// let cObj
		// if (node.tileType === 'map-link') {
		// 	const { dir, ...data } = node.data()
		// 	// const mapLinkData
		// 	cObj = this.context.createObject('map-link', { ...node.data() })
		
		// 	const offsetX = dir === 'E' ? cObj.x + 2 : dir === 'E' ? cObj.x - 2 : cObj.x
		// 	const offsetY = dir === 'N' ? cObj.y - 2 : dir === 'S' ? cObj.y + 2 : cObj.y
		
		// 	const textOffset = {
		// 		x: cObj.x
		// 	}
		// 	cObj.getEl('.linked-map-name').setAttribute('transform', `translate(${offsetX}, ${offsetY}) rotate(0) scale(0.2)`)
		// 	// cObj = new TileObject(this.context, { id: node.id, model: node.data() })
		
		// } else {
		// 	cObj = new TileObject(this.context, { id: node.id, model: node.data() })
		
		// }
		
		const cObj = new TileObject(this.context, { id: node.id, model: node.data() })
		
		this.objects.set(node.id, cObj);
		this.dom.appendChild(cObj.dom);
		
		cObj.update();
		this.emit('object:add', cObj);
		
		return cObj;
	}
	
	getTileAt(x, y) {
		const address = `${x}_${y}`;
		
		return this.get(address)
	}
}