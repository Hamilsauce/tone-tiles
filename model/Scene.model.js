import { CollectionRegistry } from '../core/types/collection-registry.js';
// import { ModelRegistry } from '../core/types/model-registry.js';

import { createConnectionBus } from '../core/create-connection.js';
import { rxjs } from 'rxjs';
// import { audioEngine } from '../audio/index.js';

const { operators } = rxjs;
const { map, tap, scan, shareReplay, withLatestFrom } = operators;

export class SceneModel {
  #inputs
  #collections = new Map();
  
  constructor({ registry, inputs$ = [], loopEngine, collections = [] }) {
    this.loopEngine = loopEngine
    this.registry = registry
    
    this.#inputs = createConnectionBus(this);
    
    collections.forEach(({ name }) => {
      this.createCollection(name, {})
    });
    
    inputs$.forEach(({ name, source$ }) => {
      this.in({ name, source$ })
    });
    
    const worldState$ = this.out({}).pipe(
      scan((state, event) => {
        switch (event.type) {
          case 'traversal:move':
            state.entities[event.id] = state.entities[event.id] ?? {}
            state.entities[event.id].point = event.point;
            return state;
            
          case 'node:update':
            // apply patch
            return state;
            
          default:
            return state;
        }
      }, { entities: {} }),
      shareReplay(1)
    );
    
    const frame$ = this.loopEngine.tick$.pipe(
      withLatestFrom(worldState$),
      map(([tick, state]) => ({
        ...tick,
        state
      })),
      tap(x => console.log('worldState$: ', x)),
    ) // .subscribe();
  };
  
  in(options) { /* placeholder for cxn bus */ }
  
  out(options) { /* placeholder for cxn bus */ }
  
  getColl(name, options = {}) {
    return this.#collections.get(name)
  }
  
  createCollection(name, options) {
    const CollectionClass = CollectionRegistry.get(name);

    if (!CollectionClass) {
      const typeLabel = typeof type === 'symbol' ?
        (type.description ?? type.toString()) :
        String(type);
      throw new Error(`Unknown Coll type: ${typeLabel}`);
    }
    
    const coll = new CollectionClass({
      ...options,
      registry: this.registry,
      loopEngine: this.loopEngine,
    });
    
    this.#collections.set(name, coll);
    
    this.in({ name, source$: coll.out({}) })
    coll.in({ name, source$: this.out({}) })
    
    return coll;
  }
  
}