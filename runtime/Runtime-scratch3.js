import { ModelTypes } from '../core/types//model.types.js';

import { ModelRegistry } from '../core/types/model-registry.js';
import { CollectionRegistry } from '../core/types/collection-registry.js';
// import { ModelTypes } from './core/types/model.types.js';

import '../model/index.js';

import { SceneModel } from '../model/Scene.model.js';
import { LoopEngine } from '../core/loop-engine/index.js';
import { audioEngine } from '../audio/index.js';

const defaultConfig = {
  collections: [
    { name: ModelTypes.GRAPH, },
    { name: ModelTypes.ENTITIES, },
  ],
}

export class Runtime {
  constructor({
    appStore = null,
    mapStore = null,
    config = {},
  }) {
    this.appStore = appStore;
    this.mapStore = mapStore;
    this.audioEngine = audioEngine;
    
    this.loopEngine = new LoopEngine({
      audioContext: this.audioEngine.ctx,
    });
    
    
    this.scene = new SceneModel({
      // registry: ModelRegistry,
      loopEngine: this.loopEngine,
      collections: [
        { name: ModelTypes.GRAPH, },
        { name: ModelTypes.ENTITIES, },
      ],
    });
    
  };
  // get prop() { return this._prop };
  // set prop(newValue) { this._prop = newValue };
}