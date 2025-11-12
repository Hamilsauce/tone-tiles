export class Viewport {
  #context;
  
  constructor(svgContext) {
    this.#context = svgContext;
  }
  
  get context() { return this.#context }
  get currentTranslation() { return { x: 0, y: 0 } }
  get currentScale() { return { x: 0, y: 0 } }
  get bounds() {
    const vb = this.#context.viewBox;
    const tx = this.currentTranslation.x; // from your transform tracking
    const ty = this.currentTranslation.y;
    const s = currentScale;
    
    return {
      x: -tx / s,
      y: -ty / s,
      width: vb.width / s,
      height: vb.height / s,
    }
  }
  
  isInView(coords) {
    const { x, y, width, height } = this.bounds;
    
    return coords.x >= x &&
      coords.y >= y &&
      coords.x <= width &&
      coords.y <= height;
  }
}