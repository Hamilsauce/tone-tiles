export class Drawer extends EventTarget {
  #options = [];
  constructor(parentSelector = '#app') {
    super();
    this.parent = document.querySelector(parentSelector);
    this.drawer = document.querySelector('#drawer-template').content.firstElementChild.cloneNode(true) || document.createElement('div')
    this.handle = this.drawer.querySelector('.drawer-handle');
    this.optionsContainer = this.drawer.querySelector('.option-container');
    this.currentHeight
    this.handleClick = this.#handleClick.bind(this);
    this.init();
  }
  
  get currentDrawerHeight() {
    return parseInt(getComputedStyle(this.drawer).height)
  }
  
  get options() {
    return [...this.optionsContainer.children]
  }
  
  init() {
    this.parent.appendChild(this.drawer)
    this.handle.addEventListener('dblclick', this.doubleClickDrawerHandle.bind(this));
    
    this.optionsContainer.addEventListener('click', this.handleClick)
    
    this.parent.addEventListener('click', e => {
      const pathContains = [...e.composedPath()].some(_ => _ === this.drawer)
      if (!pathContains) {
        this.drawer.style.transition = '0.6s ease-in-out';
        this.drawer.style.height = `${136}px`;
        this.drawer.dataset.expanded = 'false';
        setTimeout(() => this.drawer.style.transition = '', 600)
      }
    });
    this.handle.addEventListener('touchstart', this.startDrag.bind(this));
    document.addEventListener('touchstart', this.startDrag.bind(this));
  }
  
  isHandleEventSource(e) { return [...e.composedPath()].some(el => el === this.handle) }
  
  startDrag(e) {
    if (this.isHandleEventSource(e)) {
      
      this.handle.classList.add('pressed');
      
      this.handle.addEventListener('touchmove', this.dragDrawer.bind(this), true)
      this.handle.addEventListener('touchend', this.stopDrag.bind(this), true)
      e.preventDefault();
    } else return;
  }
  
  stopDrag(e) {
    this.handle.classList.remove('pressed')
    this.drawer.removeEventListener('touchmove', this.dragDrawer.bind(this), true)
    this.drawer.removeEventListener('touchend', this.stopDrag.bind(this), true)
  }
  
  dragDrawer(e) {
    const currentHeight = parseInt(getComputedStyle(this.drawer).height)
    const maxHeight = 450;
    const appHeight = parseInt(getComputedStyle(document.body).height)
    const touch = e.changedTouches[0].pageY - 10;
    
    if ((touch > (appHeight - 100))) return;
    else if (touch <= (appHeight - maxHeight)) this.drawer.style.height = `${this.currentDrawerHeight}px`;
    else this.drawer.style.height = `${(appHeight - touch)}px`;
  }
  
  doubleClickDrawerHandle(e) {
    if (this.drawer.dataset.expanded === 'true') {
      this.drawer.style.height = `${100}px`;
      this.drawer.dataset.expanded = 'false';
    } else {
      this.drawer.style.height = `${425}px`;
      this.drawer.dataset.expanded = 'true';
    }
  }
  
  toggleDrawerTransitionCSS() {
    this.drawer.style.transition = '0.6s ease-in-out';
    setTimeout(() => this.drawer.style.transition = '', 600)
  }
  
  #handleClick(e) {
    const targetOpt = e.target.closest('.drawer-option');
    if (!targetOpt) return;
    
    const optValue = targetOpt.dataset.value
    
    console.warn('handleClick optValue', optValue)
    this.dispatchEvent(new CustomEvent('drawer:optionclick', { detail: { value: optValue } }))
  }
}