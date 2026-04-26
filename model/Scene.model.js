import { createConnectionBus } from '../core/create-connection.js';
import { rxjs } from 'rxjs';
// import { audioEngine } from '../audio/index.js';

const { operators } = rxjs;
const { map, startWith, tap, filter, scan, shareReplay, withLatestFrom } = operators;

const DefaultInputConfig = {
  name: '',
  source$: null
}

const defaultInputOptions = [
  { name: 'entities', source$: null },
  { name: 'graph', source$: null },
]

export class SceneModel {
  #inputs
  
  constructor({ inputs$ = [], loopEngine }) {
    this.loopEngine = loopEngine
    this.#inputs = createConnectionBus();
    
    inputs$.forEach(({ name, source$ }) => {
      if (!source$) {
        console.error(' no source$', name)
        return
      }
      
      this.#inputs.attach(source$, { name })
    });
    
    const worldState$ = this.#inputs.events$.pipe(
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
  
  createCollection(name, options = {}) {
    
  }
}