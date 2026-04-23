import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
};

const angles = [-40, -0, 20, 40]


export class CanvasActor extends CanvasObject {
  #entityModel = null;
  #ticker = 0;
  
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const model = {
      ...DefaultCanvasActorModel,
      ...(options.model ?? {}),
    };
    
    super(ctx, 'actor', {
      ...options,
      model,
    });
    this.phase = 0;
  }
  
  get entityModel() {
    return this.#entityModel;
  }
  
  get currentNode() {
    return this.#entityModel?.currentNode ?? null;
  }
  
  get currentPoint() {
    return this.#entityModel?.currentPoint ?? this.model.point;
  }
  
  get goalNode() {
    return this.#entityModel?.goalNode ?? null;
  }
  
  get goalPoint() {
    return this.#entityModel?.goalPoint ?? null;
  }
  
  update(patch) {
    super.update(patch);
    this.#ticker = this.#ticker === 0 ? 1 : 0;
    this.phase = (this.phase + 1) % 4;
    const angle = angles[this.phase];
    this.rotateTo(angle, 0.5, 0.5);

    // if (this.#ticker === 0) {
    //   this.rotateTo(angle, 0.5, 0.5);
    // }
    // else {
    //   this.rotateTo(-45, 0.5, 0.5);
      
    // }
  }
  
  configure({ model } = {}) {
    if (model) {
      this.#entityModel = model;
    }
    
    return this;
  }
  
  resetTraversal(startNode) {
    return this.#entityModel?.resetTraversal(startNode);
  }
  
  travelTo(goalNode) {
    return this.#entityModel?.travelTo(goalNode);
  }
  
  stop() {
    return this.#entityModel?.stop();
  }
}