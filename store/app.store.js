import { ref, computed, watch, reactive } from 'vue'

const isRunningState = ref(true);


export const useAppState = () => {
  const setRunning = (value) => {
    if (typeof value !== 'boolean') {
      console.error(`setRunning called invalid value: ${value}`)
      
      return;
    }
    
    isRunningState.value = value;
  };
  
  return {
    setRunning,
    isRunning: computed(() => isRunningState.value),
  }
};