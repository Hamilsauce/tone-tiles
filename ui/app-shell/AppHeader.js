import {
  ref,
  computed,
} from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';

export const AppHeader = defineComponent(
  getTemplate('app-header'),
  (props, ctx) => {
    const footerStateRef = ref('toolbar');
    const footerState = computed(() => footerStateRef.value)
    
    const handleFooterToggle = () => {
      footerStateRef.value = footerStateRef.value === 'toolbar' ? 'drawer' : 'toolbar';
      ctx.emit('footertoggle', footerState.value)
    };
    
    return { footerState, handleFooterToggle }
  }, {},
)