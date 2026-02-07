import { ref, computed } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { SVGCanvasHost } from '../SVGCanvasHost.js';

export const AppBody = defineComponent(
  getTemplate('app-body'),
  (props) => {
    const count = ref(0);
    const listItems = computed(() => props.listItems);

    return { count, listItems }
  },
  {
    components: {
      'svg-canvas-host': SVGCanvasHost,
    }
  },
)

AppBody.props = ['listItems'];