const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);
const nowish = ctx => ctx.currentTime + 0.004;
const dbToGain = db => Math.pow(10, db / 20);
const expScale = (min, max, t) => min * Math.pow(max / min, t);

const DEFAULTS = {
  master: { volume: -9, glide: 0.025, width: 0.72 },
  osc1: { type: 'sawtooth', level: 0.78, octave: 0, detune: -4 },
  osc2: { type: 'square', level: 0.42, octave: 0, detune: 7 },
  noise: { level: 0.015 },
  amp: { attack: 0.008, decay: 0.16, sustain: 0.68, release: 0.34 },
  filter: { type: 'lowpass', cutoff: 6200, resonance: 0.72, env: 2800, keytrack: 0.22, drive: 0.16 },
  filterEnv: { attack: 0.012, decay: 0.20, sustain: 0.18, release: 0.22 },
  lfo: { type: 'sine', rate: 4.8, pitch: 3, filter: 360, amp: 0.015 },
  drive: { amount: 0.16, mix: 0.18 },
  delay: { time: 0.285, feedback: 0.24, mix: 0.16, tone: 4100 },
  reverb: { seconds: 1.7, decay: 2.2, mix: 0.18 },
  limiter: { threshold: -1.2 }
};

const PRESETS = {
  'Warm poly keys': structuredClone(DEFAULTS),
  'Blade glass pad': {
    ...structuredClone(DEFAULTS),
    master: { volume: -12, glide: 0.045, width: 0.95 },
    osc1: { type: 'sawtooth', level: 0.52, octave: 0, detune: -9 },
    osc2: { type: 'triangle', level: 0.62, octave: 1, detune: 11 },
    amp: { attack: 0.46, decay: 0.8, sustain: 0.76, release: 1.8 },
    filter: { type: 'lowpass', cutoff: 2800, resonance: 1.5, env: 1600, keytrack: 0.18, drive: 0.08 },
    filterEnv: { attack: 0.8, decay: 1.2, sustain: 0.55, release: 1.6 },
    lfo: { type: 'sine', rate: 0.18, pitch: 5, filter: 900, amp: 0.018 },
    delay: { time: 0.44, feedback: 0.36, mix: 0.22, tone: 3300 },
    reverb: { seconds: 3.2, decay: 3.4, mix: 0.36 },
    drive: { amount: 0.08, mix: 0.10 },
    limiter: { threshold: -1.2 }
  },
  'Rubber funk lead': {
    ...structuredClone(DEFAULTS),
    master: { volume: -8, glide: 0.075, width: 0.45 },
    osc1: { type: 'sawtooth', level: 0.72, octave: 0, detune: 0 },
    osc2: { type: 'square', level: 0.32, octave: -1, detune: 3 },
    amp: { attack: 0.004, decay: 0.09, sustain: 0.42, release: 0.12 },
    filter: { type: 'lowpass', cutoff: 930, resonance: 7.2, env: 6200, keytrack: 0.38, drive: 0.32 },
    filterEnv: { attack: 0.006, decay: 0.18, sustain: 0.08, release: 0.14 },
    lfo: { type: 'triangle', rate: 5.5, pitch: 2, filter: 90, amp: 0.0 },
    delay: { time: 0.16, feedback: 0.18, mix: 0.10, tone: 2800 },
    reverb: { seconds: 1.1, decay: 1.8, mix: 0.08 },
    drive: { amount: 0.32, mix: 0.35 },
    limiter: { threshold: -1.2 }
  },
  'Solid bass': {
    ...structuredClone(DEFAULTS),
    master: { volume: -7, glide: 0.04, width: 0.2 },
    osc1: { type: 'sawtooth', level: 0.68, octave: -1, detune: 0 },
    osc2: { type: 'square', level: 0.32, octave: -1, detune: -12 },
    noise: { level: 0 },
    amp: { attack: 0.004, decay: 0.12, sustain: 0.62, release: 0.1 },
    filter: { type: 'lowpass', cutoff: 520, resonance: 2.1, env: 2100, keytrack: 0.34, drive: 0.38 },
    filterEnv: { attack: 0.005, decay: 0.16, sustain: 0.22, release: 0.12 },
    lfo: { type: 'sine', rate: 4.2, pitch: 0, filter: 0, amp: 0 },
    delay: { time: 0.22, feedback: 0.0, mix: 0.0, tone: 2500 },
    reverb: { seconds: 0.8, decay: 1.5, mix: 0.0 },
    drive: { amount: 0.42, mix: 0.46 },
    limiter: { threshold: -1.2 }
  },
  'Soft pluck': {
    ...structuredClone(DEFAULTS),
    master: { volume: -10, glide: 0.01, width: 0.72 },
    osc1: { type: 'triangle', level: 0.86, octave: 0, detune: -2 },
    osc2: { type: 'sine', level: 0.25, octave: 1, detune: 4 },
    amp: { attack: 0.003, decay: 0.32, sustain: 0.05, release: 0.42 },
    filter: { type: 'lowpass', cutoff: 3100, resonance: 1.1, env: 1400, keytrack: 0.18, drive: 0.05 },
    filterEnv: { attack: 0.003, decay: 0.22, sustain: 0.03, release: 0.3 },
    lfo: { type: 'sine', rate: 3.8, pitch: 0.8, filter: 40, amp: 0 },
    delay: { time: 0.32, feedback: 0.28, mix: 0.20, tone: 4700 },
    reverb: { seconds: 2.1, decay: 2.4, mix: 0.22 },
    drive: { amount: 0.05, mix: 0.08 },
    limiter: { threshold: -1.2 }
  }
};

