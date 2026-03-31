import { TileObject } from './TileObject.js';
import { SceneLayer } from './SceneLayer.js';
import graph from '../lib/graph.model.js';

export class TileLayer extends SceneLayer {
	#name = null;
	#mapLinkTiles = new Map();
	
	constructor(ctx, options = {}) {
		const { objects, ...opts } = options;
		
		super(ctx, 'tile', opts);
		
		this.#name = 'tile';
		
		
		graph.on('map:load', ({ width, height, mapLinkNodes, nodes }) => {
			this.forEach((t) => {
				if (t.linkedMap) {
					this.remove(t.id)
				}
				else this.unload(t.id)
			})
			
			nodes.forEach((newNode, i) => {
				if (this.objects.has(newNode.id)) {
					this.load(newNode.id, newNode.data())
				} else {
					this.add(newNode)
				}
			})
		});
		
		graph.on('node:update', ({ id, data }) => {
			if (this.objects.has(id)) {
				this.get(id).update(data)
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
	
	loadTiles(nodes) {
		if (this.objects.size < nodes.length) {
			
			nodes.forEach((newNode, i) => {
				if (this.objects.has(newNode.id)) {
					this.objects.get(newNode.id).attachNode(newNode)
				} else {
					this.add(newNode)
				}
			})
		}
	}
	
	add(node) {
		if (node.type !== 'tile') {
			console.warn('node', node)
			throw new Error('No object type in layer add');
		}
		
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