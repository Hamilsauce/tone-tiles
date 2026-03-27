export class CanvasPoint {
  #self = new DOMPoint();
  
  constructor(x = 0, y = 0) {
    this.#self.x = x;
    this.#self.y = y;
  }
  
  get x() { return this.#self.x }
  get y() { return this.#self.y }
  
  toDOMPoint() {
    return this.#self
  }
  
  transform(matrix) {
    const p = this.#self.matrixTransform(matrix)
    return new CanvasPoint(p.x, p.y)
  }
  
  lerp(to, t) {
    return new CanvasPoint(
      this.x + (to.x - this.x) * t,
      this.y + (to.y - this.y) * t
    )
  }
}