let state = structuredClone(DEFAULTS);
let ctx = null;
let synth = null;
let octaveOffset = 0;
const heldComputer = new Map();
const ui = new Map();

class SynthEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.voices = new Map();
    this.voiceOrder = [];
    this.lastMonoNote = null;
    this.activeMonoVoice = null;
    this.noiseBuffer = this.makeNoiseBuffer(2);
    this.output = this.ctx.createGain();
    this.preFx = this.ctx.createGain();
    this.dry = this.ctx.createGain();
    this.driveIn = this.ctx.createGain();
    this.driveShaper = this.ctx.createWaveShaper();
    this.driveWet = this.ctx.createGain();
    this.driveDry = this.ctx.createGain();
    this.delay = this.ctx.createDelay(1.5);
    this.delayFeedback = this.ctx.createGain();
    this.delayTone = this.ctx.createBiquadFilter();
    this.delayWet = this.ctx.createGain();
    this.convolver = this.ctx.createConvolver();
    this.reverbWet = this.ctx.createGain();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.analyser = this.ctx.createAnalyser();
    
    this.analyser.fftSize = 512;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.08;
    
    this.preFx.connect(this.driveIn);
    this.driveIn.connect(this.driveDry);
    this.driveIn.connect(this.driveShaper);
    this.driveShaper.connect(this.driveWet);
    this.driveDry.connect(this.dry);
    this.driveWet.connect(this.dry);
    
    this.dry.connect(this.compressor);
    this.dry.connect(this.delay);
    this.delay.connect(this.delayTone);
    this.delayTone.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delayTone.connect(this.delayWet);
    this.delayWet.connect(this.compressor);
    this.dry.connect(this.convolver);
    this.convolver.connect(this.reverbWet);
    this.reverbWet.connect(this.compressor);
    
    this.compressor.connect(this.output);
    this.output.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    this.applyState(true);
  }
  
  makeNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }
  
  makeImpulse(seconds, decay) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buffer;
  }
  
  distortionCurve(amount) {
    const n = 2048;
    const curve = new Float32Array(n);
    const k = amount * 80;
    for (let i = 0; i < n; i++) {
      const x = i * 2 / n - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }
  
  setParam(path, value) {
    const [group, key] = path.split('.');
    state[group][key] = value;
    this.applyState(false);
  }
  
  applyState(forceImpulse = false) {
    const t = nowish(this.ctx);
    this.output.gain.setTargetAtTime(dbToGain(state.master.volume), t, 0.015);
    this.delay.delayTime.setTargetAtTime(state.delay.time, t, 0.02);
    this.delayFeedback.gain.setTargetAtTime(clamp(state.delay.feedback, 0, 0.92), t, 0.02);
    this.delayWet.gain.setTargetAtTime(state.delay.mix, t, 0.02);
    this.delayTone.type = 'lowpass';
    this.delayTone.frequency.setTargetAtTime(state.delay.tone, t, 0.02);
    this.reverbWet.gain.setTargetAtTime(state.reverb.mix, t, 0.04);
    this.driveShaper.curve = this.distortionCurve(state.drive.amount);
    this.driveShaper.oversample = '4x';
    this.driveWet.gain.setTargetAtTime(state.drive.mix, t, 0.01);
    this.driveDry.gain.setTargetAtTime(1 - state.drive.mix, t, 0.01);
    this.compressor.threshold.setTargetAtTime(state.limiter.threshold, t, 0.02);
    
    if (forceImpulse || !this._lastVerb || Math.abs(this._lastVerb.seconds - state.reverb.seconds) > 0.08 || Math.abs(this._lastVerb.decay - state.reverb.decay) > 0.1) {
      this.convolver.buffer = this.makeImpulse(state.reverb.seconds, state.reverb.decay);
      this._lastVerb = { seconds: state.reverb.seconds, decay: state.reverb.decay };
    }
    
    for (const voice of this.voices.values()) voice.applyLiveParams(t);
  }
  
  noteOn(midi, velocity = 0.85) {
    if (document.getElementById('playMode').value === 'mono') return this.monoNoteOn(midi, velocity);
    const maxVoices = Number(document.getElementById('voices').value);
    while (this.voices.size >= maxVoices) this.stealVoice();
    const voice = new Voice(this, midi, velocity);
    this.voices.set(voice.id, voice);
    this.voiceOrder.push(voice.id);
    voice.start();
    setKeyActive(midi, true);
  }
  
  monoNoteOn(midi, velocity = 0.85) {
    this.lastMonoNote = midi;
    if (this.activeMonoVoice && !this.activeMonoVoice.released) {
      this.activeMonoVoice.glideTo(midi, velocity);
    } else {
      const voice = new Voice(this, midi, velocity);
      this.activeMonoVoice = voice;
      this.voices.set(voice.id, voice);
      this.voiceOrder.push(voice.id);
      voice.start();
    }
    setKeyActive(midi, true);
  }
  
  noteOff(midi) {
    setKeyActive(midi, false);
    if (document.getElementById('playMode').value === 'mono') {
      if (midi === this.lastMonoNote && this.activeMonoVoice) {
        this.activeMonoVoice.release();
        this.lastMonoNote = null;
        this.activeMonoVoice = null;
      }
      return;
    }
    for (const voice of this.voices.values()) {
      if (voice.midi === midi && !voice.released) voice.release();
    }
  }
  
  stealVoice() {
    const id = this.voiceOrder.shift();
    const voice = this.voices.get(id);
    if (voice) voice.kill();
  }
  
  removeVoice(id) {
    this.voices.delete(id);
    this.voiceOrder = this.voiceOrder.filter(x => x !== id);
  }
  
  panic() {
    for (const voice of this.voices.values()) voice.kill();
    this.voices.clear();
    this.voiceOrder = [];
    this.activeMonoVoice = null;
    this.lastMonoNote = null;
    document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
  }
}

