import { TileObject } from './TileObject.js';
import { SceneLayer } from './SceneLayer.js';

export class TileLayer extends SceneLayer {
	#name = null;
	#objects = new Map();

	constructor(ctx, options = {}) {
		const { objects, ...opts } = options;

		super(ctx, 'tile', opts);

		this.#name = 'tile';

		if (objects) {
			objects.forEach(this.add);
		}
	};

	add(node) {
		if (node.type !== 'tile') {
			console.warn('node', node)
			throw new Error('No object type in layer add');
		}

		const cObj = new TileObject(this.context, { id: node.id, model: node })

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