import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';

export class DarkSun extends CanvasObject {
  #ticker = 0;
  #travelDir = 'down';
  #currentRotation = 0;
  #rotation = 0;
  #rotationMod = 1;
  #rotationStep = 100;
  
  constructor(ctx, options = DefaultCanvasObjectOptions) {
    const model = {
      ...{},
      ...(options.model ?? {}),
    };
    
    super(ctx, 'dark-sun', {
      ...options,
      model,
    });
    
    this.phase = 0;
  }
  
  update(patch) {
    super.update(patch);
    this.advanceRotation();
  }
  
  advanceRotation(dr) {
    const change = (dr ?? this.#rotationStep) * this.#rotationMod;
    this.#rotation = this.#rotation + change;
  
    this.rotateTo(this.#rotation, 0.5, 0.5);
  }
}