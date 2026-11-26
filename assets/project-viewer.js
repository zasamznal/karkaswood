import * as THREE from './vendor/three.module.min.js';
import { createProjectGeometry } from './project-geometry.js';
import { seasonalGround } from './seasonal-ground.js';
import { createPlanOverlay } from './plan-overlay.js';

const { clamp, smoothstep } = THREE.MathUtils;
const WALLS = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] };
const materials = ['plain', 'wood', 'metal', 'floor', 'glass'];
const cachedImages = new Map();

function textureImage(type) {
  if (type === 'plain') return null;
  if (cachedImages.has(type)) return cachedImages.get(type);
  const image = document.createElement('canvas');
  image.width = 192;
  image.height = 256;
  const ctx = image.getContext('2d');
  let seed = 3527;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  if (type === 'glass') {
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#e4eff3'); sky.addColorStop(0.46, '#c6d6d3'); sky.addColorStop(0.64, '#9daea5'); sky.addColorStop(1, '#bac6bd');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 192, 256);
    for (let i = 0; i < 90; i++) {
      const x = random() * 220 - 10, y = 158 + Math.sin(x * 0.022) * 9;
      const size = 4 + random() * 12, h = 12 + random() * 39;
      ctx.fillStyle = i % 2 ? '#99aaa3' : '#9fb1ab';
      ctx.beginPath(); ctx.moveTo(x - size, y + 8); ctx.lineTo(x, y - h); ctx.lineTo(x + size, y + 8); ctx.fill();
    }
  } else {
    ctx.fillStyle = type === 'metal' ? '#f7f8f8' : '#faf6ec';
    ctx.fillRect(0, 0, 192, 256);
    if (type === 'metal') {
      for (let x = 0; x < 192; x += 24) {
        const rib = ctx.createLinearGradient(x, 0, x + 24, 0);
        rib.addColorStop(0, '#c0c6c8'); rib.addColorStop(0.10, '#f6f6f5'); rib.addColorStop(0.19, '#e2e5e3'); rib.addColorStop(0.23, '#eef0ec'); rib.addColorStop(1, '#f6f6f5');
        ctx.fillStyle = rib; ctx.fillRect(x, 0, 24, 256);
      }
    } else {
      for (let i = 0; i < 385; i++) {
        const x = random() * 192, warp = random() * 6 - 3;
        ctx.strokeStyle = 'rgba(93,68,42,' + (0.015 + random() * 0.17) + ')';
        ctx.lineWidth = 0.4 + random() * 1.25;
        ctx.beginPath(); ctx.moveTo(x, -2); ctx.bezierCurveTo(x + warp, 90, x - warp, 178, x, 258); ctx.stroke();
      }
      for (let k = 0; k < 5; k++) {
        const x = random() * 192, y = random() * 256;
        for (let r = 1; r < 5; r++) {
          ctx.strokeStyle = 'rgba(104,74,46,0.13)'; ctx.lineWidth = 0.85; ctx.beginPath();
          ctx.ellipse(x, y, r * 1.1, r * 3.5, 0.1, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }
  const result = { image, pixels: ctx.getImageData(0, 0, image.width, image.height) };
  cachedImages.set(type, result);
  return result;
}

function groupGeometry(model) {
  const groups = new Map(), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const f of model.faces) {
    if (!f.points || f.points.length < 3) continue;
    const key = f.group || 'base';
    if (!groups.has(key)) groups.set(key, { key, faces: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], lift: 0, scale: 1, alpha: 1 });
    const g = groups.get(key), type = materials.includes(f.material) ? f.material : 'plain';
    const color = new THREE.Color(f.color);
    g.faces.push({ ...f, type, color, uv: f.uv || f.points.map(p => [p[0], p[1]]) });
    for (const p of f.points) for (let i = 0; i < 3; i++) {
      g.min[i] = Math.min(g.min[i], p[i]); g.max[i] = Math.max(g.max[i], p[i]);
      min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]);
    }
  }
  if (!groups.size) throw new Error('У проекта отсутствует геометрия.');
  for (const g of groups.values()) {
    g.corners = [];
    for (const x of [g.min[0], g.max[0]]) for (const y of [g.min[1], g.max[1]]) for (const z of [g.min[2], g.max[2]]) g.corners.push([x, y, z]);
  }
  return { groups, min, max };
}

