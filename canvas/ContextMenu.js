import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

const _contextMenuTransforms = [
{
  type: 'translate',
  values: [0, 0],
  position: 0,
},
{
  type: 'rotate',
  values: [0, 0, 0],
  position: 1,
},
{
  type: 'scale',
  values: [0.05, 0.05],
  position: 2,
}];
const contextMenuTransforms = [
  { type: 'translate', values: [0, 0], position: 0 },
  { type: 'rotate', values: [0, 0, 0], position: 1 },
  { type: 'scale', values: [0.05, 0.05], position: 2 },
];

const defaultContextMenuItems = [
{
  type: 'tile-type',
  value: 'empty',
  textContent: 'Empty',
  list: 'primary',
},
{
  type: 'tile-type',
  value: 'barrier',
  textContent: 'Barrier',
  list: 'primary',
},
{
  type: 'tile-type',
  value: 'start',
  textContent: 'Start',
  list: 'primary',
},
{
  type: 'tile-type',
  value: 'goal',
  textContent: 'Goal',
  list: 'primary',
},
{
  type: 'tile-type',
  value: 'teleport',
  textContent: 'Teleport',
  list: 'primary',
},
{
  type: 'tile-action',
  value: 'link-teleport',
  textContent: 'Link to...',
  list: 'primary',
}, ];

export class ContextMenu extends CanvasObject {
  #menuList = null;
  
  #menuItems = [];
  
  
  constructor(ctx, menuItems = defaultContextMenuItems) {
    super(ctx, 'context-menu', { transforms: contextMenuTransforms });
    
    this.#menuList = this.getEl('.context-menu-list')
    this.dom.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      
      const targ = e.target.closest('li');
      console.warn(targ.dataset)
      if (!targ) return;
      
      const selectedOptionValue = targ.dataset.value;
      const selectedOptionType = targ.dataset.type;
      const selectedTileTypeName = targ.dataset.value;
      
      if (selectedOptionType === 'tile-action') {
        targ.dataset.active = true;
      }
      
      this.emit('tile-action', {
        type: selectedOptionType === 'tile-action' ? selectedOptionValue : selectedTileTypeName
      });
    });
  };
  
  hide() {
    this.menuItems.forEach(_ => _.dataset.active = false)
    super.hide();
  }
  
  onMenuClick(e) {
    const value = e.target.dataset.value;
  }
  
  toggleActions(v = null) {
    if (v === true || v === false) {
      this.data.showActions = v
    } else {
      const isTrue = this.data.showActions === 'true'
      
      this.data.showActions = isTrue ? false : true
    }
  }
  
  get menuItems() { return [...this.getEls('li')]; };
}