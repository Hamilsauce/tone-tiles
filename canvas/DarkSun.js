import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';
import { DefaultActorProperties } from '../model/Actor.model.js';

const directionPivot = {
  up: {
    down: -1,
    left: -1,
    right: 1
  },
  down: {
    up: -1,
    left: 1,
    right: -1
  },
  left: {
    up: 1,
    down: -1,
    right: -1
  },
  right: {
    up: -1,
    down: 1,
    left: -1,
  },
};

const DefaultCanvasDarkSunModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
  isTraversing: false,
};


export class DarkSun extends CanvasObject {
  #ticker = 0;
  #travelDir = 'down';
  #currentRotation = 0;
  #rotation = 0;
  #rotationMod = 1;
  #rotationStep = 100;

  constructor(ctx, options = DefaultCanvasDarkSunModel) {
    const model = {
      ...DefaultCanvasDarkSunModel,
      ...(options.model ?? {}),
    };

    super(ctx, 'dark-sun', {
      ...options,
      model,
    });

    this.phase = 0;

    this.scaleTo(1.5);
  }

  recoil(time) {
    const prev = this.#travelDir;
    const curr = { x: this.x, y: this.y };
    const prevDir = this.#travelDir;

    this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';

    const turnDegree = directionPivot[prevDir][this.#travelDir];
    const ang = this.phase === 0 ? 65 : -65;

    this.toggle({ recoiling: true }, { time: 500 });

    this.rotateTo(this.#currentRotation + ang, 0.0, 0.0);
    this.phase = this.phase === 0 ? 1 : 0;
  }


  update(patch) {
    if (patch && patch.point) {
      const prevDir = this.#travelDir;
      this.#travelDir = getDirectionFromPoints(this.point, patch.point) ?? this.#travelDir;

      if (prevDir !== this.#travelDir) {
        this.#rotationMod = directionPivot[prevDir][this.#travelDir];
      }
    }

    super.update(patch);
    this.advanceRotation();

    return this;
  }

  advanceRotation(dr) {
    const change = (dr ?? this.#rotationStep) * this.#rotationMod;

    this.#rotation = this.#rotation + change;

    this.rotateTo(this.#rotation);
  }
}