import { ref, computed, watch, reactive } from 'vue'

const isRunningState = ref(true);
const frameRateState = ref(0);
const currentNodeState = ref(null);
const traversalEffectsEnabledState = ref(false);


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
  
  const setCurrentNode = (node) => {
    currentNodeState.value = node;
  };
  
  const setTraversalEffectsEnabled = (value) => {
    if (typeof value !== 'boolean') {
      console.error(`setTraversalEffectsEnabled called invalid value: ${value}`)
      
      return;
    }
    
    traversalEffectsEnabledState.value = value;
  };
  
  const toggleTraversalEffects = () => {
    setTraversalEffectsEnabled(!traversalEffectsEnabledState.value);
  };
  
  return {
    setRunning,
    setFrameRate,
    setTraversalEffectsEnabled,
    toggleTraversalEffects,
    
    setCurrentNode,
    currentNode: computed(() => currentNodeState.value || {}),
    isRunning: computed(() => isRunningState.value),
    frameRate: computed(() => frameRateState.value),
    traversalEffectsEnabled: computed(() => traversalEffectsEnabledState.value),
  }
};
