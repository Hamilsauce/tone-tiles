import { ref, computed, watch, reactive } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';

import { AppHeader } from './app-shell/AppHeader.js';
import { AppBody } from './app-shell/AppBody.js';
import { AppFooter } from './app-shell/AppFooter.js';
import { AppFloatingMenu } from './AppFloatingMenu.js';

const t = getTemplate('app');

export const App = defineComponent(
  getTemplate('app', true),
  () => {
    const footerDisplayState = ref('toolbar');
    
    const footerDisplay = computed(() => footerDisplayState.value);
    
    const handleFooterChange = (e) => {
      footerDisplayState.value = e
    };
    
    return { footerDisplayState, handleFooterChange }
  },
  {
    components: {
      'app-header': AppHeader,
      'app-body': AppBody,
      'app-footer': AppFooter,
      'app-floating-menu': AppFloatingMenu,
    }
  },
)