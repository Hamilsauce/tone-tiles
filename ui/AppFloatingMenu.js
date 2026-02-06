import { reactive, computed, ref, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';


const DisplayState = {
  expanded: 'expanded',
  collapsed: 'collapsed',
}

export const AppFloatingMenu = defineComponent(
  getTemplate('app-floating-menu'),
  (props) => {
    const appEl = document.querySelector('#app-host');
    let stopDrag
    
    const floatingMenuRef = ref(null);
    
    const currentPoint = ref({ x: 0, y: 0 });
    const pointerStart = ref({ x: 0, y: 0 });
    
    const bounds = computed(() => ({
      x: appEl.clientWidth,
      y: appEl.clientHeight,
    }));
    
    const displayState = ref(DisplayState.collapsed);
    
    const handleClick = () => {
      
    }
    const attachDrag = () => {
      
      const onDrag = ({ target, clientX: x, clientY: y }) => {
        if (displayState.value !== DisplayState.collapsed) {
          return
        }
        
        currentPoint.value.x = (x) // - pointerStart.value.x)
        currentPoint.value.y = (y) // - pointerStart.value.y)
        
        // if (Math.abs(x - currentPoint.value.x) < 5 || Math.abs(y - currentPoint.value.y) < 5) return;
        
        // if (x + 25 >= bounds.value.x) {
        //   x = bounds.value.x - 25
        // }
        // if (y + 25 >= bounds.value.y) {
        //   y = bounds.value.y - 25
        // }
        
        floatingMenuRef.value.style.top = `${currentPoint.value.y-25}px`;
        floatingMenuRef.value.style.left = `${currentPoint.value.x-25}px`;
      };
      
      const onPointerUp = ({ target, clientX: x, clientY: y }) => {
        currentPoint.value.x = 0 //x;
        currentPoint.value.y = 0 //y;
        // pointerStart.value.x = 0 //x;
        // pointerStart.value.y = 0 //y;
        
        floatingMenuRef.value.addEventListener('pointerdown', onPointerDown);
        floatingMenuRef.value.removeEventListener('pointermove', onDrag);
        floatingMenuRef.value.removeEventListener('pointerup', onPointerUp);
      };
      
      const onPointerDown = ({ target, clientX: x, clientY: y }) => {
        pointerStart.value.x = x;
        pointerStart.value.y = y;
        currentPoint.value.x = x;
        currentPoint.value.y = y;
        
        floatingMenuRef.value.addEventListener('pointermove', onDrag);
        floatingMenuRef.value.addEventListener('pointerup', onPointerUp);
        floatingMenuRef.value.removeEventListener('pointerdown', onPointerDown);
      };
      
      floatingMenuRef.value.addEventListener('pointerdown', onPointerDown);
      
      return () => {
        floatingMenuRef.value.removeEventListener('pointermove', onDrag)
        floatingMenuRef.value.removeEventListener('pointerup', onPointerUp)
        floatingMenuRef.value.removeEventListener('pointerdown', onPointerDown)
      }
    };
    
    const handleDisplayChange = (newState = null) => {
      if (!newState) {
        displayState.value = displayState.value === 'collapsed' ? 'expanded' : 'collapsed';
      } else {
        displayState.value = newState;
      }
    };
    
    onMounted(() => {
      floatingMenuRef.value.addEventListener('click', (e) => handleDisplayChange(null));
      
      stopDrag = attachDrag();
    });
    
    return { floatingMenuRef, displayState, handleDisplayChange }
  }, {},
)