import '../model/index.js';

import { ModelTypes } from '../core/types/model.types.js';

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
    const runtimeConfig = {
      ...defaultConfig,
      ...config,
      collections: config.collections ?? defaultConfig.collections,
    };

    this.appStore = appStore;
    this.mapStore = mapStore;
    this.audioEngine = audioEngine;
    
    this.loopEngine = new LoopEngine({
      audioContext: this.audioEngine.ctx,
    });
    
    
    this.scene = new SceneModel({
      loopEngine: this.loopEngine,
      collections: runtimeConfig.collections,
    });
    
  };
  // get prop() { return this._prop };
  // set prop(newValue) { this._prop = newValue };
}
