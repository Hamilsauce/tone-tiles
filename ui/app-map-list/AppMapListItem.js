import { ref, computed, watch } from 'vue'
import { defineComponent2, getTemplate } from '../../lib/vue-helpers.js';

// const AppMapListItem = defineComponent2({
//   template:getTemplate('app-map-list-item'),
//   props:['map', 'selectedId', 'displayMode'],
//   emits:['mapItemClick', 'mapItemSelect', 'mapItemEdit'],
//   setup: (props, { emit }) => {
//     const map = props.map;
//     const isSelected = computed(() => props.selectedId === props.map.id);
    
//     const handleClick = () => {
//       emit('mapItemClick', map.id)
//     };
    
//     const handleSelect = () => {
//       emit('mapItemSelect', map.id)
//     };
    
//     const handleEdit = () => {
//       emit('mapItemEdit', map.id)
//     };
    
//     return {
//       map,
//       isSelected,
//       isCompact: computed(() => props.displayMode === 'compact'),
//       handleSelect,
//       handleClick,
//       handleEdit,
//       displayMode: props.displayMode,
//     }
//   }, 
// })

export default defineComponent2({
  template: getTemplate('app-map-list-item'),
  
  props: [
    'map',
    'selectedId',
    'displayMode',
  ],
  
  emits: [
    'mapItemClick',
    'mapItemSelect',
    'mapItemEdit',
  ],
  
  setup(props, { emit }) {
    const map = props.map;
    
    const isSelected = computed(
      () => props.selectedId === props.map.id
    );
    
    const handleClick = () => {
      emit('mapItemClick', map.id);
    };
    
    const handleSelect = () => {
      emit('mapItemSelect', map.id);
    };
    
    const handleEdit = () => {
      emit('mapItemEdit', map.id);
    };
    
    return {
      map,
      isSelected,
      isCompact: computed(
        () => props.displayMode === 'compact'
      ),
      handleSelect,
      handleClick,
      handleEdit,
      displayMode: props.displayMode,
    };
  },
});
// AppMapListItem.props = ['map', 'selectedId', 'displayMode']
// AppMapListItem.emits = ['mapItemClick', 'mapItemSelect', 'mapItemEdit']

// export default AppMapListItem