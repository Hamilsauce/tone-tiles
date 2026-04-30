import { CanvasObject, DefaultCanvasObjectOptions } from './CanvasObject.js';

const _contextMenuTransforms = [
  { type: 'translate', values: [0, 0], position: 0 },
  { type: 'rotate', values: [0, 0, 0], position: 1 },
  { type: 'scale', values: [0.05, 0.05], position: 2 },
];

const contextMenuTransforms = _contextMenuTransforms.reduce((acc, curr, i) => {
  return { ...acc, [curr.type]: curr }
}, {});

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
  type: 'tile-action',
  value: 'copy',
  textContent: 'copy',
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
    super(ctx, 'context-menu', {
      transforms: contextMenuTransforms,
      model: {
        showActions: false,
      }
    });
    
    this.hide();
    this.#menuList = this.getEl('.context-menu-list')
    
    this.dom.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      
      const targ = e.target.closest('li');
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
  
  disableItem(itemValue) {
    const item = this.menuItems.find(_ => _.value = itemValue)
    if (item) {
      item.dataset.disable = true;
      
    }
    super.hide();
  }
  
  onMenuClick(e) {
    const value = e.target.dataset.value;
  }
  
  toggleActions(v = null) {
    if (v === true || v === false) {
      this.update({ showActions: v })
    } else {
      this.update({ showActions: !this.model.showActions })
    }
  }
  
  get menuItems() { return [...this.getEls('li')]; };
}