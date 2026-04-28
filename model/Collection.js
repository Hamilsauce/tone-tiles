import { ModelRegistry } from '../core/types/model-registry.js';
import { createConnectionBus } from '../core/create-connection.js';

export class Collection {
  #models = new Map();
  #routineUnsubs = new Map();
  #registry;
  #loopEngine;
  #bus;
  
  constructor({ loopEngine, registry } = {}) {
    this.#registry = registry;
    this.#loopEngine = loopEngine;
    this.#bus = createConnectionBus(this);
  }
  
  in() {
    console.warn('Collection.in() is not implemented yet');
  }
  
  out() {
    console.warn('Collection.out() is not implemented yet');
  }
  
  create(type, options) {
    const ModelClass = this.#registry.get(type);
    if (!ModelClass) {
      const typeLabel = typeof type === 'symbol' ?
        (type.description ?? type.toString()) :
        String(type);
      throw new Error(`Unknown model type: ${typeLabel}`);
    }
    
    const model = new ModelClass({
      ...options,
      emitCallback: this.#createEmitter(),
    });
    
    this.add(model);
    return model;
  }
  
  get registry() {
    return this.#registry;
  }
  
  add(model) {
    if (model.step) {
      this.#routineUnsubs.set(model.id, this.#loopEngine.addRoutine(model.step))
    }
    
    this.#models.set(model.id, model);
  }
  
  remove(id) {
    if (this.#routineUnsubs.has(id)) {
      this.#routineUnsubs.get(id)();
    }
    
    this.#models.delete(id);
  }
  
  clear() {
    this.#models.clear();
  }
  
  get(id) {
    return this.#models.get(id);
  }
  
  has(id) {
    return this.#models.has(id);
  }
  
  getAll() {
    return this.#models;
  }
  
  createModel(ModelClass, options) {
    const model = new ModelClass({
      ...options,
      emitCallback: this.#createEmitter(),
    });
    
    this.add(model);
    return model;
  }
  
  // gives models a safe way to emit into collection
  emit(event) {
    this.#bus.emit(event);
    return this;
  }
  
  #createEmitter() {
    return (event) => {
      this.emit(event);
    };
  }
}