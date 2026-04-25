import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';

const dirRotationMap = {
  up: 180,
  down: 0,
  left: 90,
  right: -90
}

const directionPivot = {
  up: {
    up: 0,
    down: 180,
    left: -90,
    right: 90
  },
  down: {
    up: 180,
    down: 0,
    left: 90,
    right: -90
  },
  left: {
    up: 90,
    down: -90,
    left: 0,
    right: 180
  },
  right: {
    up: -90,
    down: 90,
    left: 180,
    right: 0,
  },
}

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
};

const angles = [0, -45, 0, 45]


export class CanvasActor extends CanvasObject {
  #entityModel = null;
  #ticker = 0;
  #travelDir = 'down';
  #currentRotation = 0;

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
    return this.#entityModel?.currentPoint ?? this.point;
  }

  get goalNode() {
    return this.#entityModel?.goalNode ?? null;
  }

  get goalPoint() {
    return this.#entityModel?.goalPoint ?? null;
  }

  update(patch) {
    const prev = this.point;
    const prevDir = this.#travelDir;

    super.update(patch);

    const curr = this.point;

    this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';

    const rotation = dirRotationMap[this.#travelDir]
    const turnDegree = directionPivot[prevDir][this.#travelDir]

    this.#currentRotation = this.#currentRotation + turnDegree
    const ismoving = patch && !!patch.isMoving
    // console.warn('this.#currentRotation', this.#currentRotation)
    this.#ticker = this.#ticker === 0 ? 1 : 0;
    this.phase = (this.phase + 1) % 4;
    let _angles = angles

  if (this.#travelDir === 'left' || this.#travelDir === 'left') {
      _angles = [...angles].reverse()
    }
    const angle = turnDegree === 0 ? _angles[this.phase] : 0;
    // this.rotateTo(rotation + angle, 0.5, 0.5);

    this.rotateTo(this.#currentRotation + angle, 0.5, 0.5);
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
