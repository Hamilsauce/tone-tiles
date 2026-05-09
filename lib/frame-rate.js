const MAX_SAMPLES = 30;
const DISPLAY_UPDATE_MS = 250;
const MIN_FRAME_MS = 1;

const state = {
  frameTimes: [],
  frameTimeSum: 0,
  elapsedMs: 0,
  displayFps: 0,
  pushFrameTime(deltaMs) {
    const frameTime = Math.max(deltaMs, MIN_FRAME_MS);
    
    this.frameTimes.push(frameTime);
    this.frameTimeSum += frameTime;
    
    if (this.frameTimes.length > MAX_SAMPLES) {
      this.frameTimeSum -= this.frameTimes.shift();
    }
  },
  get averageFrameMs() {
    return this.frameTimes.length ? this.frameTimeSum / this.frameTimes.length : 0;
  },
  get smoothedFps() {
    return this.averageFrameMs ? 1000 / this.averageFrameMs : 0;
  },
};

export const frameRate = (deltaMs = 0) => {
  state.pushFrameTime(deltaMs);
  state.elapsedMs += deltaMs;
  
  if (!state.displayFps || state.elapsedMs >= DISPLAY_UPDATE_MS) {
    state.displayFps = Math.round(state.smoothedFps);
    state.elapsedMs = 0;
  }
  
  return state.displayFps;
};

