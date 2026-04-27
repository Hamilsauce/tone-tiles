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
    // const prev = { x: this.x, y: this.y };
    // const prevDir = this.#travelDir;
    
    super.update(patch);
    this.advanceRotation()
    // const curr = { x: this.x, y: this.y };
    
    // this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';
    
    
    
    
    // const turnDegree = directionPivot[prevDir][this.#travelDir]
    
    // this.#currentRotation = this.#currentRotation + turnDegree
    // const ismoving = patch && !!patch.isMoving
    // // console.warn('this.#currentRotation', this.#currentRotation)
    // this.#ticker = this.#ticker === 0 ? 1 : 0;
    // this.phase = (this.phase + 1) % 4;
    // let _angles = angles
    
    // if (this.#travelDir === 'left' || this.#travelDir === 'left') {
    //   _angles = [...angles].reverse()
    // }
    // const angle = turnDegree === 0 ? _angles[this.phase] : 0;
    // this.rotateTo(rotation + angle, 0.5, 0.5);
    
  }
  
  advanceRotation(dr) {
    const change = (dr ?? this.#rotationStep) * this.#rotationMod;
    this.#rotation = this.#rotation + change;
console.warn('this.#rotation', this.#rotation)    
    this.rotateTo(this.#rotation, 0.5, 0.5);
  }
}