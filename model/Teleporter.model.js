import { SpatialModel } from './Spatial.model.js';
import { Point } from '../core/spatial/Point.js';

const DefaultTeleporterOotions = {
  type: 'teleporter',
  id: null,
  target: { x: 0, y: 0 },
  linkedId: null,
};

export class TeleporterModel extends SpatialModel {
  #target;
  constructor({ target, ...options } = DefaultTeleporterOotions) {
    super({
      ...options,
    });
    
    this.#target = { x: 0, y: 0 };
    
  }
}