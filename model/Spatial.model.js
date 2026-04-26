import { Model } from './Model.js';
import { Point } from '../core/spatial/Point.js';
import { EventTypes } from '../core/types/event.types.js';

export class SpatialModel extends Model {
  #point;

  constructor({ point, ...rest }) {
    if (!(Point.isPoint(point) || Point.isPointLike(point))) {
      throw new Error(`SpatialModel requires a valid point: ${JSON.stringify(point)}`);
    }

    super({ ...rest });

    this.#point = Point.from(point);

    // this.toJSON = this.toJSON.bind(this);
  }

  // --- getters ---

  get point() {
    return this.#point;
  }

  get x() {
    return this.#point.x;
  }

  get y() {
    return this.#point.y;
  }

  syncPoint(nextPoint) {
    const prev = this.#point;
    const normalized = Point.from(nextPoint);
    // console.warn({ prev, nextPoint, normalized });
    // const normalized = nextPoint instanceof Point ?
    //   nextPoint :
    //   new Point(nextPoint?.x ?? 0, nextPoint?.y ?? 0);

    // if (prev?.x === normalized.x && prev?.y === normalized.y) {
    if (this.#point.equals(normalized)) {
      return null;
    }

    this.#point = normalized;

    return {
      prevPoint: prev,
      point: normalized,
    };
  }

  // --- core spatial ops ---

  setPoint(nextPoint, meta) {
    const result = this.syncPoint(nextPoint);

    if (!result) {
      return this;
    }

    this.emit({
      type: this.type,
      kind: EventTypes.UPDATE,
      payload: {
        id: this.id,
        point: result.point,
        prevPoint: result.prevPoint,
      },
      meta,
    });

    return this;
  }

  translate(dx, dy, meta) {
    this.setPoint(
      this.point.translate(dx, dy),
      meta
    );
  }

  // optional but useful
  setXY(x, y, meta) {
    this.setPoint(new Point(x, y), meta);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      point: this.point,
    };
  }
}
