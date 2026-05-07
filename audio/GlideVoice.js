const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + ((end - start) * amount);
const centsToRatio = (cents = 0) => Math.pow(2, cents / 1200);

const createSaturationCurve = (amount = 1.4) => {
  const samples = 256;
  const curve = new Float32Array(samples);

  for (let index = 0; index < samples; index++) {
    const x = ((index / (samples - 1)) * 2) - 1;
    curve[index] = Math.tanh(x * amount);
  }

  return curve;
};

const scheduleParamRamp = (param, now, target, time = 0.08) => {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value || target, now);
  param.linearRampToValueAtTime(target, now + Math.max(0.0001, time));
};

export class GlideVoice {
  constructor(audioCtx, {
    type = 'triangle',
    attackTime = 0.02,
    destination = audioCtx.destination,
  } = {}) {
    this.audioCtx = audioCtx;
    this.type = type;
    this.attackTime = attackTime;
    this.destination = destination;

    this.oscillators = [];
    this.filter = null;
    this.shaperInput = null;
    this.shaper = null;
    this.bodyGain = null;
    this.airLeftGain = null;
    this.airRightGain = null;
    this.airLeftPanner = null;
    this.airRightPanner = null;
    this.spacePanner = null;
    this.contourGain = null;
    this.gain = null;
    this.velocity = 0.18;
    this.frequency = null;
    this.expression = {
      brightness: 0.29,
      warmth: 0.18,
      width: 0.16,
      level: 0.48,
      pan: 0,
    };
  }

  get currentTime() {
    return this.audioCtx.currentTime;
  }

  get isActive() {
    return this.oscillators.length > 0 && !!this.gain && !!this.contourGain;
  }

  createOscillator(multiplier = 1, {
    type = this.type,
    detune = 0,
    gainNode = null,
  } = {}) {
    const osc = this.audioCtx.createOscillator();
    osc.type = type;

    if (gainNode) {
      osc.connect(gainNode);
    }

    this.oscillators.push({ osc, multiplier, detune });

    return osc;
  }

  scheduleOscillatorFrequency({ osc, multiplier = 1, detune = 0 }, frequency, now, glideTime = 0.02) {
    const target = frequency * multiplier * centsToRatio(detune);
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(osc.frequency.value || target, now);
    osc.frequency.linearRampToValueAtTime(target, now + glideTime);
  }

