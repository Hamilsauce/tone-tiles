const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const initShadowRoto = (element) => {
  if (!element) {
    console.error('NO ELEMENT PASSED TO HUE ROTATO');
    return;
  }
  
  let base = { x: 1, y: 1 };
  let currentRot = 1;
  let mod = 1;
  let isRunning = false;
  // console.warn({element})
  const baseFilterRule = 'hue-rotate(55deg) invert(0) drop-shadow(1px 1px 0.1px #00000050)'
  
  const calculateRotato = () => {
    // currentRot = base.x > 5 || base.x < 1 ? -1 : 1;
    currentRot = clamp(currentRot, 1, 6)

    mod = base.x > 5 ? 1 : base.x <= 0 ? -1 : mod
currentRot
    base.x =  currentRot + mod;
    base.y =  currentRot - mod;
    
    // const newRot = baseRotato + (gradientDeg * 0.33);
    // gradientDeg += 0.4;
    // return newRot;
    console.warn('base', base.x, base.y)
    
  };
  
  setTimeout(() => {
    setInterval(() => {
      calculateRotato()
      // element.style.filter = `hue-rotate(55deg) invert(0) drop-shadow(${base.x}px ${base.y}px 0.1px #00000050)`
      element.style.filter = `drop-shadow(${base.x}px ${base.y}px 0.1px #00000050)`
      
      // if (!isRunning && !!element && element.style.filter.trim() !== baseFilterRule.trim()) {
      //   element.style.filter = baseFilterRule;
      // } else if (isRunning) {}
    }, 16);
  }, 2000);
  
  return (v = null) => {
    return
    if (v) isRunning = v;
    else isRunning = !isRunning;
    
    if (!isRunning) {
      gradientDeg = 0;
    }
  };
};