import { ref, watch, onBeforeUnmount, computed, toValue, onMounted } from 'vue'
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
    let cancelRunCanvas;

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
          cancelRunCanvas = await runCanvas(mapId.value);
        }
      } catch (e) {
        console.warn('Svg host error run canvas: ', e)
      }
    });

    onBeforeUnmount(async () => {
      try {
        if (cancelRunCanvas) {
          cancelRunCanvas()
        }
      } catch (e) {
        console.warn('ERROR SHUTTING DOWN CANVAS')
        console.error(e)
      }
    });

    watch(mapId, async (id, prev) => {
      if (id && id !== prev) {
        await mapStore.setCurrentMapById(id);
      }
    });

    return { centerViewport, map }
  }, {
    components: {}
  },
);