  start(frequency, velocity = this.velocity) {
    this.dispose();

    const now = this.currentTime;
    const level = clamp(velocity, 0.13, 0.3);
    const bodyGain = this.audioCtx.createGain();
    const toneGain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    const shaperInput = this.audioCtx.createGain();
    const shaper = this.audioCtx.createWaveShaper();
    const airLeftGain = this.audioCtx.createGain();
    const airRightGain = this.audioCtx.createGain();
    const airLeftPanner = this.audioCtx.createStereoPanner();
    const airRightPanner = this.audioCtx.createStereoPanner();
    const contourGain = this.audioCtx.createGain();
    const spacePanner = this.audioCtx.createStereoPanner();
    const gain = this.audioCtx.createGain();

    toneGain.gain.setValueAtTime(1, now);
    bodyGain.gain.setValueAtTime(0.12, now);
    airLeftGain.gain.setValueAtTime(0.02, now);
    airRightGain.gain.setValueAtTime(0.02, now);
    airLeftPanner.pan.setValueAtTime(-0.2, now);
    airRightPanner.pan.setValueAtTime(0.2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1060, now);
    filter.Q.setValueAtTime(0.38, now);

    shaperInput.gain.setValueAtTime(1.06, now);
    shaper.curve = createSaturationCurve();
    shaper.oversample = '2x';

    contourGain.gain.setValueAtTime(0.76, now);
    contourGain.gain.linearRampToValueAtTime(0.88, now + 0.055);
    contourGain.gain.linearRampToValueAtTime(1.05, now + 0.24);
    contourGain.gain.linearRampToValueAtTime(1, now + 0.48);

    spacePanner.pan.setValueAtTime(0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level * 0.78, now + this.attackTime);
    gain.gain.linearRampToValueAtTime(level * 0.92, now + 0.1);
    gain.gain.linearRampToValueAtTime(level, now + 0.24);

    toneGain.connect(filter);
    filter.connect(shaperInput);
    shaperInput.connect(shaper);
    shaper.connect(contourGain);
    airLeftGain.connect(airLeftPanner);
    airRightGain.connect(airRightPanner);
    airLeftPanner.connect(contourGain);
    airRightPanner.connect(contourGain);
    contourGain.connect(spacePanner);
    spacePanner.connect(gain);
    gain.connect(this.destination);

    const coreOsc = this.createOscillator(1, { type: this.type, gainNode: toneGain });
    const bodyOsc = this.createOscillator(0.5, { type: 'sine', gainNode: bodyGain });
    const airLeftOsc = this.createOscillator(2, { type: 'triangle', detune: -7, gainNode: airLeftGain });
    const airRightOsc = this.createOscillator(2, { type: 'triangle', detune: 7, gainNode: airRightGain });

    [coreOsc, bodyOsc, airLeftOsc, airRightOsc].forEach((oscillator, index) => {
      const oscState = this.oscillators[index];
      const startFrequency = index === 1 ? frequency * 0.5 : frequency;
      oscState.osc.frequency.setValueAtTime(startFrequency + (index === 0 ? 4 : 0), now);
      this.scheduleOscillatorFrequency(oscState, frequency, now, 0.025);
      oscillator.start(now);
    });

    this.filter = filter;
    this.shaperInput = shaperInput;
    this.shaper = shaper;
    this.bodyGain = bodyGain;
    this.airLeftGain = airLeftGain;
    this.airRightGain = airRightGain;
    this.airLeftPanner = airLeftPanner;
    this.airRightPanner = airRightPanner;
    this.spacePanner = spacePanner;
    this.contourGain = contourGain;
    this.gain = gain;
    this.velocity = level;
    this.frequency = frequency;
    this.setExpression(this.expression, { immediate: true, preserveAttack: true });

    return this;
  }

  glideTo(frequency, glideTime = 0.08) {
    if (!this.isActive) {
      return this.start(frequency, this.velocity);
    }

    const now = this.currentTime;
    const safeGlideTime = Math.max(glideTime, 0.01);

    this.oscillators.forEach((oscillator) => {
      this.scheduleOscillatorFrequency(oscillator, frequency, now, safeGlideTime);
    });

    this.frequency = frequency;

    return this;
  }

  setExpression(expression = {}, { immediate = false, preserveAttack = false } = {}) {
    this.expression = {
      ...this.expression,
      ...expression,
    };

    if (!this.isActive) {
      return this;
    }

    const now = this.currentTime;
    const brightness = clamp(this.expression.brightness ?? 0.34, 0, 1);
    const warmth = clamp(this.expression.warmth ?? 0.22, 0, 1);
    const width = clamp(this.expression.width ?? 0.18, 0, 1);
    const level = clamp(this.expression.level ?? 0.54, 0, 1);
    const pan = clamp(this.expression.pan ?? 0, -1, 1);
    const transitionTime = immediate ? 0.0001 : 0.1;
    const filterTarget = lerp(760, 3000, brightness);
    const qTarget = lerp(0.28, 0.9, brightness);
    const driveTarget = lerp(1.02, 1.9, warmth);
    const bodyTarget = lerp(0.075, 0.15, warmth);
    const airTarget = lerp(0.008, 0.06, Math.sqrt(width * brightness));
    const spreadTarget = lerp(0.14, 0.82, width);
    const levelTarget = clamp(this.velocity * lerp(0.86, 1.08, level), 0.08, 0.32);

    scheduleParamRamp(this.filter.frequency, now, filterTarget, transitionTime);
    scheduleParamRamp(this.filter.Q, now, qTarget, transitionTime);
    scheduleParamRamp(this.shaperInput.gain, now, driveTarget, transitionTime);
    scheduleParamRamp(this.bodyGain.gain, now, bodyTarget, transitionTime);
    scheduleParamRamp(this.airLeftGain.gain, now, airTarget, transitionTime);
    scheduleParamRamp(this.airRightGain.gain, now, airTarget, transitionTime);
    scheduleParamRamp(this.airLeftPanner.pan, now, -spreadTarget, transitionTime);
    scheduleParamRamp(this.airRightPanner.pan, now, spreadTarget, transitionTime);
    scheduleParamRamp(this.spacePanner.pan, now, pan, transitionTime);

    if (preserveAttack) {
      this.gain.gain.linearRampToValueAtTime(levelTarget, now + Math.max(transitionTime, 0.24));
    } else {
      scheduleParamRamp(this.gain.gain, now, levelTarget, transitionTime);
    }

    return this;
  }