let voiceId = 0;

class Voice {
  constructor(engine, midi, velocity) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.id = ++voiceId;
    this.midi = midi;
    this.velocity = velocity;
    this.released = false;
    this.nodes = [];
    this.oscillators = [];
    this.startTime = nowish(this.ctx);
    
    this.output = this.ctx.createGain();
    this.pan = this.ctx.createStereoPanner();
    this.amp = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();
    this.preFilter = this.ctx.createGain();
    this.lfo = this.ctx.createOscillator();
    this.lfoGainPitch = this.ctx.createGain();
    this.lfoGainFilter = this.ctx.createGain();
    this.lfoGainAmp = this.ctx.createGain();
    
    this.output.connect(this.pan);
    this.pan.connect(this.engine.preFx);
    this.preFilter.connect(this.filter);
    this.filter.connect(this.amp);
    this.amp.connect(this.output);
    this.lfo.connect(this.lfoGainPitch);
    this.lfo.connect(this.lfoGainFilter);
    this.lfo.connect(this.lfoGainAmp);
    this.lfoGainFilter.connect(this.filter.frequency);
    this.lfoGainAmp.connect(this.amp.gain);
    this.nodes.push(this.output, this.pan, this.amp, this.filter, this.preFilter, this.lfo, this.lfoGainPitch, this.lfoGainFilter, this.lfoGainAmp);
  }
  
  start() {
    const t = this.startTime;
    this.applyLiveParams(t);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(0.0001, t);
    
    const freq = midiToFreq(this.midi);
    this.createOsc('osc1', freq, t);
    this.createOsc('osc2', freq, t);
    this.createNoise(t);
    
    this.applyAmpEnvelope(t, this.velocity);
    this.applyFilterEnvelope(t);
    this.lfo.start(t);
  }
  
  createOsc(which, baseFreq, t) {
    const oscState = state[which];
    const osc = this.ctx.createOscillator();
    const level = this.ctx.createGain();
    const stereoSpread = which === 'osc1' ? -state.master.width : state.master.width;
    osc.type = oscState.type;
    osc.frequency.setValueAtTime(baseFreq * Math.pow(2, oscState.octave), t);
    osc.detune.setValueAtTime(oscState.detune, t);
    this.lfoGainPitch.connect(osc.detune);
    level.gain.setValueAtTime(oscState.level * (0.35 + this.velocity * 0.65), t);
    osc.connect(level);
    level.connect(this.preFilter);
    osc.start(t);
    this.oscillators.push({ osc, level, which });
    this.nodes.push(osc, level);
    this.pan.pan.setTargetAtTime(stereoSpread * 0.35, t, 0.02);
  }
  
  createNoise(t) {
    if (state.noise.level <= 0.0001) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = this.engine.noiseBuffer;
    src.loop = true;
    gain.gain.setValueAtTime(state.noise.level * this.velocity, t);
    src.connect(gain);
    gain.connect(this.preFilter);
    src.start(t);
    this.noise = src;
    this.nodes.push(src, gain);
  }
  
  applyAmpEnvelope(t, velocity) {
    const e = state.amp;
    const peak = clamp(velocity, 0.05, 1);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(0.0001, t);
    this.amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + e.attack);
    this.amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, e.sustain * peak), t + e.attack + e.decay);
  }
  
  applyFilterEnvelope(t) {
    const base = this.baseCutoff();
    const e = state.filterEnv;
    const peak = clamp(base + state.filter.env * this.velocity, 20, 19000);
    const sustain = clamp(base + state.filter.env * e.sustain * this.velocity, 20, 19000);
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(clamp(base, 20, 19000), t);
    this.filter.frequency.exponentialRampToValueAtTime(Math.max(20, peak), t + e.attack);
    this.filter.frequency.exponentialRampToValueAtTime(Math.max(20, sustain), t + e.attack + e.decay);
  }
  
  baseCutoff() {
    const kt = state.filter.keytrack;
    const noteFactor = Math.pow(2, ((this.midi - 60) / 12) * kt);
    return clamp(state.filter.cutoff * noteFactor, 20, 19000);
  }
  
  glideTo(midi, velocity) {
    const t = nowish(this.ctx);
    this.midi = midi;
    this.velocity = velocity;
    const glide = clamp(state.master.glide, 0.001, 1.2);
    for (const { osc, which } of this.oscillators) {
      const oscState = state[which];
      const target = midiToFreq(midi) * Math.pow(2, oscState.octave);
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setTargetAtTime(target, t, glide * 0.35);
    }
    this.applyFilterEnvelope(t);
  }
  
  applyLiveParams(t) {
    this.filter.type = state.filter.type;
    this.filter.Q.setTargetAtTime(state.filter.resonance, t, 0.015);
    this.preFilter.gain.setTargetAtTime(1 + state.filter.drive * 1.8, t, 0.015);
    this.lfo.type = state.lfo.type;
    this.lfo.frequency.setTargetAtTime(state.lfo.rate, t, 0.02);
    this.lfoGainPitch.gain.setTargetAtTime(state.lfo.pitch, t, 0.02);
    this.lfoGainFilter.gain.setTargetAtTime(state.lfo.filter, t, 0.02);
    this.lfoGainAmp.gain.setTargetAtTime(state.lfo.amp, t, 0.02);
    for (const { osc, level, which } of this.oscillators) {
      const s = state[which];
      osc.type = s.type;
      osc.detune.setTargetAtTime(s.detune, t, 0.01);
      level.gain.setTargetAtTime(s.level * (0.35 + this.velocity * 0.65), t, 0.01);
    }
  }
  
  release() {
    if (this.released) return;
    this.released = true;
    const t = nowish(this.ctx);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setTargetAtTime(0.0001, t, Math.max(0.006, state.amp.release / 4));
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setTargetAtTime(Math.max(20, this.baseCutoff() * 0.75), t, Math.max(0.006, state.filterEnv.release / 4));
    const stopAt = t + Math.max(state.amp.release, state.filterEnv.release) + 0.18;
    this.stopSources(stopAt);
    setTimeout(() => this.cleanup(), (stopAt - this.ctx.currentTime) * 1000 + 80);
  }
  
  stopSources(time) {
    for (const { osc } of this.oscillators) {
      try { osc.stop(time); } catch {}
    }
    if (this.noise) {
      try { this.noise.stop(time); } catch {}
    }
    try { this.lfo.stop(time); } catch {}
  }
  
  kill() {
    const t = nowish(this.ctx);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setTargetAtTime(0.0001, t, 0.006);
    this.stopSources(t + 0.04);
    setTimeout(() => this.cleanup(), 90);
  }
  
  cleanup() {
    for (const node of this.nodes) {
      try { node.disconnect(); } catch {}
    }
    this.engine.removeVoice(this.id);
  }
}

