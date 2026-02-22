const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const clampLow = (v) => clamp(v, 0.2, 0.3)
export class AudioNote {
  #toneMode = 'perc';
  #velocity;
  
  constructor(audioCtx, { type = "sine" } = {}) {
    this.audioCtx = audioCtx;
    this.type = type;
    
    this.startTime = audioCtx.currentTime;
    this.durationTime = 1;
    this.#velocity = 1.0;
    this.frequency = 440;
    
    this._osc = null;
    this._gain = null;
  }
  
  at(time) {
    this.startTime = time;
    return this;
  }
  
  frequencyHz(freq) {
    this.frequency = freq;
    return this;
  }
  
  duration(seconds) {
    this.durationTime = seconds;
    return this;
  }
  
  velocity(value) {
    this.#velocity = value;
    return this;
  }
  
  play() {
    const { audioCtx, startTime, durationTime, frequency } = this;
    
    let velocity = clampLow(this.#velocity)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    this.#toneMode = this.#toneMode === 'perc' ? 'soft' : 'perc'

    osc.type = this.type;
    osc.frequency.setValueAtTime(frequency, startTime);
    
    if (this.#toneMode === 'soft') {
      gain.gain.setValueAtTime(0.0, startTime);
      velocity += 0.05
    }
    
    gain.gain.linearRampToValueAtTime(velocity, startTime + 0.035); // quick fade-in
    gain.gain.setValueAtTime(velocity, startTime + durationTime - 0.02);
    gain.gain.linearRampToValueAtTime(0.0, startTime + durationTime); // fade-out
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + durationTime);
    this._osc = osc;
    this._gain = gain;
    
    return this;
  }
}