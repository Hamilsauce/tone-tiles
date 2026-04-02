import { ref, computed, watch, reactive } from 'vue'

const isRunningState = ref(true);
const frameRateState = ref(0);


export const useAppState = () => {
  
  const setRunning = (value) => {
    if (typeof value !== 'boolean') {
      console.error(`setRunning called invalid value: ${value}`)
      
      return;
    }
    
    isRunningState.value = value;
  };
  
  const setFrameRate = (value) => {
    frameRateState.value = +value;
  };
  
  return {
    setRunning,
    setFrameRate,
    isRunning: computed(() => isRunningState.value),
    frameRate: computed(() => frameRateState.value),
  }
};