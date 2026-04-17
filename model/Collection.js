import { Model } from '../model/Model.js';
import { rxjs } from 'rxjs';
const { fromEvent, operators, Subject } = rxjs;


export class Collection {
  #models = new Map();
  
  // internal input (models push here)
  #input$ = new Subject();
  
  // exposed output (downstream systems subscribe here)
  #output$ = new Subject();
  
  // constructor() {
  //   this.#wire();
  // }
  constructor({ registry = new Map() } = {}) {
    this.#registry = registry;
  }
  
  create(type, options) {
    const ModelClass = this.#registry.get(type);
    
    if (!ModelClass) {
      throw new Error(`Unknown model type: ${type}`);
    }
    
    const model = new ModelClass({
      ...options,
      emitCallback: this.#createEmitter(),
    });
    
    this.add(model);
    return model;
  }
  // --- Public API ---
  
  get output$() {
    return this.#output$.asObservable();
  }
  
  add(model) {
    this.#models.set(model.id, model);
  }
  
  remove(id) {
    this.#models.delete(id);
  }
  
  get(id) {
    return this.#models.get(id);
  }
  
  getAll() {
    return this.#models;
  }
  
  // factory helper so models get the emit function
  createModel(ModelClass, options) {
    const model = new Model({
      ...options,
      emitCallback: this.#createEmitter(),
    });
    
    this.add(model);
    return model;
  }
  
  // --- Internal wiring ---
  
  #wire() {
    this.#input$.subscribe((event) => {
      // pass-through for now
      // later: transform → actions, enrich, filter, etc.
      this.#output$.next(event);
    });
  }
  
  // gives models a safe way to emit into collection
  #createEmitter() {
    return (event) => {
      this.#input$.next(event);
    };
  }
}