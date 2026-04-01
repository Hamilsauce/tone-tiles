import { ref, watch, computed, toValue, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
import { useAppState } from '../store/app.store.js';
import { useMapStore } from '../store/map.store.js';
import { runCanvas } from '../run-canvas.js';
import { AudioClockLoop } from '../lib/loop-engine.js'
import { router, route } from '../router/router.js'

export const SVGCanvasHost = defineComponent(
  getTemplate('svg-canvas-host'),
  (props, ctx) => {
    const mapStore = useMapStore();
    const { isRunning, setRunning } = useAppState();
    const map = computed(() => mapStore.mapState.value);
    const mapId = computed(() => toValue(route.value.params.id));
    let canvasEl;
    let viewport;
    let scene;
    let tileLayer;
    let objectLayer;
    // const selectionBox = getTileSelector(objectLayer);
    
    const routine1 = (dt, now) => {
      console.warn('routine 1', dt, now)
    }
    
    const render = (dt, now) => {
      console.warn('render', dt, now)
    }
    
    const loopEngine = new AudioClockLoop({
      routines: [routine1],
      render,
    })
    // loopEngine.start()
    
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    const centerViewport = () => {
      viewport.setAttribute('transform', 'matrix(1 0 0 1 0 0)')
    }
    
    onMounted(async () => {
      try {
        if (mapId.value) {
          await mapStore.setCurrentMapById(mapId.value);
          runCanvas(mapId.value);
        }
        
      } catch (e) {
        console.warn('Svg host error run canvas: ', e)
      }
    });
    
    watch(mapId, async (id, prev) => {
      if (id !== prev) {
        await mapStore.setCurrentMapById(id);
      }
    });
    
    return { centerViewport, map }
  }, {
    components: {}
  },
);