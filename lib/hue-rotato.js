let gradientDeg = 0
const containers = document.querySelectorAll('.container')



const baseFilterRule = 'filter: contrast(1.1) brightness(1) hue-rotate(120deg)';

setTimeout(() => {
    const app = document.querySelector('#app');
    const svgCanvas = document.querySelector('svg');
    const appBody = document.querySelector('#app-body')
    
    setInterval(() => {
        console.warn(`filter: contrast(1.1) brightness(1) hue-rotate(${gradientDeg}deg) !important`)
        // this.root.style.background = `linear-gradient(${gradientDeg}deg, #2E2A32 40%, #23323B 100%)`
        app.style.filter = `filter: hue-rotate(${gradientDeg}deg) !important`;
        svgCanvas.style.filter = `filter: hue-rotate(${-gradientDeg}deg) !important`;
        gradientDeg++
    }, 16)
}, 1000)