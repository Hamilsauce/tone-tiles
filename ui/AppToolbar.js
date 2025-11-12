import { ref } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';

// console.warn('defineComponent', defineComponent)
export const AppToolbar = defineComponent(
  getTemplate('app-toolbar'),
  (props) => {
    const count = ref(0);
    return { count }
  }, {},
)