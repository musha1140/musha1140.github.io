function ensureCanvas(host) {
  let canvas = host.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.innerHTML = '';
    host.appendChild(canvas);
  }
  return canvas;
}

function drawMatrix(ctx, state) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.fillStyle = '#020202';
  ctx.fillRect(0, 0, width, height);

  const bytes = state.activeCapsuleData ? new Uint8Array(state.activeCapsuleData) : new Uint8Array(0);
  const columns = 24;
  const rows = 24;
  const cellW = width / columns;
  const cellH = height / rows;

  for (let i = 0; i < columns * rows; i += 1) {
    const value = bytes[i % (bytes.length || 1)] || 0;
    const intensity = value / 255;
    const x = (i % columns) * cellW;
    const y = Math.floor(i / columns) * cellH;
    ctx.fillStyle = `rgba(0, 230, 118, ${0.05 + intensity * 0.75})`;
    ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
  }

  ctx.fillStyle = '#7f8c8d';
  ctx.font = '12px monospace';
  ctx.fillText(`MODE: ${state.sandboxMode}`, 14, height - 34);
  ctx.fillText(`RECEIPTS: ${state.telemetryReceipts.length}`, 14, height - 16);
}

export function initCanvasUI(store, hostId = 'gameboard') {
  const host = document.getElementById(hostId);
  if (!host) return () => {};

  const canvas = ensureCanvas(host);
  const ctx = canvas.getContext('2d');
  const unsubscribe = store.subscribe((state) => drawMatrix(ctx, state));

  return unsubscribe;
}
