import { ref, computed } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
// import { ListItem } from '../ui/ListItem.js';
// console.warn('ListItem', ListItem)
// import listItemsData from '../data/mock-project-list.js';

export const AppBody = defineComponent(
  getTemplate('app-body'),
  (props) => {
    const count = ref(0);
    // const listItems = ref(props.listItems);
    const listItems = computed(() => props.listItems);
    // const listItems = computed(() => listItemsData);
    return { count, listItems }
  },
  {
    components: {
      // 'list-item': ListItem,
    }
    
  },
)

AppBody.props = ['listItems']