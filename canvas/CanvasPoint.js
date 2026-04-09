export class CanvasPoint {
  #x = 0;
  #y = 0;

  constructor(x = 0, y = 0) {
    this.#x = Number(x);
    this.#y = Number(y);
  }

  static from(value) {
    if (value instanceof CanvasPoint) {
      return value;
    }

    if (!value || value.x === undefined || value.y === undefined) {
      return new CanvasPoint();
    }

    return new CanvasPoint(value.x, value.y);
  }

  get x() { return this.#x; }

  get y() { return this.#y; }

  get key() {
    return `${this.x}_${this.y}`;
  }

  equals(other) {
    if (!other) return false;

    const point = CanvasPoint.from(other);
    return this.x === point.x && this.y === point.y;
  }

  clone() {
    return new CanvasPoint(this.x, this.y);
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
    };
  }

  toDOMPoint() {
    return new DOMPoint(this.x, this.y);
  }

  transform(matrix) {
    const p = this.toDOMPoint().matrixTransform(matrix);
    return new CanvasPoint(p.x, p.y);
  }

  lerp(to, t) {
    const point = CanvasPoint.from(to);

    return new CanvasPoint(
      this.x + (point.x - this.x) * t,
      this.y + (point.y - this.y) * t
    );
  }
}
