class NodeValue {
  #value = null;
  
  constructor(value) {
    this.#value = value;
  }
  
  get value() { return this.#value; }
  
  set value(v) { this.#value = v; }
  
  static from(v) { return new NodeValue(v) }
  
  toString() {
    return `${this.#value}`;
  }
  
  toJSON() {
    return this.#value;
  }
}

const gridHelpers = {
  nodes: [
    [],
  ],
  
  get nodeList() { return this.nodes.flatMap((_) => _) },
  
  init(nodes = []) {
    this.nodes = nodes.map(r => r.map(c => NodeValue.from(c)))
  },
  
  getRow(i) {
    const index = i < 0 ? this.nodes.length + i : Math.min(i, this.nodes.length - 1);
    return this.nodes[index];
  },
  
  getCol(i) {
    const index = i < 0 ? this.nodes[0].length + i : Math.min(i, this.nodes[0].length - 1);
    console.warn({ index, col: this.nodes.map(r => r[index]) })
    
    
    return this.nodes.map(r => r[index]);
  },
  
  
  findNode(cb = () => {}) {
    return this.nodeList.find(cb)
  },
  
  findNodes(cb = () => {}) {
    return this.nodeList.filter(cb)
  },
  
  getNodeAtPoint(x, y) {
    return this.nodes[y][x];
  },
  
  getRange({ start, end }, updateFn) {
    let range = [];
    
    for (let x = start.x; x < end.x; x++) {
      for (let y = start.y; y < end.y; y++) {
        const tile = this.getNodeAtPoint({ x, y });
        
        tile.selected = true;
      }
    }
    
    return range;
  },
  
}


export const procGenMap = (width, height, options = {}) => {
  const rows = new Array(height).fill(null).map(_ => new Array(width).fill(0))
  gridHelpers.init(rows) // = rows
  console.warn({ gridHelpers })
  
  // const firstRow = rows[0]
  const firstRow = gridHelpers.getRow(0)
  const lastRow = gridHelpers.getRow(-1)
  const firstCol = gridHelpers.getCol(0)
  const lastCol = gridHelpers.getCol(-1)
  // const lastRow = rows[rows.length - 1]
  
  firstRow.forEach((_, i) => {
    _.value = 1
  });
  
  firstCol.forEach((_, i) => {
    _.value = 1
  });

  lastRow.forEach((_, i) => {
    _.value = 1
  });
  
  lastCol.forEach((_, i) => {
    _.value = 1
  });
  
  console.warn({
    firstRow,
    lastRow,
    firstCol,
    lastCol,
  })
  
  return gridHelpers.nodes
}


export const previewGrid = (grid = [
  []
]) => {
  console.warn(grid.map((row) => row.toString().replace(/,/g, '  ')).join('\n'))
}

previewGrid(procGenMap(10, 10))