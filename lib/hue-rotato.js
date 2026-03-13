const BASE_BG_GRADIENT = `linear-gradient(45deg, #465FA1, #1182B9),
    linear-gradient(to bottom right, rgba(30, 75, 115, 1), #352F34),
    linear-gradient(to top left, rgba(21, 194, 130, 1), #363344)`;

export const initHueRoto = (element) => {
  if (!element) {
    console.error('NO ELEMENT PASSED TO HUE ROTATO');
    return;
  }
  
  let gradientAngle = 0;
  let baseRotato = 200;
  let gradientDeg = 0;
  let isRunning = false;
  let intervalId = null;
  
  const baseFilterRule = element.style.filter ?? 'contrast(1.2) hue-rotate(200deg) saturate(1.2)';
  
  const calculateRotato = () => {
    const newRot = baseRotato + (gradientDeg * 0.33);
    gradientDeg -= 0.25;
    return newRot;
  };
  
  const calculateGradient = () => {
    const deg = gradientAngle += 0.5
    return `linear-gradient(${deg}deg, #465FA1, #1182B9),
    linear-gradient(to bottom right, rgba(30, 75, 115, 1), #352F34),
    linear-gradient(to top left, rgba(21, 194, 130, 1), #363344)`
  };
  
  const start = () => {
    setTimeout(() => {
      intervalId = setInterval(() => {
        if (!isRunning && !!element && element.style.filter.trim() !== baseFilterRule.trim()) {
          element.style.filter = baseFilterRule;
          element.style.backgroundImage = BASE_BG_GRADIENT;
        } else if (isRunning) {
          element.style.backgroundImage = calculateGradient();
          
          element.style.filter = `contrast(1.2) hue-rotate(${calculateRotato()}deg) saturate(1.2)`;
          
        }
      }, 16);
    }, 0);
  };
  
  start();
  
  return (v = null) => {
    if (v) isRunning = v;
    else isRunning = !isRunning;
    
    if (!isRunning) {
      gradientAngle = 0;
      gradientDeg = 0;
      clearInterval(intervalId);
    } else start();
  };
};