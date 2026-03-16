import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

export class SceneLayer extends CanvasObject {
  #name = null
  #objects = new Nap()
  
  constructor(ctx, name, options = {}) {
    super(ctx, 'layer', options);
    const models = options.models;
    
    this.#name = name;
  };
  
  add(obj) {
    if (!(obj instanceof CanvasObject)) {
      throw new Error("SceneLayer can only contain CanvasObjects");
    }
    
    this.#objects.set(obj.id, obj);
    this.dom.appendChild(obj.dom);
    
    this.emit('object:add', obj);
  }
  
  remove(id) {
    const obj = this.#objects.get(id);
    if (!obj) return;
    
    obj.remove();
    this.#objects.delete(id);
    
    this.emit('object:remove', obj);
  }
  
  get(id) {
    return this.#objects.get(id);
  }
  
  forEach(fn) {
    this.#objects.forEach(fn);
  }
  
  clear() {
    for (const obj of this.#objects.values()) {
      obj.remove();
    }
    this.#objects.clear();
  }

  sort(compareFn) {
    const sorted = [...this.#objects.values()].sort(compareFn)
    
    sorted.forEach(obj => {
      this.el.appendChild(obj.el)
    })
  }
  
  serialize() {
    return [...this.#objects.values()].map(o => o.toJSON())
  }
}