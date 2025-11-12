

const tileAt = (x, y) => State.tileContainer.querySelector(`.tile[data-y="${y}"][data-x="${x}"]`);

const getRange = ({ start, end }) => {
  const tileContainer = document.querySelector('#tile-container');
  let range = [];
  
  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {
      const tile = tileAt(x, y);
      
      tile.dataset.selected = true;
      
      range.push(tile);
    }
  }
  
  return range;
};