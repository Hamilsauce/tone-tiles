import { ModelRegistry } from '../core/types/model-registry.js';
import { rxjs } from 'rxjs';
const { operators, Subject } = rxjs;
const { filter, shareReplay, distinctUntilChanged } = operators;

export class Collection {
  #models = new Map();
  #registry;
  #input$ = new Subject();
  #output$ = new Subject();

  constructor({ registry = ModelRegistry } = {}) {
    this.#registry = registry;
    this.#wire();
  }

  create(type, options) {
    const ModelClass = this.#registry.get(type);
    if (!ModelClass) {
      const typeLabel = typeof type === 'symbol'
        ? (type.description ?? type.toString())
        : String(type);
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

  get output$() {
    return this.#output$.asObservable();
  }

  add(model) {
    this.#models.set(model.id, model);
  }

  remove(id) {
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

  connect(eventType = null) {
    return this.#output$.asObservable()
      .pipe(
        filter(({ type }) => eventType ? type.includes(eventType) : true),
        // map(selectorFn),
        distinctUntilChanged( /* TODO Put something good here */),
        shareReplay({ bufferSize: 1, refCount: true })
      );
  }

  // gives models a safe way to emit into collection
  emit(event) {
    this.#input$.next(event);
    return this;
  }

  // --- Internal wiring ---

  #wire() {
    this.#input$.subscribe((event) => {
      // pass-through for now
      // later: transform → actions, enrich, filter, etc.
      this.#output$.next(event);
    });
  }

  #createEmitter() {
    return (event) => {
      this.#input$.next(event);
    };
  }
}