function makeWebGL(canvas, geometry, winter) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xffffff, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.05, 160);
  scene.add(winter.mesh);
  const textureMaps = new Map(), meshes = [];
  for (const type of materials) {
    const image = textureImage(type);
    if (!image) continue;
    const map = new THREE.CanvasTexture(image.image);
    map.colorSpace = THREE.SRGBColorSpace;
    if (type !== 'glass') map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textureMaps.set(type, map);
  }
  for (const g of geometry.groups.values()) {
    for (const type of materials) {
      const faces = g.faces.filter(f => f.type === type); if (!faces.length) continue;
      const pos = [], normal = [], uv = [], colors = [], index = [];
      for (const face of faces) {
        const offset = pos.length / 3;
        for (let i = 0; i < face.points.length; i++) {
          pos.push(...face.points[i]); normal.push(...face.normal); uv.push(...face.uv[i]);
          colors.push(face.color.r, face.color.g, face.color.b);
        }
        for (let i = 1; i < face.points.length - 1; i++) index.push(offset, offset + i, offset + i + 1);
      }
      const buffer = new THREE.BufferGeometry();
      buffer.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      buffer.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      buffer.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      buffer.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      buffer.setIndex(index); buffer.computeBoundingSphere();
      const mat = new THREE.MeshStandardMaterial({ map: textureMaps.get(type) || null, vertexColors: true,
        roughness: type === 'glass' ? 0.3 : type === 'metal' ? 0.64 : 0.90, metalness: type === 'metal' ? 0.12 : 0 });
      const mesh = new THREE.Mesh(buffer, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      meshes.push({ mesh, group: g }); scene.add(mesh);
    }
  }
  scene.add(new THREE.HemisphereLight('#fff9eb', '#b8b6a9', 1.78));
  const sun = new THREE.DirectionalLight('#fff3df', 2.35), fill = new THREE.DirectionalLight('#e2edf2', 0.60);
  const cx = (geometry.min[0] + geometry.max[0]) / 2, cz = (geometry.min[2] + geometry.max[2]) / 2;
  const span = Math.max(geometry.max[0] - geometry.min[0], geometry.max[2] - geometry.min[2], geometry.max[1] - geometry.min[1]);
  const sunHome = [cx - span, span * 1.5, cz + span * 1.25];
  sun.position.set(...sunHome); sun.target.position.set(cx, 0, cz);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -span, right: span, bottom: -span, top: span, near: 0.2, far: span * 5 + 6 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.014;
  fill.position.set(cx + span, span, cz - span); fill.target.position.set(cx, 0, cz);
  scene.add(sun, sun.target, fill, fill.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 9, span * 9), new THREE.ShadowMaterial({ opacity: 0.12, depthWrite: false }));
  ground.position.set(cx, geometry.min[1] - 0.01, cz); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  return {
    resize(w, h, ratio) { renderer.setPixelRatio(Math.min(ratio, 2)); renderer.setSize(w, h, false); },
    render(view) {
      for (const { mesh, group } of meshes) {
        mesh.visible = group.alpha > 0.002 && group.scale > 0.002;
        mesh.scale.y = group.scale; mesh.position.y = group.lift;
        if (mesh.material.opacity !== group.alpha) {
          const translucent = group.alpha < 0.995;
          if (mesh.material.transparent !== translucent) { mesh.material.transparent = translucent; mesh.material.needsUpdate = true; }
          mesh.material.opacity = group.alpha; mesh.material.depthWrite = !translucent;
          mesh.castShadow = group.alpha > 0.6;
        }
      }
      // В разрезе солнце встаёт за камерой, на плане — почти в зенит: дальние стены не затеняют пол.
      const open = view.open || 0, flat = view.plan || 0;
      const follow = [cx + (view.dx * .9 - view.dz * .4) * span, span * 1.9, cz + (view.dz * .9 + view.dx * .4) * span];
      const zenith = [cx + span * .12, span * 2.6, cz + span * .2];
      const lit = sunHome.map((value, i) => { const side = value + (follow[i] - value) * open; return side + (zenith[i] - side) * flat; });
      sun.position.set(...lit); sun.shadow.intensity = 1 - .35 * open - .4 * flat;
      const r = Math.max(span * 4, 12);
      camera.far = r * 2.5;
      camera.position.set(view.dx * view.cp * r, view.sp * r, view.dz * view.cp * r);
      camera.lookAt(0, 0, 0);
      camera.left = view.left; camera.right = view.right; camera.bottom = view.bottom; camera.top = view.top;
      camera.updateProjectionMatrix(); renderer.render(scene, camera);
    },
    dispose() {
      for (const { mesh } of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
      for (const map of textureMaps.values()) map.dispose();
      sun.shadow.dispose(); ground.geometry.dispose(); ground.material.dispose();
      const alreadyLost = renderer.getContext().isContextLost();
      renderer.dispose();
      if (!alreadyLost) renderer.forceContextLoss();
    },
  };
}

