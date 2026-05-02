import { CollectionRegistry } from '../../core/types/collection-registry.js';
import { ModelRegistry } from '../../core/types/model-registry.js';

import { createConnectionBus } from '../../core/create-connection.js';
import { rxjs } from 'rxjs';

const { operators } = rxjs;
const { map, tap, scan, shareReplay, combineLatest } = operators;

export class InteractionResolver {
  #inputs
  #collections = new Map();
  #collectionRegistry;
  #modelRegistry;
  
  constructor({ inputs$ = [] }) {
    this.loopEngine = loopEngine
    
    this.#inputs = createConnectionBus(this);
  
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
    
    // SceneModel is an event aggregator for collection output.
    // Re-emitting scene output back into the same collection creates a
    // synchronous feedback loop through ConnectionBus and freezes startup.
    this.in({ name, source$: coll.out({}) })
    
    return coll;
  }
  
}