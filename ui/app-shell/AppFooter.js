import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { AppToolbar } from '../AppToolbar.js';
import { router, RouteName, route } from '../../router/router.js'

export const AppFooter = defineComponent(
  getTemplate('app-footer'),
  (props, ctx) => {
    const shouldDisplay = computed(() => route.value.path !== '/')
    
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    return { shouldDisplay }
  }, {
    components: {
      'app-toolbar': AppToolbar,
    }
  },
);