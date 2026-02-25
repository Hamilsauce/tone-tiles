export const initHueRoto = (element) => {
  if (!element) {
    console.error('NO ELEMENT PASSED TO HUE ROTATO');
    return;
  }

  let baseRotato = 200;
  let gradientDeg = 0;
  let isRunning = false;

  const baseFilterRule = 'contrast(1.2) hue-rotate(200deg) saturate(1.2)';

  const calculateRotato = () => {
    const newRot = baseRotato + (gradientDeg * 0.33);
    gradientDeg += 0.4;
    return newRot;
  };

  setTimeout(() => {
    setInterval(() => {
      if (!isRunning && !!element && element.style.filter.trim() !== baseFilterRule.trim()) {
        element.style.filter = baseFilterRule;
      } else if (isRunning) {
        element.style.filter = `contrast(1.2) hue-rotate(${calculateRotato()}deg) saturate(1.2)`;

      }
    }, 16);
  }, 2000);

  return (v = null) => {
    if (v) isRunning = v;
    else isRunning = !isRunning;

    if (!isRunning) {
      gradientDeg = 0;
    }
  };
};