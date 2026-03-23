import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { GraphNode } from '../lib/graph.model.js';

export class TileObject extends CanvasObject {
	#node
	
	constructor(ctx, options = DefaultCanvasObjectOptions) {
		if (options.model && !(options.model instanceof GraphNode)) {
			throw new Error(`Must init TileObject with GraphNode Model. Received: ${JSON.stringify(options.model, null, 2)}`)
		}
		
		const node = options.model;
		
		options.model = node.data();
		options.id = node.address;
		options.address = node.address;
		
		super(ctx, 'tile', options);
		
		this.#node = node;
		this.#node.on('node:update', ({ id, data }) => {
			this.update({ ...data })
		})
	};
}