// A small orthographic z-buffer draws the same panels, openings and furniture on Canvas2D.
function makeCanvas(canvas, geometry, winter) {
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas'), layerCtx = layer.getContext('2d');
  const light = new THREE.Vector3(-1, 1.5, 1.25).normalize(), tint = new THREE.Color();
  let w = 1, h = 1, image, depths;
  const surfaces = new Map(materials.map(type => [type, textureImage(type)?.pixels]));

  function triangle(a, b, c, hex, tex, glass) {
    const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
    const det = bx * cy - by * cx;
    if (Math.abs(det) < 0.018) return;
    const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), right = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), bottom = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const dr = b[2] - a[2], ds = c[2] - a[2], ur = b[3] - a[3], us = c[3] - a[3], vr = b[4] - a[4], vs = c[4] - a[4];
    const red = hex >> 16, green = (hex >> 8) & 255, blue = hex & 255, out = image.data;
    for (let y = top; y <= bottom; y++) {
      const iy = y + 0.5 - a[1];
      for (let x = left; x <= right; x++) {
        const ix = x + 0.5 - a[0], r = (ix * cy - iy * cx) / det, s = (iy * bx - ix * by) / det;
        if (r < -0.00001 || s < -0.00001 || r + s > 1.00001) continue;
        const id = y * w + x, depth = a[2] + r * dr + s * ds;
        if (depth < depths[id]) continue;
        depths[id] = depth;
        const o = 4 * id;
        if (tex) {
          const u = a[3] + r * ur + s * us, v = a[4] + r * vr + s * vs;
          const tx = Math.min(tex.width - 1, Math.floor((glass ? clamp(u, 0, 1) : u - Math.floor(u)) * tex.width));
          const ty = tex.height - 1 - Math.min(tex.height - 1, Math.floor((glass ? clamp(v, 0, 1) : v - Math.floor(v)) * tex.height));
          const k = 4 * (ty * tex.width + tx);
          out[o] = red * tex.data[k] / 255; out[o + 1] = green * tex.data[k + 1] / 255; out[o + 2] = blue * tex.data[k + 2] / 255;
        } else { out[o] = red; out[o + 1] = green; out[o + 2] = blue; }
        out[o + 3] = 255;
      }
    }
  }
  return {
    resize(width, height, ratio) {
      const scale = Math.min(ratio, 1.4, Math.sqrt(540000 / (width * height)));
      w = Math.max(1, Math.round(width * scale)); h = Math.max(1, Math.round(height * scale));
      canvas.width = layer.width = w; canvas.height = layer.height = h;
      image = layerCtx.createImageData(w, h); depths = new Float32Array(w * h);
    },
    render(view) {
      const px = w / (view.right - view.left), py = h / (view.top - view.bottom);
      const project = (x, y, z) => {
        const horizontal = x * view.dz - z * view.dx, radial = x * view.dx + z * view.dz;
        return [(horizontal - view.left) * px, (view.top - y * view.cp + radial * view.sp) * py, radial * view.cp + y * view.sp];
      };
      ctx.clearRect(0, 0, w, h);
      winter.paint(ctx, project);
      const [x0, y0, z0] = geometry.min, [x1, , z1] = geometry.max;
      const [cx, cy] = project((x0 + x1) / 2 + 0.08, y0 - 0.01, (z0 + z1) / 2 - 0.08);
      const lx = (x1 - x0) * 0.61, lz = (z1 - z0) * 0.73;
      ctx.save();
      ctx.transform(view.dz * lx * px, view.dx * view.sp * lx * py, -view.dx * lz * px, view.dz * view.sp * lz * py, cx, cy);
      const shade = ctx.createRadialGradient(0, 0, 0.18, 0, 0, 1.2);
      shade.addColorStop(0, 'rgba(67,62,48,.21)'); shade.addColorStop(0.64, 'rgba(67,62,48,.14)'); shade.addColorStop(1, 'rgba(67,62,48,0)');
      ctx.fillStyle = shade; ctx.fillRect(-1.25, -1.25, 2.5, 2.5); ctx.restore();
      depths.fill(-Infinity); image.data.fill(0);
      function drawGroup(g) {
        const eyeX = view.dx * view.cp, eyeZ = view.dz * view.cp;
        for (const face of g.faces) {
          const [nx, y, nz] = face.normal, ny = y / g.scale;
          if (nx * eyeX + ny * view.sp + nz * eyeZ < 0.00001) continue;
          const daylight = Math.max(0, (nx * light.x + ny * light.y + nz * light.z) / Math.hypot(nx, ny, nz));
          const color = tint.copy(face.color).multiplyScalar(0.63 + daylight * 0.86).getHex();
          const points = face.points.map(([x, y, z], i) => [...project(x, y * g.scale + g.lift, z), ...face.uv[i]]);
          const tex = surfaces.get(face.type);
          for (let i = 1; i < points.length - 1; i++) triangle(points[0], points[i], points[i + 1], color, tex, face.type === 'glass');
        }
      }
      let fadingRoof;
      for (const group of geometry.groups.values()) {
        if (group.scale <= 0.002 || group.alpha <= 0.002) continue;
        if (group.alpha < 0.995) fadingRoof = group;
        else drawGroup(group);
      }
      layerCtx.putImageData(image, 0, 0); ctx.drawImage(layer, 0, 0);
      if (fadingRoof) {
        image.data.fill(0); drawGroup(fadingRoof); layerCtx.putImageData(image, 0, 0);
        ctx.globalAlpha = fadingRoof.alpha; ctx.drawImage(layer, 0, 0); ctx.globalAlpha = 1;
      }
    },
    dispose() { depths = image = null; },
  };
}

