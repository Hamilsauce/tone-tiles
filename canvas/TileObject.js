import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class TileObject extends CanvasObject {
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const node = options.model;

    options.id = node.id ?? node.address;

    super(ctx, 'tile', options);
  };
}
