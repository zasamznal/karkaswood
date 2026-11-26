// Подписи помещений и размерные линии поверх модели. Видны в разрезе и на плане.
const svgNS = 'http://www.w3.org/2000/svg';
let styled = false;

function ensureStyle() {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `
    :where([data-kw-view]) { position: relative; }
    .kw-plan-overlay { position: absolute; inset: 0; overflow: hidden; pointer-events: none; font-family: var(--sans, Inter, Arial, sans-serif); }
    .kw-plan-overlay svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .kw-plan-overlay path { fill: none; stroke: #5c6659; stroke-width: 1.2; }
    .kw-plan-room, .kw-plan-dim { position: absolute; left: 0; top: 0; white-space: nowrap; will-change: transform, opacity; }
    .kw-plan-room { padding: 3px 8px; border-radius: 11px; background: #fffdf6e8; color: #25352b; font-size: 12px; font-weight: 600; line-height: 1.3; box-shadow: 0 1px 4px #1c2a2026; }
    .kw-plan-dim { padding: 1px 6px; background: var(--kw-plan-paper, #eeeee5); color: #3d483d; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
    [data-kw-season="newyear"] .kw-plan-dim { --kw-plan-paper: #eaf0ed; }
    @media (max-width: 540px) { .kw-plan-room, .kw-plan-dim { font-size: 10.5px; padding: 2px 6px; } }
  `;
  document.head.append(style);
}

const meters = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function createPlanOverlay(container, { rooms = [], bounds, length, width } = {}) {
  ensureStyle();
  const root = document.createElement('div');
  root.className = 'kw-plan-overlay';
  root.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(svgNS, 'svg');
  const lines = document.createElementNS(svgNS, 'path');
  svg.append(lines);
  root.append(svg);
  const labels = (Array.isArray(rooms) ? rooms : []).filter(room => room && typeof room.name === 'string').map(room => {
    const node = document.createElement('span');
    node.className = 'kw-plan-room';
    node.textContent = room.name;
    root.append(node);
    return { node, room };
  });
  function dimension(value) {
    const node = document.createElement('span');
    node.className = 'kw-plan-dim';
    node.textContent = meters.format(value) + ' м';
    root.append(node);
    return node;
  }
  const hasDims = bounds && Number.isFinite(length) && Number.isFinite(width);
  const lengthLabel = hasDims ? dimension(length) : null, widthLabel = hasDims ? dimension(width) : null;
  container.append(root);
  let shown = -1;

  return {
    // project(x, y, z) возвращает координаты точки в пикселях контейнера.
    update(project, { rooms: roomAlpha = 0, dims: dimAlpha = 0 } = {}) {
      const visible = roomAlpha > .01 || dimAlpha > .01;
      if (!visible && shown === 0) return;
      shown = visible ? 1 : 0;
      root.style.display = visible ? '' : 'none';
      if (!visible) return;
      // На узком экране подписи соседних помещений сходятся. Сдвигаем их по вертикали, чтобы читалась каждая.
      const placed = [];
      for (const label of labels) {
        let [x, y] = project(label.room.x, bounds?.y ?? 0, label.room.z);
        if (!label.w) { label.w = label.node.offsetWidth; label.h = label.node.offsetHeight; }
        for (let pass = 0; pass < 5; pass++) {
          const hit = placed.find(other => Math.abs(other.x - x) < (other.w + label.w) / 2 + 2 && Math.abs(other.y - y) < (other.h + label.h) / 2 + 2);
          if (!hit) break;
          y = hit.y + (y >= hit.y ? 1 : -1) * ((hit.h + label.h) / 2 + 3);
        }
        placed.push({ x, y, w: label.w, h: label.h });
        label.node.style.opacity = roomAlpha.toFixed(3);
        label.node.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
      }
      if (!hasDims) return;
      const gap = Math.min(.8, Math.max(.58, Math.max(length, width) * .09));
      const { x0, x1, z0, z1, y } = bounds;
      const a = project(x0, y, z1 + gap), b = project(x1, y, z1 + gap);
      const c = project(x0 - gap, y, z0), d = project(x0 - gap, y, z1);
      const tick = 5;
      lines.setAttribute('d',
        `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${a[0]} ${a[1] - tick}v${tick * 2}M${b[0]} ${b[1] - tick}v${tick * 2}` +
        `M${c[0]} ${c[1]}L${d[0]} ${d[1]}M${c[0] - tick} ${c[1]}h${tick * 2}M${d[0] - tick} ${d[1]}h${tick * 2}`);
      svg.style.opacity = dimAlpha.toFixed(3);
      lengthLabel.style.opacity = widthLabel.style.opacity = dimAlpha.toFixed(3);
      lengthLabel.style.transform = `translate(${((a[0] + b[0]) / 2).toFixed(1)}px,${((a[1] + b[1]) / 2).toFixed(1)}px) translate(-50%,-50%)`;
      widthLabel.style.transform = `translate(${((c[0] + d[0]) / 2).toFixed(1)}px,${((c[1] + d[1]) / 2).toFixed(1)}px) translate(-50%,-50%)`;
    },
    dispose() { root.remove(); },
  };
}
