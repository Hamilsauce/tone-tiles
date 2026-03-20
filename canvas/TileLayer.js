import { SceneLayer } from './SceneLayer.js';

export class TileLayer extends SceneLayer {
	#name = null
	#objects = new Map()
	
	constructor(ctx, options = {}) {
		const {objects, ...opts} = options;

		super(ctx, 'tile', opts);
		
		this.#name = 'tile';
	
		if (objects) {
			objects.forEach(this.add)
		}
	};
	}