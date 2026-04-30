import { CanvasObject } from './CanvasObject.js';
import { DEFAULT_TRANSFORMS, DEFAULT_TRANSFORM_MAP } from './TransformList.js';
import { SceneLayer } from './SceneLayer.js';
import { TileLayer } from './TileLayer.js';

export class CanvasScene extends CanvasObject {
  #layers = new Map();
  
  constructor(context, layers = [], options = {}) {
    super(context, 'layer', {
      id: 'scene',
      ...options,
    });
    
    layers.forEach(l => {
      this.addLayer(l)
    })
  }
  
  // --- Layer Management ---
  
  addLayer(layerModel) {
    if (!layerModel?.id) {
      throw new Error('Layer must have an id');
    }
    
    layerModel.name = layerModel.name ?? layerModel.id
    
    const layer = layerModel.name === 'tile' ? new TileLayer(this.context, { ...layerModel, transforms: DEFAULT_TRANSFORM_MAP }) :
      new SceneLayer(this.context, layerModel.name, { ...layerModel, transforms: DEFAULT_TRANSFORM_MAP })
    
    this.#layers.set(layer.name, layer);
    
    // DOM attachment
    this.dom.append(layer.dom);
    layer.show();
    return layer;
  }
  
  removeLayer(layerOrId) {
    const id = typeof layerOrId === 'string' ?
      layerOrId :
      layerOrId?.id;
    
    const layer = this.#layers.get(id);
    if (!layer) return;
    
    this.#layers.delete(id);
    layer.destroy();
  }
  
  getLayer(id) {
    return this.#layers.get(id);
  }
  
  get layers() {
    return [...this.#layers.values()];
  }
  
  // --- Utilities ---
  
  clear() {
    this.layers.forEach(layer => this.removeLayer(layer));
  }
  
  // Optional: iterate all objects across layers
  forEachObject(fn) {
    this.layers.forEach(layer => {
      if (layer.objects) {
        layer.objects.forEach(fn);
      }
    });
  }
  
  // --- Render hook (optional) ---
  
  render() {
    // Scene itself usually doesn’t render anything,
    // but this keeps consistency with CanvasObject API
    // and allows future global transforms if needed.
  }
}