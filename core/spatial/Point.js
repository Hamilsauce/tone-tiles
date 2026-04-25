export class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;

    Object.freeze(this); // makes it immutable
  }

  // --- basic helpers ---

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }

  toKey() {
    return `${this.x}_${this.y}`;
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }

  // --- transforms (return new Points) ---

  translate(dx, dy) {
    return new Point(this.x + dx, this.y + dy);
  }

  add(other) {
    return new Point(this.x + other.x, this.y + other.y);
  }

  subtract(other) {
    return new Point(this.x - other.x, this.y - other.y);
  }

  lerp(to, t) {
    const point = Point.from(to);

    return new Point(
      this.x + (point.x - this.x) * t,
      this.y + (point.y - this.y) * t
    );
  }

  // --- static helpers ---

  static from(obj) {
    if (Point.isPoint(obj)) return obj;
    if (Point.isPointLike(obj)) return new Point(obj.x, obj.y);
    return new Point();
  }

  static isPoint(obj) {
    return obj instanceof Point;
  }

  static isPointLike(obj) {
    return obj && typeof obj.x === 'number' && typeof obj.y === 'number';
  }

  static zero() {
    return new Point(0, 0);
  }
}