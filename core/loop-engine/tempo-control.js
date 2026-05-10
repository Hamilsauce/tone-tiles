// tempo-control.js

export function createTempoControl({
  loop,
  sliderId = 'tempo-slider',
  readoutId = 'tempo-readout',
  root = document.documentElement,
} = {}) {
  
  const slider = document.getElementById(sliderId);
  const readout = document.getElementById(readoutId);
  
  if (!slider) {
    throw new Error(`Missing slider #${sliderId}`);
  }
  
  const setTempoScale = (scale) => {
    loop.setTempoScale(scale);
    
    root.style.setProperty(
      '--tempo-scale',
      scale.toFixed(3)
    );
    
    if (readout) {
      readout.textContent = `${scale.toFixed(2)}x`;
    }
  };
  
  const sliderToScale = (v) => {
    // -1 => 0.5x
    //  0 => 1x
    // +1 => 2x
    
    return Math.pow(2, Number(v));
  };
  
  slider.addEventListener('input', (e) => {
    const scale = sliderToScale(e.target.value);
    
    setTempoScale(scale);
  });
  
  // initialize
  setTempoScale(
    sliderToScale(slider.value)
  );
  
  return {
    setTempoScale,
  };
}