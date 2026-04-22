import { TileObject } from './TileObject.js';
import { SceneLayer } from './SceneLayer.js';
const loadLogs = [];
window.loadLogs = loadLogs;

export class TileLayer extends SceneLayer {
  #name = null;
  cancelSub;
  #rows = new Map();

  constructor(ctx, options = {}) {
    const { objects, ...opts } = options;

    super(ctx, 'tile', opts);
    this.#name = 'tile';

    if (objects) {
      this.loadTiles(objects);
    }

    this.applyNodePatch = this.applyNodePatch.bind(this);
  };

  get name() {
    return this.#name;
  }

  applyNodePatch({ id, data }) {
    if (this.objects.has(id)) this.get(id).update(data);
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
      if (t.linkedMap) this.remove(t.id);
      else this.unload(t.id);
    });

    this.loadTiles(nodes);
  };

  loadTiles(nodes) {
    nodes.forEach((newNode, i) => {
      if (this.objects.has(newNode.id)) {
        this.load(newNode.id, newNode.data());
      } else {
        this.add(newNode);
      }
    });
  }

  addRow(y) {
    const rowId = `row_${y}`;

    if (this.#rows.has(rowId)) {
      return this.#rows.get(rowId)
    }

    const rowObj = this.context.createObject('group', { id: rowId, model: { y, x: 0 } });
    this.#rows.set(rowId, rowObj)
    this.dom.appendChild(rowObj.dom);

    return rowObj;
  }

  getRow(y) {
    const rowId = `row_${y}`;
    return this.#rows.get(rowId) ?? null;
  }

  add(node) {
    if (node.type !== 'tile') {
      throw new Error('No object type in layer add');
    }

    const cObj = new TileObject(this.context, { id: node.id, model: node.data() });

    this.objects.set(cObj.id, cObj);

    const row = this.getRow(cObj.y) ?? this.addRow(cObj.y);

    row.appendDOM(cObj)
    this.dom.appendChild(cObj.dom);

    cObj.update();
    this.emit('object:add', cObj);

    return cObj;
  }

  getTileAt(x, y) {
    const address = `${x}_${y}`;

    return this.get(address);
  }
}