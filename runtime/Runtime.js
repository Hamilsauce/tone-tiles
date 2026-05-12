import '../model/index.js';
import { ModelTypes } from '../core/types/model.types.js';
import { SceneModel } from '../model/Scene.model.js';
import { LoopEngine } from '../core/loop-engine/index.js';
import { createTempoControl } from '../core/loop-engine/tempo-control.js';
import { audioEngine } from '../audio/index.js';
import { SVGCanvas } from '../canvas/SVGCanvas.js';
import { watch, toValue } from 'vue';
import { rxjs } from 'rxjs';

const { operators } = rxjs;
const { concatMap, filter, share } = operators;
// import { createTempoControl } from './tempo-control.js';

const defaultConfig = {
  collections: [
    { name: ModelTypes.GRAPH, },
    { name: ModelTypes.ENTITIES, },
  ],
};

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
    
    this.svgCanvas = new SVGCanvas();
    
    this.scene = new SceneModel({
      loopEngine: this.loopEngine,
      collections: runtimeConfig.collections,
      userEvents$: this.svgCanvas.out({})
        .pipe(
          filter(_ => appStore.isRunning.value === true)
        ),
    });
    
    
    createTempoControl({
      loop: this.loopEngine,
    });
    
    this.loopEngine.start();
    
    
    // const unwatchCurrentMap = watch(mapStore.currentMap, (newMap, oldMap) => {
    //   if (!newMap.id) return;
      
    //   const mapData = toValue(newMap);
    //   console.warn('[[[[[mapData]]]]]', mapData)
    //   this.scene.getColl(ModelTypes.GRAPH).fromMap(mapData);
    // }, { immediate: true });
    
    // const unwatchIsRunning = watch(appStore.isRunning, (newVal, oldVal) => {
    //   if (newVal === true && oldVal === false) {
    //     this.loopEngine.start();
    //   }
      
    //   if (newVal === false && oldVal === true) {
    //     this.loopEngine.pause();
    //   }
    // }, { immediate: true });
    
    
  };
  // get prop() { return this._prop };
  // set prop(newValue) { this._prop = newValue };
}