  articulate({
    depth = 0.08,
    bloom = 0.02,
    dipTime = 0.012,
    recoverTime = 0.12,
    settleTime = 0.24,
  } = {}) {
    if (!this.isActive) {
      return this;
    }

    const now = this.currentTime;
    const safeDepth = clamp(depth, 0.01, 0.24);
    const safeBloom = clamp(bloom, 0, 0.085);
    const floor = clamp(1 - safeDepth, 0.64, 1);
    const crest = clamp(1 + safeBloom, 1, 1.14);
    const contourNow = Math.max(this.contourGain.gain.value || 1, 0.0001);
    const brightnessNow = this.filter.frequency.value || 1200;
    const breathTarget = brightnessNow * (1 + safeBloom * 0.28);

    this.contourGain.gain.cancelScheduledValues(now);
    this.contourGain.gain.setValueAtTime(contourNow, now);
    this.contourGain.gain.linearRampToValueAtTime(floor, now + Math.max(0.005, dipTime));
    this.contourGain.gain.linearRampToValueAtTime(crest, now + Math.max(0.025, recoverTime));
    this.contourGain.gain.linearRampToValueAtTime(1, now + Math.max(0.05, settleTime));

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(brightnessNow, now);
    this.filter.frequency.linearRampToValueAtTime(brightnessNow * (1 - safeDepth * 0.08), now + Math.max(0.005, dipTime));
    this.filter.frequency.linearRampToValueAtTime(breathTarget, now + Math.max(0.03, recoverTime));
    this.filter.frequency.linearRampToValueAtTime(brightnessNow, now + Math.max(0.06, settleTime));

    return this;
  }

  release(releaseTime = 0.16) {
    if (!this.isActive) {
      return this;
    }

    const now = this.currentTime;
    const safeReleaseTime = Math.max(releaseTime, 0.02);
    const stopTime = now + safeReleaseTime + 0.03;

    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value || 0.0001, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + safeReleaseTime);
    this.contourGain.gain.cancelScheduledValues(now);
    this.contourGain.gain.setValueAtTime(this.contourGain.gain.value || 1, now);
    this.contourGain.gain.linearRampToValueAtTime(1, now + 0.03);

    this.oscillators.forEach(({ osc }) => {
      try {
        osc.stop(stopTime);
      } catch (error) {}
    });

    const finalOscillator = this.oscillators[this.oscillators.length - 1]?.osc;

    if (finalOscillator) {
      finalOscillator.onended = () => {
        this.dispose();
      };
    } else {
      this.dispose();
    }

    return this;
  }

  dispose() {
    this.oscillators.forEach(({ osc }) => {
      osc.onended = null;

      try {
        osc.disconnect();
      } catch (error) {}
    });

    [
      this.gain,
      this.contourGain,
      this.spacePanner,
      this.airLeftPanner,
      this.airRightPanner,
      this.airLeftGain,
      this.airRightGain,
      this.bodyGain,
      this.shaper,
      this.shaperInput,
      this.filter,
    ].forEach((node) => {
      if (!node) {
        return;
      }

      try {
        node.disconnect();
      } catch (error) {}
    });

    this.oscillators = [];
    this.filter = null;
    this.shaperInput = null;
    this.shaper = null;
    this.bodyGain = null;
    this.airLeftGain = null;
    this.airRightGain = null;
    this.airLeftPanner = null;
    this.airRightPanner = null;
    this.spacePanner = null;
    this.contourGain = null;
    this.gain = null;
    this.frequency = null;

    return this;
  }
}
