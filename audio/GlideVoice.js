const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + ((end - start) * amount);

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
    this.filter = null;
    this.contourGain = null;
    this.gain = null;
    this.velocity = 0.18;
    this.frequency = null;
    this.expression = {
      brightness: 0.32,
    };
  }

  get currentTime() {
    return this.audioCtx.currentTime;
  }

  get isActive() {
    return !!this.osc && !!this.gain && !!this.contourGain;
  }

  start(frequency, velocity = this.velocity) {
    this.dispose();

    const now = this.currentTime;
    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const contourGain = this.audioCtx.createGain();
    const gain = this.audioCtx.createGain();
    const level = clamp(velocity, 0.12, 0.28);

    osc.type = this.type;
    osc.frequency.setValueAtTime(frequency + 3, now);
    osc.frequency.linearRampToValueAtTime(frequency, now + 0.02);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 0.25;
    contourGain.gain.setValueAtTime(0.82, now);
    contourGain.gain.linearRampToValueAtTime(0.92, now + 0.055);
    contourGain.gain.linearRampToValueAtTime(1.035, now + 0.22);
    contourGain.gain.linearRampToValueAtTime(1, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level * 0.82, now + this.attackTime);
    gain.gain.linearRampToValueAtTime(level, now + 0.15);

    osc.connect(filter);
    filter.connect(contourGain);
    contourGain.connect(gain);
    gain.connect(this.destination);
    osc.start(now);

    this.osc = osc;
    this.filter = filter;
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
    const currentFrequency = this.osc.frequency.value || this.frequency || frequency;

    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(currentFrequency, now);
    this.osc.frequency.linearRampToValueAtTime(frequency, now + safeGlideTime);
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
    const brightness = clamp(this.expression.brightness ?? 0.32, 0, 1);
    const transitionTime = immediate ? 0.0001 : 0.085;
    const filterTarget = lerp(880, 3200, brightness);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value || filterTarget, now);
    this.filter.frequency.linearRampToValueAtTime(filterTarget, now + transitionTime);

    return this;
  }

  articulate({
    depth = 0.08,
    bloom = 0.02,
    dipTime = 0.014,
    recoverTime = 0.12,
    settleTime = 0.22,
  } = {}) {
    if (!this.isActive) {
      return this;
    }

    const now = this.currentTime;
    const safeDepth = clamp(depth, 0.01, 0.22);
    const safeBloom = clamp(bloom, 0, 0.08);
    const floor = clamp(1 - safeDepth, 0.68, 1);
    const crest = clamp(1 + safeBloom, 1, 1.11);
    const currentContour = Math.max(this.contourGain.gain.value || 1, 0.0001);

    this.contourGain.gain.cancelScheduledValues(now);
    this.contourGain.gain.setValueAtTime(currentContour, now);
    this.contourGain.gain.linearRampToValueAtTime(floor, now + Math.max(0.005, dipTime));
    this.contourGain.gain.linearRampToValueAtTime(crest, now + Math.max(0.025, recoverTime));
    this.contourGain.gain.linearRampToValueAtTime(1, now + Math.max(0.05, settleTime));

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
    this.contourGain.gain.cancelScheduledValues(now);
    this.contourGain.gain.setValueAtTime(this.contourGain.gain.value || 1, now);
    this.contourGain.gain.linearRampToValueAtTime(1, now + 0.02);

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

    if (this.contourGain) {
      try {
        this.contourGain.disconnect();
      } catch (error) {}
    }

    if (this.filter) {
      try {
        this.filter.disconnect();
      } catch (error) {}
    }

    this.osc = null;
    this.filter = null;
    this.contourGain = null;
    this.gain = null;
    this.frequency = null;

    return this;
  }
}
