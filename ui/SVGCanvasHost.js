import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
import { useAppState } from '../store/app.store.js';
import { useMapStore } from '../store/map.store.js';
import { runCanvas } from '../run-canvas.js';

export const SVGCanvasHost = defineComponent(
  getTemplate('svg-canvas-host'),
  (props, ctx) => {
    const { mapState } = useMapStore();
    const { isRunning, setRunning } = useAppState();
    const map = computed(() => mapState.value);
    let canvasEl; // = document.querySelector('#canvas');
    let viewport; // = document.querySelector('#canvas');
    let scene; // = canvasEl.querySelector('#scene');
    let tileLayer; // = scene.querySelector('#tile-layer');
    let objectLayer; // = scene.querySelector('#object-layer');
    // const selectionBox = getTileSelector(objectLayer);
    
    
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    const centerViewport = () => {
      viewport.setAttribute('transform', 'matrix(1 0 0 1 0 0)')
    }
    
    onMounted(() => {
      canvasEl = document.querySelector('#canvas');
      viewport = canvasEl.querySelector('#viewport');
      scene = canvasEl.querySelector('#scene');
      tileLayer = scene.querySelector('#tile-layer');
      objectLayer = scene.querySelector('#object-layer');
      
      runCanvas();
    });
    
    return { centerViewport, map }
  }, {
    components: {}
  },
);