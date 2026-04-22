import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { GraphNode } from '../lib/graph.model.js';

export class TileObject extends CanvasObject {
  constructor(ctx, options = DefaultCanvasObjectOptions) {

    const node = options.model;
    options.id = node.address;

    super(ctx, 'tile', options);
  };
}