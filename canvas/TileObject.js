import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class TileObject extends CanvasObject {
	
	constructor(ctx, name, options = DefaultCanvasObjectOptions) {
		super(ctx, 'tile', options);
	};
}