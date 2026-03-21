import { ref, computed, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { SVGCanvasHost } from '../SVGCanvasHost.js';

export const AppBody = defineComponent(
  getTemplate('app-body'),
  () => {
    
    
  },
  {
    components: {
      'svg-canvas-host': SVGCanvasHost,
    }
  },
)