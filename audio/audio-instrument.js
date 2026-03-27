class Instrument {
  constructor(synth) {
    this.synth = synth
    this.voice = null
    this.mode = "pad" // or "pluck"
  }
  
  play(freq) {
    if (!this.voice) {
      this.voice = new Voice(
        this.synth.ctx,
        this.synth.filter,
        this.synth.lfoGain
      )
    }
    
    const glide = this.mode === "pad" ? 0.15 : 0
    
    this.voice.transitionTo(freq, glide)
    
    if (this.mode === "pad") {
      this.voice.trigger({
        attack: 0.5,
        decay: 1.2,
        sustain: 0.7
      })
    } else {
      this.voice.trigger({
        attack: 0.002,
        decay: 0.1,
        sustain: 0.05
      })
      
      setTimeout(() => this.voice.release(0.2), 120)
    }
  }
  
  stop() {
    this.voice?.release(1.0)
  }
}