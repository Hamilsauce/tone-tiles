import { SpatialModel } from './Spatial.model.js';
import { TRAVERSABLE_TILE_TYPES } from '../core/tile-utils.js';

const DetaultGraphNodeProperties = {
  type: 'node',
  id: null,
  tileType: null,
  x: null,
  y: null,
  address: null,
  target: null,
  current: false,
  active: false,
  isPathNode: false,
  isVisited: false,
  linkedNodeAddress: null,
  linkedMap: null,
  selected: false,
  isLink: false,
  dir: null,
  highlight: false,
};

export class GraphNodeModel extends SpatialModel {
  #objects = new Set();

  constructor(options = {}) {
    const properties = {
      ...DetaultGraphNodeProperties,
      ...(options.properties ?? {}),
    };

    super({
      ...options,
      id: options.id ?? properties.id,
      type: options.type ?? properties.type,
      point: options.point ?? properties.point,
      properties,
    });
  }

  get linkedMap() { return this.properties.linkedMap; }

  get current() { return this.properties.current; }

  get active() { return this.properties.active; }

  get selected() { return this.properties.selected; }

  get tileType() { return this.properties.tileType; }

  set tileType(v) { this.properties.tileType = v; }

  get isTraversable() { return TRAVERSABLE_TILE_TYPES.includes(this.properties.tileType); }

  get address() { return `${this.x}_${this.y}`; }

  get linkedNodeAddress() { return this.properties.target ? [this.properties.target.x, this.properties.target.y].join('_') : null; }

  get target() { return this.properties.target; }

  set target(v) { this.properties.target = v; }

  get isOccupied() { return !!this.#objects.size; }

  get objectCount() { return this.#objects.size; }

  get objectIds() { return [...this.#objects]; }

  addObject(id) {
    this.#objects.add(id);

    this.emit({
      type: 'node:update',
      id: this.id,
      data: { occupied: this.isOccupied },
    });
  }

  deleteObject(id) {
    this.#objects.delete(id);

    this.emit({
      type: 'node:update',
      id: this.id,
      data: { occupied: this.isOccupied },
    });
  }

  hasProp(key) {
    return this.properties[key] !== undefined;
  }

  linkToNode({ x, y }) {
    this.properties.target = { x, y };
  }
}
