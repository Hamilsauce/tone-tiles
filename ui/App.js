import { ref, computed, watch, reactive } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
// import { savedProjects ,tripleProjects} from '../data/projects.js';
import { Drawer } from './Drawer.js';

import { AppHeader } from './app-shell/AppHeader.js';
import { AppBody } from './app-shell/AppBody.js';
import { AppFooter } from './app-shell/AppFooter.js';


// import { ListItem } from './ListItem.js';
const t = getTemplate('app');

export const App = defineComponent(
  getTemplate('app', true),
  () => {
    const drawer = new Drawer('#app-host')
    drawer.hide();
    
    const footerDisplayState = ref('toolbar');
    // const count = ref(0);
    
    const footerDisplay = computed(() => footerDisplayState.value);
    const showToolbar = computed(() => footerDisplay.value === 'toolbar');
    // const sh = computed(() => footerDisplay.value === 'toolbar');
    
    // const listItems = computed(() => tripleProjects);
    // const listItems = ref(listItemsData);
    const handleFooterChange = (e) => {
      // console.warn('[IN APP handleFooterChange]', e)
      footerDisplayState.value = e
    };
    
    watch(footerDisplay, (value) => {
      if (value === 'drawer') {
        drawer.show()
      }
      else {
        drawer.hide()
      }
    })
    
    return { showToolbar, footerDisplayState, handleFooterChange }
  },
  {
    components: {
      'app-header': AppHeader,
      'app-body': AppBody,
      'app-footer': AppFooter,
      // 'list-item': ListItem,
    }
    
  },
)