import ham from 'https://hamilsauce.github.io/hamhelper/hamhelper1.0.0.js';
const { DOM, date, array, utils, text } = ham;

export class BoardView {
  #self;

  constructor(selector = '#svg') {
    this.#self = document.querySelector(selector);
    if (!this.#self) throw new Error('canvas el mit found')
    
    this.NS = this.#self.getAttributeNS(null, 'xmlns')

  }

  initialize() {}
  
  insertTile(el, handler){
    const
  }

  create(tag = 'rect', attrs = {}) {
    const el = attrs.namespaceURI ? document.createElementNS(attrs.namespaceURI, tag) : document.createElement(tag);
    for (let attr of Object.keys(attrs)) {
      if (attr === 'data') {
        Object.entries(attrs[attr]).forEach(([prop, val]) => el.dataset[prop] = val)
      } else if (attr === 'classList') {
        el.classList.add(...attrs[attr])
      } else if (attr === 'style') {
        if (typeof attrs[attr] === 'string') el.style = `${el.style} ${attrs[attr]}`
        else Object.entries(attrs[attr]).forEach(([prop, val]) => el.style[prop] = val);
      } else el.setAttribute(attr, attrs[attr])
    }
    return el;
  }

  get tiles() { return this._tiles };
  set tiles(newValue) { this._tiles = newValue };

  get viewBox() { return this.#self.viewBox.baseVal};
  set viewBox(newValue) { this._viewBox = newValue };

  get board() { return this._board };
  set board(newValue) { this._board = newValue };
}
