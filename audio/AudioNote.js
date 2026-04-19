const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const clampLow = (v) => clamp(v, 0.2, 0.3)

export class AudioNote {
  #toneMode = 'perc';
  #velocity;
  
  constructor(audioCtx, { type = 'sine' } = {}) {
    this.audioCtx = audioCtx;
    this.type = type;
    
    this.startTime = audioCtx.currentTime;
    this.durationTime = 1;
    this.#velocity = 1.0;
    this.frequency = 440;
    
    this._osc = null;
    this._gain = null;
  }
  
  get currentTime() { return this.audioCtx.currentTime }
  
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
  
  stop(time = 0.5) {
    if (!this._osc) return;
    if (!this._gain) return;
    
    const freq = this._osc.frequency.value
    this._gain.gain.cancelScheduledValues(this.currentTime)
    this._gain.gain.setValueAtTime(this._gain.gain.value, this.currentTime); // fade-out
    
    this._gain.gain.linearRampToValueAtTime(0.0001, this.currentTime + time); // fade-out
    // this._osc.frequency.exponentialRampToValueAtTime(freq * 0.97, this.currentTime + time + 0.15); // fade-out
    
    const stopTime = this.currentTime + time + 0.0;
    
    this._osc.stop(stopTime);
    
    this._osc.onended = () => {
      this._osc.disconnect();
      this._gain.disconnect();
    };
    
    return this;
  }
  
  play() {
    const { audioCtx, startTime, durationTime, frequency } = this;
    
    let velocity = clampLow(this.#velocity)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    this.#toneMode = this.#toneMode === 'perc' ? 'soft' : 'perc'
    
    osc.type = this.type;
    osc.frequency.setValueAtTime(frequency + 5, startTime);
    osc.frequency.linearRampToValueAtTime(frequency, startTime + 0.01); // fade-out

    if (this.#toneMode === 'soft') {
      gain.gain.setValueAtTime(0.0, startTime);
      velocity += 0.0065
    }
    
    gain.gain.linearRampToValueAtTime(velocity, startTime + 0.05); // quick fade-in
    gain.gain.linearRampToValueAtTime(0.0, startTime + durationTime); // fade-out
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(startTime);
    // osc.stop(startTime + durationTime);
    this._osc = osc;
    this._gain = gain;
    
    return this;
  }
}