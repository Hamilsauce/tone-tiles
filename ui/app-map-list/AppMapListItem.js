import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';

export const AppMapListItem = defineComponent(
  getTemplate('app-map-list-item'),
  (props, { emit }) => {
    const map = props.map;
    const isSelected = computed(() => props.selectedId === props.map.id);
    
    const handleClick = () => {
      emit('mapItemClick', map.id)
    };
    
    const handleSelect = () => {
      emit('mapItemSelect', map.id)
    };
    
    const handleEdit = () => {
      emit('mapItemEdit', map.id)
    };
    
    return {
      map,
      isSelected,
      isCompact: computed(() => props.displayMode === 'compact'),
      handleSelect,
      handleClick,
      handleEdit,
      displayMode: props.displayMode,
    }
  }, {},
)
AppMapListItem.props = ['map', 'selectedId','displayMode']
AppMapListItem.emits = ['mapItemClick', 'mapItemSelect', 'mapItemEdit']