const CONTROL_GROUPS = {
  masterControls: [
    ['master.volume', 'Volume', -36, 0, 0.1, 'db'],
    ['master.glide', 'Glide', 0, 0.5, 0.001, 's'],
    ['master.width', 'Width', 0, 1, 0.01, '']
  ],
  oscControls: [
    ['osc1.level', 'A level', 0, 1, 0.01, ''],
    ['osc1.octave', 'A octave', -2, 2, 1, 'oct'],
    ['osc1.detune', 'A detune', -50, 50, 1, 'ct'],
    ['osc2.level', 'B level', 0, 1, 0.01, ''],
    ['osc2.octave', 'B octave', -2, 2, 1, 'oct'],
    ['osc2.detune', 'B detune', -50, 50, 1, 'ct'],
    ['noise.level', 'Noise', 0, 0.25, 0.001, '']
  ],
  envControls: [
    ['amp.attack', 'Amp attack', 0.001, 2, 0.001, 's', 'exp'],
    ['amp.decay', 'Amp decay', 0.01, 2, 0.001, 's', 'exp'],
    ['amp.sustain', 'Amp sustain', 0, 1, 0.01, ''],
    ['amp.release', 'Amp release', 0.01, 4, 0.001, 's', 'exp'],
    ['filterEnv.attack', 'Filt attack', 0.001, 2, 0.001, 's', 'exp'],
    ['filterEnv.decay', 'Filt decay', 0.01, 2, 0.001, 's', 'exp'],
    ['filterEnv.sustain', 'Filt sustain', 0, 1, 0.01, ''],
    ['filterEnv.release', 'Filt release', 0.01, 4, 0.001, 's', 'exp']
  ],
  filterControls: [
    ['filter.cutoff', 'Cutoff', 40, 18000, 1, 'hz', 'exp'],
    ['filter.resonance', 'Resonance', 0.0001, 18, 0.001, 'Q', 'exp'],
    ['filter.env', 'Env amt', -8000, 10000, 1, 'hz'],
    ['filter.keytrack', 'Keytrack', 0, 1, 0.01, ''],
    ['filter.drive', 'Pre-drive', 0, 1, 0.01, '']
  ],
  lfoControls: [
    ['lfo.rate', 'Rate', 0.03, 30, 0.001, 'hz', 'exp'],
    ['lfo.pitch', 'Pitch amt', 0, 40, 0.1, 'ct'],
    ['lfo.filter', 'Filter amt', 0, 3000, 1, 'hz'],
    ['lfo.amp', 'Tremolo', 0, 0.3, 0.001, '']
  ],
  driveControls: [
    ['drive.amount', 'Amount', 0, 1, 0.01, ''],
    ['drive.mix', 'Mix', 0, 1, 0.01, '']
  ],
  delayControls: [
    ['delay.time', 'Time', 0.03, 1.2, 0.001, 's'],
    ['delay.feedback', 'Feedback', 0, 0.88, 0.01, ''],
    ['delay.mix', 'Mix', 0, 0.7, 0.01, ''],
    ['delay.tone', 'Tone', 400, 12000, 1, 'hz', 'exp']
  ],
  reverbControls: [
    ['reverb.seconds', 'Size', 0.15, 6, 0.01, 's'],
    ['reverb.decay', 'Decay', 0.4, 6, 0.01, ''],
    ['reverb.mix', 'Mix', 0, 0.8, 0.01, '']
  ]
};

