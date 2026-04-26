import { createConnectionBus } from '../core/create-connection.js';

const DefaultInputConfig = {
  name: '',
  source$: null
}

const defaultInputOptions = [
  { name: 'entities', source$: null },
  { name: 'graph', source$: null },
]

export class SceneModel {
  #inputs$
  
  constructor({ inputs$ = [] }) {
    this.#inputs = createConnectionBus();
    
    this.#inputs.subscribe((event) => {
      console.warn('SCENE SUB: ', event)
    })
    
    inputs$.forEach(({ name, source$ }) => {
      if (!source$) {
        console.error(' no source$', name)
      }
      
      this.#inputs$.attach(source$, { name })
    })
  };
}