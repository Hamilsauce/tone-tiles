
export class AudioClockLoop {
  #running = false;
  #rafId = null;
  
  #timeSource; // () => seconds
  #lastTime = 0;
  
  #routines = new Set();
  #render;
  
  constructor({
    audioContext = null,
    routines = [],
    render = () => {},
  } = {}) {
    this.#timeSource = audioContext ?
      () => audioContext.currentTime :
      () => performance.now() / 1000;
    
    for (const r of routines) this.#routines.add(r);
    this.#render = render;
  }
  
  get running() { return this.#running; }
  
  addRoutine(fn) {
    this.#routines.add(fn);
    return () => this.#routines.delete(fn);
  }
  
  removeRoutine(fn) {
    return this.#routines.delete(fn);
  }
  
  start() {
    if (this.#running) return;
    this.#running = true;
    
    this.#lastTime = this.#timeSource();
    
    const frame = () => {
      if (!this.#running) return;
      
      const now = this.#timeSource();
      let dt = now - this.#lastTime;
      this.#lastTime = now;
      
      // Clamp dt to avoid explosion after tab stalls
      dt = Math.min(Math.max(dt, 0), 0.1);
      
      for (const routine of this.#routines) {
        routine(dt, now);
      }
      
      this.#render(dt, now);
      
      this.#rafId = requestAnimationFrame(frame);
    };
    
    this.#rafId = requestAnimationFrame(frame);
  }
  
  pause() {
    this.#running = false;
    if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
    this.#rafId = null;
  }
  
  stop() {
    this.pause();
  }
}