const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class GlideVoice {
  constructor(audioCtx, {
    type = 'sine',
    attackTime = 0.025,
    destination = audioCtx.destination,
  } = {}) {
    this.audioCtx = audioCtx;
    this.type = type;
    this.attackTime = attackTime;
    this.destination = destination;
    
    this.osc = null;
    this.gain = null;
    this.velocity = 0.18;
    this.frequency = null;
  }
  
  get currentTime() {
    return this.audioCtx.currentTime;
  }
  
  get isActive() {
    return !!this.osc && !!this.gain;
  }
  
  start(frequency, velocity = this.velocity) {
    this.dispose();
    
    const now = this.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const level = clamp(velocity, 0.12, 0.28);
    
    osc.type = this.type;
    osc.frequency.setValueAtTime(frequency + 3, now);
    osc.frequency.linearRampToValueAtTime(frequency, now + 0.02);
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + this.attackTime);
    
    osc.connect(gain);
    gain.connect(this.destination);
    osc.start(now);
    
    this.osc = osc;
    this.gain = gain;
    this.velocity = level;
    this.frequency = frequency;
    
    return this;
  }
  
  glideTo(frequency, glideTime = 0.08) {
    if (!this.isActive) {
      return this.start(frequency, this.velocity);
    }
    
    const now = this.currentTime;
    const safeGlideTime = Math.max(glideTime, 0.01);
    const currentFrequency = this.osc.frequency.value || this.frequency || frequency;
    
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(currentFrequency, now);
    this.osc.frequency.linearRampToValueAtTime(frequency, now + safeGlideTime);
    this.frequency = frequency;
    
    return this;
  }
  
  release(releaseTime = 0.16) {
    if (!this.isActive) {
      return this;
    }
    
    const now = this.currentTime;
    const safeReleaseTime = Math.max(releaseTime, 0.02);
    const stopTime = now + safeReleaseTime + 0.02;
    
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value || 0.0001, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + safeReleaseTime);
    
    try {
      this.osc.stop(stopTime);
    } catch (error) {
      return this.dispose();
    }
    
    this.osc.onended = () => {
      this.dispose();
    };
    
    return this;
  }
  
  dispose() {
    if (this.osc) {
      this.osc.onended = null;
      
      try {
        this.osc.disconnect();
      } catch (error) {}
    }
    
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch (error) {}
    }
    
    this.osc = null;
    this.gain = null;
    this.frequency = null;
    
    return this;
  }
}
