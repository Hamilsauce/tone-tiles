import { ref, computed, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { router, route, RouteName } from '../../router/router.js'

const PINNED_MAP_ID = 'AV1lKxUDArOcODrZAgaQ'; // diagnal

export const AppSplashView = defineComponent(
  getTemplate('app-splash-view'),
  (props, ctx) => {
    const foregroundRef = ref(null);
    const fade = ref(false);
    let parent;
    
    const handleClick = () => {
      fade.value = true;
      
      setTimeout(() => {
        router.push({
          name: RouteName.mapList,
        })
      }, 2000);
    };
    
    onMounted(() => {
      parent = foregroundRef.value.parentElement;
      
      foregroundRef.value.style.opacity = 0;
      foregroundRef.value.remove();
      
      setTimeout(() => {
        parent.append(foregroundRef.value);
        setTimeout(() => {
          foregroundRef.value.style.opacity = 1;
        }, 1);
      }, 0);
    })
    
    return {
      fade,
      handleClick,
      foregroundRef
    }
  }, {},
)