export function mountProjectViewer(container, definition) {
  container.dataset.kwView = 'outside';
  const model = createProjectGeometry(definition), geometry = groupGeometry(model);
  const winter = seasonalGround(geometry.min, geometry.max);
  const floor = Number.isFinite(model.floor) ? model.floor : 0.24;
  const initialYaw = Number.isFinite(definition.cameraYaw) ? definition.cameraYaw : (definition.front === 'end' ? -1.05 : -0.55);
  const modelHeight = geometry.max[1] - geometry.min[1];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let canvas = document.createElement('canvas'), engine, gl = false;
  try { engine = makeWebGL(canvas, geometry, winter); gl = true; }
  catch { canvas = document.createElement('canvas'); engine = makeCanvas(canvas, geometry, winter); }
  const plain = Number.isFinite(model.length) && Number.isFinite(model.width);
  const overlay = createPlanOverlay(container, { rooms: definition.rooms, length: model.length, width: model.width,
    bounds: plain ? { x0: -model.length / 2, x1: model.length / 2, z0: -model.width / 2, z1: model.width / 2, y: floor } : null });
  let insetTop = 0, insetBottom = 0;
  const pointers = new Map();
  let mode = 'outside', yaw = initialYaw, pitch = 0.38, goalYaw = yaw, goalPitch = pitch;
  let zoom = 1, opening = 0, plan = 0, auto = false, visible = true, disposed = false;
  let width = 1, height = 1, frame = 0, previousFrame = 0, pinchDistance = 0;
  let centerU, centerV, viewHeight;
  const step = (from, to, amount) => from + clamp(to - from, -amount, amount);

  function schedule() {
    if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function draw(time) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = previousFrame ? clamp((time - previousFrame) * 0.001, 0.001, 0.10) : 1 / 60;
    previousFrame = time;
    const ease = motion.matches ? 1 : 1 - Math.exp(-dt * 14.5);
    const openGoal = mode === 'outside' ? 0 : 1, planGoal = mode === 'plan' ? 1 : 0;
    opening = step(opening, openGoal, motion.matches ? 1 : dt / 0.73);
    plan = step(plan, planGoal, motion.matches ? 1 : dt / 0.60);
    if (auto) goalYaw += dt * 0.18;
    yaw += (goalYaw - yaw) * ease; pitch += (goalPitch - pitch) * ease;
    const dx = Math.sin(yaw), dz = Math.cos(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cut = smoothstep(opening, 0.17, 1), planMix = smoothstep(plan, 0, 1);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const g of geometry.groups.values()) {
      if (g.key === 'roof') {
        g.lift = Math.min(0.4, modelHeight * 0.10) * smoothstep(opening, 0, 0.6);
        g.alpha = 1 - smoothstep(opening, 0.12, 0.68);
      } else if (WALLS[g.key]) {
        const [nx, nz] = WALLS[g.key];
        const near = smoothstep(nx * dx + nz * dz, -0.12, 0.16);
        const lowWall = clamp(0.12 / modelHeight, 0.015, 0.055);
        g.scale = 1 - cut * (near + (1 - near) * planMix) * (1 - lowWall);
        g.lift = floor * (1 - g.scale);
      }
      if (g.alpha <= 0.002) continue;
      for (const [x, y, z] of g.corners) {
        const u = x * dz - z * dx, v = (y * g.scale + g.lift) * cp - (x * dx + z * dz) * sp;
        minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
    }
    // Панели управления перекрывают верх и низ сцены. Модель вписывается в свободную часть.
    const free = Math.max(height * .5, height - insetTop - insetBottom), aspect = width / height;
    const margin = plan > .5 ? 1.34 : 1.18;
    const span = Math.max(maxV - minV, (maxU - minU) / (width / free)) * margin / zoom * height / free;
    const targetU = (minU + maxU) / 2, targetV = (minV + maxV) / 2 + span * (insetTop - insetBottom) / (2 * height);
    if (viewHeight === undefined) { centerU = targetU; centerV = targetV; viewHeight = span; }
    centerU += (targetU - centerU) * ease; centerV += (targetV - centerV) * ease; viewHeight += (span - viewHeight) * ease;
    const left = centerU - viewHeight * aspect / 2, top = centerV + viewHeight / 2;
    engine.render({ dx, dz, cp, sp, left, right: centerU + viewHeight * aspect / 2,
      bottom: centerV - viewHeight / 2, top, open: cut, plan: planMix });
    overlay.update((x, y, z) => [(x * dz - z * dx - left) / (viewHeight * aspect) * width,
      (top - (y * cp - (x * dx + z * dz) * sp)) / viewHeight * height],
      { rooms: smoothstep(cut, .55, 1), dims: smoothstep(planMix, .6, 1) });
    const changing = Math.max(Math.abs(goalYaw - yaw), Math.abs(goalPitch - pitch), Math.abs(span - viewHeight), Math.abs(targetU - centerU), Math.abs(targetV - centerV));
    if (auto || opening !== openGoal || plan !== planGoal || changing > 0.0008) schedule();
  }
  function setAutoRotate(value) {
    const active = Boolean(value) && !disposed && mode !== 'plan' && !motion.matches && !document.hidden && visible;
    if (active !== auto || (value && !active)) {
      auto = active; container.dispatchEvent(new CustomEvent('viewer-autochange', { bubbles: true, detail: { active } }));
    }
    if (auto) schedule();
    return active;
  }
  function reset() {
    setAutoRotate(false);
    const target = mode === 'plan' ? 0 : initialYaw;
    goalYaw = yaw + Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
    goalPitch = mode === 'plan' ? Math.PI / 2 - 0.0008 : mode === 'inside' ? 0.80 : 0.38;
    zoom = 1; schedule();
  }
  function setView(next) {
    if (!['outside', 'inside', 'plan'].includes(next)) return;
    mode = next; container.dataset.kwView = next; reset();
  }
  function rotate(radians) {
    if (!Number.isFinite(radians)) return;
    setAutoRotate(false); goalYaw += radians; schedule();
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width)); height = Math.max(1, Math.round(rect.height));
    const css = getComputedStyle(container);
    insetTop = parseFloat(css.getPropertyValue('--kw-fit-top')) || 0; insetBottom = parseFloat(css.getPropertyValue('--kw-fit-bottom')) || 0;
    engine.resize(width, height, window.devicePixelRatio || 1); viewHeight = undefined; schedule();
  }
  const distance = () => { const [a, b] = pointers.values(); return Math.hypot(a.x - b.x, a.y - b.y); };
  function down(e) {
    if (e.button !== 0 || pointers.size >= 2) return;
    setAutoRotate(false);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) pinchDistance = distance();
    canvas.style.cursor = 'grabbing';
  }
  function move(e) {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const d = distance(); if (d > 0 && pinchDistance > 0) zoom = clamp(zoom * d / pinchDistance, 0.72, 1.8);
      pinchDistance = d;
    } else {
      goalYaw -= dx / Math.max(220, width) * 4.4;
      if (mode !== 'plan') goalPitch = clamp(goalPitch + dy / Math.max(180, height) * 1.9, mode === 'inside' ? 0.34 : 0.06, 1.4);
    }
    schedule();
  }
  function end(e) { pointers.delete(e.pointerId); if (!pointers.size) canvas.style.cursor = 'grab'; }
  function wheel(e) {
    if (!e.ctrlKey && !e.metaKey && document.activeElement !== canvas) return;
    e.preventDefault(); setAutoRotate(false); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.004), 0.72, 1.8); schedule();
  }
  function key(e) {
    if (!['Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '=', '+', '-'].includes(e.key)) return;
    e.preventDefault(); setAutoRotate(false);
    if (e.key === 'Home') { reset(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { rotate(e.key === 'ArrowLeft' ? -0.22 : 0.22); return; }
    if (e.key === '+' || e.key === '=') zoom = clamp(zoom * 1.12, 0.72, 1.8);
    else if (e.key === '-') zoom = clamp(zoom / 1.12, 0.72, 1.8);
    else if (mode !== 'plan') goalPitch = clamp(goalPitch + (e.key === 'ArrowUp' ? 0.12 : -0.12), mode === 'inside' ? 0.34 : 0.06, 1.4);
    schedule();
  }
  function lost(e) {
    e.preventDefault();
    if (disposed) return;
    setAutoRotate(false); pointers.clear();
    const focused = document.activeElement === canvas, replacement = document.createElement('canvas');
    engine.dispose(); canvas.replaceWith(replacement); canvas = replacement; gl = false;
    engine = makeCanvas(canvas, geometry, winter); bindCanvas(); resize();
    if (focused) canvas.focus({ preventScroll: true });
  }
  function bindCanvas() {
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;outline-offset:-3px';
    canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Объёмная модель постройки. Поверните модель движением пальца или стрелками клавиатуры. Клавиши плюс и минус меняют масштаб.');
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, end);
    canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', key);
    if (gl) canvas.addEventListener('webglcontextlost', lost, { once: true });
  }
  function visibility() {
    container.toggleAttribute('data-kw-view-active', !document.hidden && visible);
    previousFrame = 0;
    if (document.hidden || !visible) { setAutoRotate(false); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  }
  const motionChange = () => { if (motion.matches) setAutoRotate(false); schedule(); };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); }) : null;
  bindCanvas(); container.appendChild(canvas); winter.watch(schedule); visibility();
  observer?.observe(container); visibilityObserver?.observe(container); window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', motionChange); resize();
  return { setView, rotate, reset, resize, setAutoRotate,
    dispose() {
      if (disposed) return;
      delete container.dataset.kwView; container.removeAttribute('data-kw-view-active');
      setAutoRotate(false); disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); visibilityObserver?.disconnect();
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', motionChange); pointers.clear(); engine.dispose(); winter.dispose(); overlay.dispose(); canvas.remove();
    },
  };
}
