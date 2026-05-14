import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';
import { getDirectionFromPoints } from '../core/spatial/utils.js';
import ham from 'ham';
const { sleep } = ham;

const dirRotationMap = {
  up: 180,
  down: 0,
  left: 90,
  right: -90
};

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
};

const DefaultCanvasActorModel = {
  x: 0,
  y: 0,
  moving: false,
  teleporting: false,
  isTraversing: false,
};

const angles2 = [0, 0, -20, -50, -75, -20, -50, -75, -90, -90, -75, -50, -20, 0, 0];
const angles = [0, -50, -50, 0];


export class CanvasActor extends CanvasObject {
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

  move() {
    const copies = new Array(5).fill().map(() => this.dom.cloneNode(true));

    copies.forEach(async (copy, i) => {
      75 * i && await sleep(50 * i);
      copy.style.opacity = 0.5 - (0.1 * i);
      this.dom.parentNode.appendChild(copy);
      copy.setAttribute('transform', this.dom.getAttribute('transform'));
      await sleep(500);
      copy.remove();
    });

  }

  recoil(time) {
    const prev = this.#travelDir;
    const curr = { x: this.x, y: this.y };
    const prevDir = this.#travelDir;

    this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';

    const turnDegree = directionPivot[prevDir][this.#travelDir];
    const ang = this.phase === 0 ? 65 : -65;

    // this.toggle({ recoiling: true }, { time: 500 });

    this.rotateTo(this.#currentRotation + ang, 0.0, 0.0);
    this.phase = this.phase === 0 ? 1 : 0;
  }

  update(patch) {
    const prev = { x: this.x, y: this.y };
    // const curr = { x: this.x, y: this.y };
    const prevDir = this.#travelDir;

    super.update(patch);
    // console.warn(this.dom);
    const curr = { x: this.x, y: this.y };

    this.#travelDir = getDirectionFromPoints(prev, curr) ?? this.#travelDir ?? 'down';

    const rotation = dirRotationMap[this.#travelDir];
    const turnDegree = directionPivot[prevDir][this.#travelDir];

    this.#currentRotation = this.#currentRotation + turnDegree;
    const ismoving = patch && !!patch.isMoving;
    const isTraversing = patch && patch.isTraversing;

    if (isTraversing) {
      this.move();

    }

    this.#ticker = this.#ticker === 0 ? 1 : 0;
    this.phase = (this.phase + 1) % angles.length;
    let _angles = angles;

    if (this.#travelDir === 'left' || this.#travelDir === 'left') {
      _angles = [...angles]//.reverse();
    }

    const angle = turnDegree === 0 ? _angles[this.phase] : 0;
    this.rotateTo(this.#currentRotation + angle, 0.0, 0.0);
  }
}