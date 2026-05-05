import { CollectionRegistry } from '../core/types/collection-registry.js';
import { ModelRegistry } from '../core/types/model-registry.js';
import { InteractionResolver } from '../core/spatial/InteractionResolver.js';
import { ModelTypes } from '../core/types/model.types.js';

import { createConnectionBus } from '../core/create-connection.js';

export class SceneModel {
  #collections = new Map();
  #collectionRegistry;
  #modelRegistry;
  
  constructor({ registry, inputs$ = [], loopEngine, collections = [] }) {
    this.loopEngine = loopEngine;
    this.#collectionRegistry = CollectionRegistry;
    this.#modelRegistry = registry ?? ModelRegistry;
    
    createConnectionBus(this);
    
    collections.forEach(({ name }) => {
      this.createCollection(name, {});
    });
    
    inputs$.forEach(({ name, source$ }) => {
      this.in({ name, source$ });
    });

    this.resolver = new InteractionResolver({
      entities: this.#collections.get(ModelTypes.ENTITIES),
      graph: this.#collections.get(ModelTypes.GRAPH),
    });

    this.#collections.get(ModelTypes.ENTITIES)
      .in({ name: 'resolver', source$: this.resolver.derived$ });
    this.in({ name: 'resolver', source$: this.resolver.derived$ });
  }
  
  getColl(name, options = {}) {
    return this.#collections.get(name);
  }
  
  createCollection(name, options) {
    const CollectionClass = this.#collectionRegistry.get(name);
    
    if (!CollectionClass) {
      const typeLabel = typeof name === 'symbol' ?
        (name.description ?? name.toString()) :
        String(name);
      throw new Error(`Unknown Coll type: ${typeLabel}`);
    }
    
    const coll = new CollectionClass({
      ...options,
      registry: this.#modelRegistry,
      loopEngine: this.loopEngine,
    });

    this.#collections.set(name, coll);

    this.in({
      name,
      source$: coll.out({
        filter: name === ModelTypes.ENTITIES ?
          (event) => !event.meta?.derived :
          undefined,
      }),
    });
    
    return coll;
  }
}
