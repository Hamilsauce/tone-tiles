import { ref, computed } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
// import { SVGCanvasHost } from '../SVGCanvasHost.js';
import { router, RouteName } from '../../router/router.js'

export const AppCreateMapView = defineComponent(
  getTemplate('app-map-creation'),
  (props) => {
    // const count = ref(0);
    // const listItems = computed(() => props.listItems);
    
    const handleCancel = () => {
      console.warn('fuck', router)
      
      router.back()
    };
    
    return { handleCancel }
  },
  {
    components: {
      // 'svg-canvas-host': SVGCanvasHost,
    }
  },
)

// AppBody.props = ['listItems'];