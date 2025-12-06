import { ref, watch } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';

// console.warn('defineComponent', defineComponent)
export const AppToolbar = defineComponent(
  getTemplate('app-toolbar'),
  (props) => {
    const count = ref(0);
    console.warn('TOOL BAR SETUP', count.value)

    watch(count, () => {
      console.warn('count', count.value)
    })
    return { count }
  }, {},
)