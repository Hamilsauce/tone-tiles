export const initHueRoto = () => {
    let gradientDeg = 0
    let isRunning = false;
    
    const baseFilterRule = 'hue-rotate(55deg) invert(0)'
    const getApp = () => document.querySelector('#app')
    const getSvg = () => document.querySelector('#canvas') ?? document.createElement('span')
    
    setTimeout(() => {
        const app = document.querySelector('#app');
        const svgCanvas = document.querySelector('svg');
        const appBody = document.querySelector('#app-body')
        
        setInterval(() => {
            // console.warn(`filter: contrast(1.1) brightness(1) hue-rotate(${gradientDeg}deg) !important`)
            // this.root.style.background = `linear-gradient(${gradientDeg}deg, #2E2A32 40%, #23323B 100%)`
            // app.style.filter = `filter: hue-rotate(${gradientDeg}deg) !important`;
            // getApp().style.filter = `hue-rotate(${gradientDeg}deg) contrast(1.2) saturate(1.2)`;
            if (!isRunning) {
                getSvg().style.filter = baseFilterRule
                
                return
            };
            
            getSvg().style.filter = `hue-rotate(${gradientDeg*0.33}deg) contrast(1.2) saturate(1.2)`;
            // svgCanvas.style.filter = `filter: hue-rotate(${-gradientDeg}deg) !important`;
            gradientDeg += 0.5
        }, 16)
    }, 2000)
    
    return (v = null) => {
        if (v) {
            isRunning = v;
        }
        else {
            isRunning = !isRunning;
        }
        console.warn({ isRunning })
    }
}