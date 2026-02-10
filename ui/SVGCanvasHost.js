import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
// import { AppToolbar } from '../AppToolbar.js';
import { useAppState } from '../store/app.store.js';
import { runCanvas } from '../run-canvas.js';

export const SVGCanvasHost = defineComponent(
  getTemplate('svg-canvas-host'),
  (props, ctx) => {
    const { isRunning, setRunning } = useAppState();
    
    let canvasEl; // = document.querySelector('#canvas');
    let scene; // = canvasEl.querySelector('#scene');
    let tileLayer; // = scene.querySelector('#tile-layer');
    let objectLayer; // = scene.querySelector('#object-layer');
    // const selectionBox = getTileSelector(objectLayer);
    
    
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    watch(isRunning, (value) => {
      if (value) {
        objectLayer.style.display = null;
      } else {
        objectLayer.style.display = 'none';
      }
    });
    
    onMounted(() => {
      canvasEl = document.querySelector('#canvas');
      scene = canvasEl.querySelector('#scene');
      tileLayer = scene.querySelector('#tile-layer');
      objectLayer = scene.querySelector('#object-layer');
      
      runCanvas();
    });
    
    return {}
  }, {
    components: {
      // 'app-toolbar': AppToolbar,
    }
  },
);