export const getPanZoom = (svg) => {
  const vp = svg.getElementById('viewport');
  
  // single source of truth: the view matrix
  let M = new DOMMatrix(); // identity
  
  function applyMatrix() {
    // write as SVG matrix(a b c d e f)
    vp.setAttribute('transform', `matrix(${M.a} ${M.b} ${M.c} ${M.d} ${M.e} ${M.f})`);
  }
  
  // screen (client) -> world (viewport local) conversion using current CTM
  function clientToWorld(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    // viewport.getScreenCTM() maps world->screen; invert = screen->world
    const inv = vp.getScreenCTM().inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }
  
  // --- PANNING (one pointer) and PINCH (two pointers) ---
  const pointers = new Map(); // id -> {cx, cy}
  let lastTwo = null; // {centerClient:{x,y}, dist:number}
  
  svg.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { cx: e.clientX, cy: e.clientY });
    svg.setPointerCapture(e.pointerId);
  });
  
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    // update stored pointer
    pointers.set(e.pointerId, { cx: e.clientX, cy: e.clientY });
    
    const arr = Array.from(pointers.values());
    
    if (arr.length === 1) {
      // PAN: compute world delta between last and current screen positions
      const p = arr[0];
      // we need the *previous* screen position; reconstruct from event.movement*
      const prevClient = { x: e.clientX - e.movementX, y: e.clientY - e.movementY };
      const w0 = clientToWorld(prevClient.x, prevClient.y);
      const w1 = clientToWorld(p.cx, p.cy);
      const dx = w1.x - w0.x;
      const dy = w1.y - w0.y;
      // translate in world space (pre-multiply)
      M = new DOMMatrix().translate(dx, dy).multiply(M);
      applyMatrix();
      
    } else if (arr.length === 2) {
      // PINCH: simultaneous scale + pan, both in world space around the pinch midpoint
      const cNow = {
        x: (arr[0].cx + arr[1].cx) / 2,
        y: (arr[0].cy + arr[1].cy) / 2
      };
      const dNow = Math.hypot(arr[0].cx - arr[1].cx, arr[0].cy - arr[1].cy);
      
      if (lastTwo) {
        const cPrev = lastTwo.centerClient;
        const dPrev = lastTwo.dist;
        if (dPrev > 0) {
          // 1) pan by world delta of center movement
          const wPrev = clientToWorld(cPrev.x, cPrev.y);
          const wNow = clientToWorld(cNow.x, cNow.y);
          const tdx = wNow.x - wPrev.x;
          const tdy = wNow.y - wPrev.y;
          M = new DOMMatrix().translate(tdx, tdy).multiply(M);
          
          // 2) scale about current center world pivot
          const s = dNow / dPrev;
          const pivot = clientToWorld(cNow.x, cNow.y);
          M = new DOMMatrix()
            .translate(pivot.x, pivot.y)
            .scale(s)
            .translate(-pivot.x, -pivot.y)
            .multiply(M);
          
          applyMatrix();
        }
      }
      lastTwo = { centerClient: cNow, dist: dNow };
    }
  });
  
  function clearTwoFingerStateIfNeeded() { lastTwo = null; }
  
  svg.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    svg.releasePointerCapture(e.pointerId);
    clearTwoFingerStateIfNeeded();
  });
  
  svg.addEventListener('pointercancel', e => {
    pointers.delete(e.pointerId);
    clearTwoFingerStateIfNeeded();
  });
  
  svg.addEventListener('pointerout', e => { /* ignore */ });
  
  // --- WHEEL / TRACKPAD ZOOM (pivot at cursor) ---
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    
    // choose a gentle factor; trackpads produce small continuous deltas
    const base = 1.0015;
    // normalize: positive deltaY -> zoom out, negative -> zoom in
    const s = Math.pow(base, -e.deltaY);
    
    const pivot = clientToWorld(e.clientX, e.clientY);
    
    // scale about pivot (pre-multiply)
    M = new DOMMatrix()
      .translate(pivot.x, pivot.y)
      .scale(s)
      .translate(-pivot.x, -pivot.y)
      .multiply(M);
    
    applyMatrix();
  }, { passive: false });
  
  // initial paint
  applyMatrix();
};