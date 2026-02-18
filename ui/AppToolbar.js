import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
import { useAppState } from '../store/app.store.js';

export const AppToolbar = defineComponent(
  getTemplate('app-toolbar'),
  (props, ctx) => {
    const { isRunning, setRunning } = useAppState();
    const handleClick = () => {
      
      setRunning(!isRunning.value);
    }
    
    return {
      isRunning,
      handleClick,
    }
  },
);

// AppToolbar.props = ['isRunning']