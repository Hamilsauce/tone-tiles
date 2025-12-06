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
    const bounds = computed(() => ({
      x: appEl.clientWidth,
      y: appEl.clientHeight,
    }));
    
    const displayState = ref(DisplayState.collapsed);
    
    const attachDrag = () => {
      let currentPoint = { x: 0, y: 0 }
      
      const onDrag = ({ target, clientX: x, clientY: y }) => {
        if (Math.abs(x - currentPoint.x) < 5 || Math.abs(y - currentPoint.y) < 5) return;
        
        if (x + 25 >= bounds.value.x) {
          x = bounds.value.x - 25
        }
        if (y + 25 >= bounds.value.y) {
          y = bounds.value.y - 25
        }
        
        // if (x > 0) {
        //   x =
        // }
        // if (y > 0) {
        //   y =
        // }
        
        // if (y > bounds.value.y) {
        //   y = bounds.value.y
        // }
        
        floatingMenuRef.value.style.top = `${y-25}px`;
        floatingMenuRef.value.style.left = `${x-25}px`;
      };
      
      const onPointerUp = ({ target, clientX: x, clientY: y }) => {
        currentPoint.x = x;
        currentPoint.y = y;
        
        floatingMenuRef.value.addEventListener('pointerdown', onPointerDown);
        floatingMenuRef.value.removeEventListener('pointermove', onDrag);
        floatingMenuRef.value.removeEventListener('pointerup', onPointerUp);
      };
      
      const onPointerDown = ({ target, clientX: x, clientY: y }) => {
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