function getPath(path) {
  const [g, k] = path.split('.');
  return state[g][k];
}

function setPath(path, value) {
  const [g, k] = path.split('.');
  state[g][k] = value;
  if (synth) synth.setParam(path, value);
}

function formatValue(value, unit) {
  if (unit === 'db') return `${Number(value).toFixed(1)} dB`;
  if (unit === 'hz') return value >= 1000 ? `${(value / 1000).toFixed(2)}k` : `${Math.round(value)}`;
  if (unit === 's') return `${Number(value).toFixed(3)}s`;
  if (unit === 'ct') return `${Math.round(value)}¢`;
  if (unit === 'oct') return `${value}`;
  return `${Number(value).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function makeControl(parentId, [path, label, min, max, step, unit, scale]) {
  const parent = document.getElementById(parentId);
  const row = document.createElement('div');
  row.className = 'control';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = 0;
  input.max = 1;
  input.step = scale === 'exp' ? 0.0005 : (step / (max - min));
  const val = document.createElement('span');
  val.className = 'value';
  
  const toSlider = value => scale === 'exp' ?
    Math.log(value / min) / Math.log(max / min) :
    (value - min) / (max - min);
  const fromSlider = slider => scale === 'exp' ?
    expScale(min, max, Number(slider)) :
    lerp(min, max, Number(slider));
  
  const sync = () => {
    const value = getPath(path);
    input.value = toSlider(value);
    val.textContent = formatValue(value, unit);
  };
  
  input.addEventListener('input', () => {
    const raw = fromSlider(input.value);
    const quantized = scale === 'exp' ? raw : Math.round(raw / step) * step;
    setPath(path, clamp(quantized, min, max));
    val.textContent = formatValue(getPath(path), unit);
  });
  
  row.append(lab, input, val);
  parent.append(row);
  ui.set(path, sync);
  sync();
}

function initControls() {
  for (const [parent, defs] of Object.entries(CONTROL_GROUPS)) {
    defs.forEach(def => makeControl(parent, def));
  }
  
  document.querySelectorAll('select[data-param]').forEach(sel => {
    const path = sel.dataset.param;
    const sync = () => { sel.value = getPath(path); };
    sel.addEventListener('change', () => setPath(path, sel.value));
    ui.set(path, sync);
    sync();
  });
  
  const preset = document.getElementById('preset');
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    preset.append(opt);
  }
  preset.addEventListener('change', () => loadPreset(preset.value));
}

function loadPreset(name) {
  state = structuredClone(PRESETS[name]);
  for (const sync of ui.values()) sync();
  if (synth) synth.applyState(true);
}

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const baseMidi = 48;

// function buildKeyboard() {
//   const root = document.getElementById('keyboard');
//   let targetMidi
  
//   for (let i = 0; i < 24; i++) {
//     const midi = baseMidi + i;
//     const note = noteNames[midi % 12];
//     const el = document.createElement('div');
//     el.className = `key ${note.includes('#') ? 'black' : 'white'}`;
//     el.dataset.midi = midi;
//     el.textContent = `${note}${Math.floor(midi / 12) - 1}`;
    
//     // el.addEventListener('pointerdown', e => {
//     //   // e.preventDefault();
//     //   ensureAudio().then(() => synth.noteOn(midi + octaveOffset * 12, 0.9));
//     //   // el.setPointerCapture(e.pointerId);
//     // });
    
//     // el.addEventListener('pointerup', e => {
//     //   e.preventDefault();
//     //   if (synth) synth.noteOff(midi + octaveOffset * 12);
//     //   // if (synth && targetMidi) synth.noteOff(targetMidi);
//     // });
    
//     // el.addEventListener('pointercancel', () => synth?.noteOff(midi + octaveOffset * 12));
//     root.append(el);
//   }
  
//   root.addEventListener('pointerdown', e => {
//     // e.preventDefault();
//     const el = e.target
//     targetMidi = +el.dataset.midi + octaveOffset * 12

//     ensureAudio().then(() => synth.noteOn(targetMidi, 0.9));
//     // el.setPointerCapture(e.pointerId);
//   });
  
//   root.addEventListener('pointermove', e => {
//     try {
//       // e.preventDefault();
//       const el = e.target
      
      
//       const newMidi = +el.dataset.midi + octaveOffset * 12
//   console.warn({newMidi, targetMidi})
 
//       if (newMidi === targetMidi) {
//         return
//       }
      
//       if (synth && !isNaN(targetMidi)) synth.noteOff(targetMidi);
      
//       targetMidi = newMidi
      
//       ensureAudio().then(() => synth.noteOn(targetMidi, 0.9));
//       // el.setPointerCapture(e.pointerId);
//     } catch (e) {
//       console.warn('e', { e })
//     }
//   });
  
//   root.addEventListener('pointerup', e => {
//     e.preventDefault();
//     // if (synth && targetMidi) synth.noteOff(targetMidi);
//     if (synth && !isNaN(targetMidi)) synth.noteOff(targetMidi);
    
//     targetMidi = null
//   });
  
//   // root.addEventListener('pointercancel', () => synth?.noteOff(targetMidi))
  
// }
function buildKeyboard() {
  const root = document.getElementById('keyboard');
  
  let activeMidi = null;
  let pointerDown = false;
  
  for (let i = 0; i < 24; i++) {
    const midi = baseMidi + i;
    const note = noteNames[midi % 12];
    
    const el = document.createElement('div');
    
    el.className = `key ${note.includes('#') ? 'black' : 'white'}`;
    el.dataset.midi = midi;
    el.textContent = `${note}${Math.floor(midi / 12) - 1}`;
    
    root.append(el);
  }
  
  function getMidiFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    
    if (!el || !el.classList.contains('key')) {
      return null;
    }
    
    return +el.dataset.midi + octaveOffset * 12;
  }
  
  async function playMidi(midi) {
    if (midi == null) return;
    
    await ensureAudio();
    
    synth.noteOn(midi, 0.9);
    
    activeMidi = midi;
  }
  
  function stopMidi() {
    if (activeMidi == null) return;
    
    synth.noteOff(activeMidi);
    
    activeMidi = null;
  }
  
  root.addEventListener('pointerdown', async e => {
    e.preventDefault();
    
    pointerDown = true;
    
    root.setPointerCapture(e.pointerId);
    
    const midi = getMidiFromPoint(e.clientX, e.clientY);
    
    await playMidi(midi);
  });
  
  root.addEventListener('pointermove', async e => {
    if (!pointerDown) return;
    
    e.preventDefault();
    
    const midi = getMidiFromPoint(e.clientX, e.clientY);
    
    // outside keyboard
    if (midi == null) {
      stopMidi();
      return;
    }
    
    // still same note
    if (midi === activeMidi) {
      return;
    }
    
    stopMidi();
    
    await playMidi(midi);
  });
  
  function releasePointer(e) {
    pointerDown = false;
    
    stopMidi();
    
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {}
  }
  
  root.addEventListener('pointerup', releasePointer);
  root.addEventListener('pointercancel', releasePointer);
}
function setKeyActive(midi, active) {
  const visual = midi - octaveOffset * 12;
  document.querySelectorAll(`[data-midi="${visual}"]`).forEach(el => el.classList.toggle('active', active));
}

const keyMap = {
  KeyA: 60,
  KeyW: 61,
  KeyS: 62,
  KeyE: 63,
  KeyD: 64,
  KeyF: 65,
  KeyT: 66,
  KeyG: 67,
  KeyY: 68,
  KeyH: 69,
  KeyU: 70,
  KeyJ: 71,
  KeyK: 72,
  KeyO: 73,
  KeyL: 74,
  KeyP: 75,
  Semicolon: 76
};

function initKeyboardInput() {
  window.addEventListener('keydown', async e => {
    if (e.repeat) return;
    if (e.code === 'KeyZ') { octaveOffset--; return; }
    if (e.code === 'KeyX') { octaveOffset++; return; }
    const midi = keyMap[e.code];
    if (midi == null) return;
    await ensureAudio();
    const note = midi + octaveOffset * 12;
    heldComputer.set(e.code, note);
    synth.noteOn(note, e.shiftKey ? 1 : 0.78);
  });
  window.addEventListener('keyup', e => {
    const note = heldComputer.get(e.code);
    if (note == null) return;
    heldComputer.delete(e.code);
    synth?.noteOff(note);
  });
}

async function initMidi() {
  if (!navigator.requestMIDIAccess) return;
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    const bind = input => {
      input.onmidimessage = ev => {
        const [status, data1, data2] = ev.data;
        const cmd = status & 0xf0;
        if (cmd === 0x90 && data2 > 0) synth?.noteOn(data1, data2 / 127);
        if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) synth?.noteOff(data1);
        if (cmd === 0xb0 && data1 === 1) setPath('lfo.pitch', data2 / 127 * 40);
      };
    };
    access.inputs.forEach(bind);
    access.onstatechange = () => access.inputs.forEach(bind);
  } catch (err) {
    console.warn('MIDI unavailable:', err);
  }
}

async function ensureAudio() {
  if (!ctx) {
    ctx = new(window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    synth = new SynthEngine(ctx);
    initMidi();
  }
  if (ctx.state !== 'running') await ctx.resume();
  document.getElementById('audioDot').classList.add('on');
  document.getElementById('audioStatus').textContent = 'audio on';
}

function drawMeter() {
  requestAnimationFrame(drawMeter);
  if (!synth) return;
  const data = new Uint8Array(synth.analyser.fftSize);
  synth.analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (const x of data) {
    const v = (x - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / data.length);
  document.getElementById('meterBar').style.width = `${clamp(rms * 260, 0, 100)}%`;
}

document.getElementById('start').addEventListener('click', ensureAudio);
document.getElementById('panic').addEventListener('click', () => synth?.panic());

initControls();
buildKeyboard();
initKeyboardInput();
drawMeter();