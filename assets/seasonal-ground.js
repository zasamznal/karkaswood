import * as THREE from './vendor/three.module.min.js';

// Set below the model's lowest point so the snow never hides a sill or changes the measured footprint.
export function seasonalGround(min, max) {
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y = min[1] - 0.014;
  const padding = Math.min(0.48, 0.13 * (max[2] - min[2]) + 0.03);
  const rx = (max[0] - min[0]) / 2 + padding, rz = (max[2] - min[2]) / 2 + padding;
  const top = [], bottom = [], edge = [];
  const count = 80;
  const power = value => Math.sign(value) * Math.pow(Math.abs(value), 0.47);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count;
    const r = 1 + 0.016 * Math.sin(3 * a + 0.3) + 0.008 * Math.sin(7 * a - 1.5);
    const x = power(Math.cos(a)) * rx * r, z = power(Math.sin(a)) * rz * r;
    top.push([cx + 0.98 * x, y - 0.008 * (1 + Math.cos(4 * a)), cz + 0.98 * z]);
    edge.push([cx + 1.008 * x, y - 0.036, cz + 1.008 * z]);
    bottom.push([cx + 1.023 * x, y - 0.082 - 0.013 * Math.cos(3 * a), cz + 1.023 * z]);
  }
  const points = [], colors = [];
  function vertex(point, hex) {
    const c = new THREE.Color(hex);
    points.push(...point); colors.push(c.r, c.g, c.b);
  }
  function band(a, b, colA, colB) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      vertex(a[i], colA); vertex(b[i], colB); vertex(b[j], colB);
      vertex(a[i], colA); vertex(b[j], colB); vertex(a[j], colA);
    }
  }
  band(bottom, edge, '#c1d4d5', '#d8e7e6');
  band(edge, top, '#d8e7e6', '#f1f7f6');
  for (let i = 0; i < count; i++) {
    vertex([cx, y, cz], '#ffffff'); vertex(top[i], '#f1f7f6'); vertex(top[(i + 1) % count], '#f1f7f6');
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = document.documentElement.dataset.kwSeason === 'newyear';
  function paint(ctx, project) {
    if (!mesh.visible) return;
    for (const [poly, color] of [[bottom, '#c6d9d9'], [edge, '#dce9e8'], [top, '#f4f9f8']]) {
      ctx.beginPath();
      poly.forEach((point, index) => {
        const [x, y] = project(...point);
        if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
  }
  let observer;
  function watch(redraw) {
    observer = new MutationObserver(() => {
      const enabled = document.documentElement.dataset.kwSeason === 'newyear';
      if (enabled !== mesh.visible) { mesh.visible = enabled; redraw(); }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-kw-season'] });
  }
  return { mesh, paint, watch, dispose() { observer?.disconnect(); mesh.removeFromParent(); geo.dispose(); mat.dispose(); } };
}
