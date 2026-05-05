import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { AppToolbar } from '../AppToolbar.js';
import { router, RouteName, route } from '../../router/router.js'
import { useAppState } from '../../store/app.store.js';

export const AppFooter = defineComponent(
  getTemplate('app-footer'),
  (props, ctx) => {
    const appStore = useAppState();
    const displayToolbar = computed(() => appStore.toolbarEnabled.value);
    const shouldDisplay = computed(() => route.value.path !== '/' && displayToolbar.value);

    const handleRunningToggle = () => {
      appStore.setRunning(!appStore.isRunning.value);
    }

    return { shouldDisplay }
  }, {
    components: {
      'app-toolbar': AppToolbar,
    }
  },
);