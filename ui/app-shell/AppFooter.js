import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { AppToolbar } from '../AppToolbar.js';

export const AppFooter = defineComponent(
  getTemplate('app-footer'),
  (props, ctx) => {
    const showToolbar = computed(() => props.showToolbar)
    
    // watch(showToolbar, (value) => {
    //   console.warn('showToolbar', showToolbar.value)
    // })
    
    return {
      showToolbar,
    }
  }, {
    components: {
      'app-toolbar': AppToolbar,
    }
  },
);

AppFooter.props = ['showToolbar']