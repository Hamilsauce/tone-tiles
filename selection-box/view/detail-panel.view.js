const foreignObject = `
<foreignObject x="20" y="20" width="160" height="160">
    <div xmlns="http://www.w3.org/1999/xhtml">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      Sed mollis mollis mi ut ultricies. Nullam magna ipsum,
      porta vel dui convallis, rutrum imperdiet eros. Aliquam
      erat volutpat.
    </div>
  </foreignObject>
`
const SVG_NS = 'http://www.w3.org/2000/svg'

export class DetailPanel {
  constructor(tile) {
    this.panel = document.createElementNS(SVG_NS, 'g');
    // this.surface = document.createElementNS(SVG_NS, 'rect');
    this.content = document.createElementNS(SVG_NS, 'foreignObject');
    this.content.classList.add('content-container')

    // this.panel.appendChild(this.surface)
    this.panel.appendChild(this.content)
    // this.surface.x.baseVal.value = +tile.dataset.x + 1.5;
    // this.surface.y.baseVal.value = +tile.dataset.y - 2.5;
    // this.surface.setAttribute('width', 2.5)
    // this.surface.setAttribute('height', 5.5)
    // this.surface.setAttribute('fill', 'white')
    // this.surface.setAttribute('stroke', 'black')
    // this.surface.setAttribute('stroke-width', 0.1)
    this.panel.classList.add('panel')

    this.createPanelContent(tile)
    // this.surface = 
  }

  appendTo(el) { el.appendChild(this.panel) }

  createPanelContent(tile) {
    const div1 = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    div1.classList.add('panel-content')
    div1.textContent = `[${tile.dataset.x}, ${tile.dataset.y}]`
    this.content.setAttribute('width', 2.5)
    this.content.setAttribute('height', 5.5)
    this.content.setAttribute('x', +tile.dataset.x + 1.5)
    this.content.setAttribute('y', +tile.dataset.y - 2.5)
    // this.content.setAttribute('transform', 'scale(0.75)')
    // this.panel.setAttribute('transform', 'scale(1)')

    this.content.appendChild(div1)
    this.panel.appendChild(this.content)
  }

  reomve(el) {
    this.panel.remove()
    // el.removeChild(this.surface )

  }

  get prop() { return this._prop };
  set prop(newValue) { this._prop = newValue };
}
