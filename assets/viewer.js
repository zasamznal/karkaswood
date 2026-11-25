import * as THREE from './vendor/three.module.min.js';
import { seasonalGround } from './seasonal-ground.js';

// The shell follows the advertised footprint. Openings and furnishings illustrate one layout.
const LENGTH = 5;
const WIDTH = 2.4;
const FLOOR = 0.14;
const EAVES = 2.24;
const RIDGE = 2.46;
const WALL = 0.10;
const HALF_PI = Math.PI / 2;
const clamp = THREE.MathUtils.clamp;
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function seededRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function timberTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const random = seededRandom(7208);
  context.fillStyle = '#f0e5d1';
  context.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 520; i++) {
    const x = random() * 256;
    const bend = random() * 8 - 4;
    context.strokeStyle = `rgba(98,66,38,${random() * 0.22})`;
    context.lineWidth = random() * 1.9 + 0.25;
    context.beginPath();
    context.moveTo(x, -2);
    context.bezierCurveTo(x + bend, 140, x - bend, 360, x, 514);
    context.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = random() * 256;
    const y = random() * 512;
    for (let ring = 1; ring <= 4; ring++) {
      context.strokeStyle = 'rgba(101,74,42,0.14)';
      context.lineWidth = 0.8;
      context.beginPath();
      context.ellipse(x, y, ring * 1.35, ring * 4.6, -0.04, 0, Math.PI * 2);
      context.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function osbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 384;
  const ctx = canvas.getContext('2d'), random = seededRandom(1307);
  ctx.fillStyle = '#c8ab83';
  ctx.fillRect(0, 0, 384, 384);
  const shades = ['#be996b', '#d3b997', '#bda07a', '#a98b66', '#dbbf95', '#d6b588', '#caa779'];
  for (let i = 0; i < 7500; i++) {
    const x = random() * 384, y = random() * 384;
    const a = random() * Math.PI, w = 1 + random() * 4.4, h = 2 + random() * 21;
    const dx = Math.cos(a), dy = Math.sin(a);
    ctx.fillStyle = shades[Math.floor(random() * shades.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * h - dy * w * 0.4, y + dy * h + dx * w * 0.4);
    ctx.lineTo(x + dx * h * 0.7 - dy * w, y + dy * h * 0.7 + dx * w);
    ctx.lineTo(x - dy * w, y + dx * w);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function glazingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 384;
  const ctx = canvas.getContext('2d'), random = seededRandom(522);
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, '#c5d6d7'); sky.addColorStop(0.44, '#9daea6');
  sky.addColorStop(0.55, '#8b9583'); sky.addColorStop(1, '#53605a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 384);
  for (let i = 0; i < 60; i++) {
    const x = random() * 286 - 15, y = 188 + 31 * Math.sin(x * 0.022) + random() * 20;
    const w = 5 + random() * 17, h = 32 + random() * 76;
    ctx.fillStyle = i % 2 ? '#6e8076' : '#778980';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y + 25); ctx.lineTo(x - w, y + 25); ctx.fill();
  }
  ctx.fillStyle = '#68766a'; ctx.fillRect(0, 219, 256, 30);
  const ground = ctx.createLinearGradient(0, 240, 0, 384);
  ground.addColorStop(0, '#809087'); ground.addColorStop(1, '#4d5b55');
  ctx.fillStyle = ground; ctx.fillRect(0, 247, 256, 137);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function createModel(scene) {
  const grain = timberTexture(), osb = osbTexture(), glazing = glazingTexture();
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, vertexColors: true, ...extra });
  const m = {
    shell: mat('#373b3c'), groove: mat('#242b2a'), roof: mat('#434b49', { roughness: 0.56, metalness: 0.18 }),
    seam: mat('#525b58', { metalness: 0.18 }), flash: mat('#303735', { metalness: 0.15 }),
    cedar: mat('#d7b189', { map: grain }), cedarEdge: mat('#745139'), interior: mat('#ffecd5', { map: osb }),
    floor: mat('#f5e4cb', { map: osb }), joints: mat('#a58b6d'), timberEdge: mat('#ac835e'),
    frame: mat('#242c2a'), glass: mat('#becbc6', { map: glazing, roughness: 0.36, metalness: 0.08 }),
    skyGlass: mat('#768d87', { roughness: 0.29 }), window: mat('#c7c6bb'), silver: mat('#b0ada1', { metalness: 0.55 }),
    mattress: mat('#e6d9c2'), linen: mat('#e7e0cf'), duvet: mat('#839283'), hem: mat('#62766b'),
    plan: mat('#5e665c'), book: mat('#8a6350'), light: mat('#e0c7a1'), pine: mat('#caa579', { map: grain }),
  };
  const root = new THREE.Group();
  scene.add(root);
  const group = (parent = root) => { const g = new THREE.Group(); parent.add(g); return g; };
  const base = group(), roof = group(), bed = group(), plan = group();
  const sides = [group(), group(), group(), group()];
  const planSides = [group(plan), group(plan)];
  const batches = new Map();
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const euler = new THREE.Euler(), quat = new THREE.Quaternion(), tr = new THREE.Matrix4(), normalTr = new THREE.Matrix3();
  const random = seededRandom(9042);

  // Bake fixed construction parts by material. A fully detailed wall takes only a few draw calls.
  function geometry(group, source, material, position, scale, rotation = [0, 0, 0], shade = 1, woodAxis = 'y') {
    let byMaterial = batches.get(group);
    if (!byMaterial) { byMaterial = new Map(); batches.set(group, byMaterial); }
    let batch = byMaterial.get(material);
    if (!batch) { batch = { positions: [], normals: [], uvs: [], colors: [], indices: [] }; byMaterial.set(material, batch); }
    const offset = batch.positions.length / 3;
    quat.setFromEuler(euler.set(...rotation));
    tr.compose(new THREE.Vector3(...position), quat, new THREE.Vector3(...scale));
    normalTr.getNormalMatrix(tr);
    const positions = source.attributes.position, normals = source.attributes.normal;
    for (let i = 0; i < positions.count; i++) {
      v.fromBufferAttribute(positions, i).applyMatrix4(tr);
      n.fromBufferAttribute(normals, i).applyNormalMatrix(normalTr);
      batch.positions.push(v.x, v.y, v.z);
      batch.normals.push(n.x, n.y, n.z);
      if (material.map === glazing) batch.uvs.push(clamp(0.5 + v.z / 0.8, 0, 1), clamp((v.y - FLOOR) / 1.86, 0, 1));
      else if (material.map === osb) batch.uvs.push((Math.abs(n.x) > 0.6 ? v.z : v.x) * 0.96, (Math.abs(n.y) > 0.6 ? v.z : v.y) * 0.96);
      else if (woodAxis === 'x' && Math.abs(n.y) > 0.5) batch.uvs.push(v.z * 2.1, v.x * 0.52);
      else batch.uvs.push((Math.abs(n.x) > 0.6 ? v.z : v.x) * 2.4, v.y * 0.47);
      batch.colors.push(shade, shade, shade);
    }
    if (source.index) for (const i of source.index.array) batch.indices.push(offset + i);
    else for (let i = 0; i < positions.count; i++) batch.indices.push(offset + i);
  }
  function box(g, material, x, y, z, w, h, d, shade = 1, rot = [0, 0, 0], axis = 'y') {
    geometry(g, unitBox, material, [x, y, z], [w, h, d], rot, shade, axis);
  }

  // Each wall uses local u along its exterior face and v outwards.
  function facade(side, u, y, outward, width, height, depth, material, shade = 1) {
    if (side === 0) box(sides[side], material, u, y, WIDTH / 2 + outward, width, height, depth, shade);
    if (side === 1) box(sides[side], material, -u, y, -WIDTH / 2 - outward, width, height, depth, shade);
    if (side === 2) box(sides[side], material, -LENGTH / 2 + 0.15 - outward, y, u, depth, height, width, shade);
    if (side === 3) box(sides[side], material, LENGTH / 2 + outward, y, -u, depth, height, width, shade);
  }
  function holesFor(side) {
    if (side === 2) return [{ x: 0, width: 0.80, bottom: FLOOR + 0.025, top: FLOOR + 1.825, type: 'door' }];
    if (side === 3) return [{ x: 0, width: 0.60, bottom: 1.17, top: 1.67, type: 'window' }];
    return [];
  }
  for (let side = 0; side < 4; side++) {
    const span = side < 2 ? LENGTH : WIDTH;
    const holes = holesFor(side);
    const bounds = [-span / 2, ...holes.flatMap(h => [h.x - h.width / 2, h.x + h.width / 2]), span / 2].sort((a, b) => a - b);
    for (let segment = 0; segment < bounds.length - 1; segment++) {
      const left = bounds[segment], right = bounds[segment + 1];
      const hole = holes.find(h => (left + right) / 2 > h.x - h.width / 2 && (left + right) / 2 < h.x + h.width / 2);
      const runs = hole ? [[FLOOR, hole.bottom], [hole.top, EAVES]] : [[FLOOR, EAVES]];
      for (const [low, high] of runs) {
        if (high - low < 0.001) continue;
        const y = (high + low) / 2, h = high - low;
        facade(side, (left + right) / 2, y, -WALL / 2, right - left, h, WALL, m.groove);
        facade(side, (left + right) / 2, y, -WALL - 0.002, right - left, h, 0.009, m.interior);
        const count = Math.ceil((right - left) / 0.115);
        const w = (right - left) / count;
        for (let i = 0; i < count; i++) {
          const u = left + (i + 0.5) * w;
          const wood = side === 2;
          facade(side, u, y, 0.004, w - 0.0045, h, 0.016, wood ? m.cedar : m.shell, 0.83 + random() * 0.17);
          if (!wood) facade(side, u - w / 2 + 0.012, y, 0.021, 0.025, h, 0.035, m.shell, 1.20);
          
        }
      }
    }
    for (const opening of holes) {
      const { x, width: w, bottom, top, type } = opening;
      const center = (bottom + top) / 2, h = top - bottom;
      facade(side, x, center, -0.045, w, h, 0.059, m.frame);
      if (type === 'window') {
        facade(side, x, center, -0.006, w, h, 0.034, m.window);
        facade(side, x, center, 0.014, w - 0.088, h - 0.086, 0.012, m.glass);
        facade(side, x, center, -0.092, w, h, 0.024, m.window);
        facade(side, x, center, -0.109, w - 0.095, h - 0.093, 0.014, m.skyGlass);
        facade(side, x, bottom - 0.017, 0.022, w + 0.08, 0.025, 0.08, m.flash);
      } else {
        facade(side, x, center, -0.005, w - 0.035, h - 0.04, 0.044, m.frame);
        for (const inward of [-0.088, 0.028]) {
          facade(side, x, center + 0.33, inward, w - 0.195, 0.87, 0.013, m.glass);
          facade(side, x, center - 0.52, inward, w - 0.195, 0.65, 0.013, m.glass);
        }
        facade(side, x - w * 0.38, FLOOR + 0.97, 0.041, 0.030, 0.14, 0.026, m.frame);
        facade(side, x - w * 0.34, FLOOR + 1.005, 0.07, 0.095, 0.018, 0.029, m.silver);
      }
      for (const sign of [-1, 1]) facade(side, x + sign * (w / 2 + 0.014), center, 0.015, 0.042, h + 0.055, 0.05, m.flash);
      facade(side, x, top + 0.014, 0.015, w + 0.069, 0.042, 0.05, m.flash);
    }
    if (side === 2) {
      for (const sign of [-1, 1]) {
        facade(side, sign * 0.74, FLOOR + 1.72, 0.055, 0.106, 0.135, 0.10, m.frame);
        facade(side, sign * 1.13, (EAVES + FLOOR) / 2, 0.083, 0.072, EAVES - FLOOR, 0.16, m.cedar);
      }
      facade(side, 0, FLOOR - 0.002, 0.073, WIDTH - 0.10, 0.062, 0.19, m.cedar);
    }
    for (const sign of [-1, 1]) facade(side, sign * (span / 2 - 0.022), (FLOOR + EAVES) / 2, 0.019, 0.048, EAVES - FLOOR + 0.01, 0.038, m.flash);
  }

  box(base, m.groove, 0, FLOOR - 0.086, 0, LENGTH, 0.15, WIDTH);
  for (const x of [-2.12, 0, 2.12]) for (const z of [-0.89, 0.89]) {
    box(base, m.flash, x, 0.055, z, 0.13, 0.11, 0.13);
    box(base, m.flash, x, 0.013, z, 0.21, 0.026, 0.21);
  }
  for (let i = 0; i < 4; i++) {
    box(base, m.floor, -1.875 + i * 1.25, FLOOR - 0.006, 0, 1.247, 0.026, WIDTH - 0.05, 0.97 + 0.01 * (i % 3), [0, 0, 0], 'x');
  }
  const overhang = 0.032, slope = (RIDGE - EAVES) / (WIDTH / 2), angle = Math.atan(slope);
  const reach = WIDTH / 2 + overhang;
  const pitchLength = reach / Math.cos(angle);
  for (const sign of [-1, 1]) {
    const z = sign * reach / 2, y = RIDGE - slope * reach / 2;
    box(roof, m.roof, 0, y + 0.022, z, LENGTH + 0.12, 0.055, pitchLength + 0.015, 1, [sign * angle, 0, 0]);
    box(roof, m.flash, 0, RIDGE - slope * reach - 0.027, sign * reach, LENGTH + 0.12, 0.11, 0.032);
    for (let i = 0; i <= 16; i++) box(roof, m.seam, -2.56 + i * 0.32, y + 0.062, z, 0.017, 0.038, pitchLength + 0.012, 1, [sign * angle, 0, 0]);
    box(roof, m.cedar, -2.476, y - 0.045, z, 0.13, 0.086, pitchLength, 1, [sign * angle, 0, 0]);
    for (const end of [-1, 1]) box(roof, m.flash, end * 2.551, y, z, 0.04, 0.13, pitchLength + 0.055, 1, [sign * angle, 0, 0]);
  }
  box(roof, m.flash, 0, RIDGE + 0.059, 0, LENGTH + 0.12, 0.042, 0.12);
  for (const end of [2, 3]) {
    const count = 20, w = WIDTH / count;
    for (let i = 0; i < count; i++) {
      const u = -WIDTH / 2 + (i + 0.5) * w;
      const h = (RIDGE - EAVES) * (1 - Math.abs(u) / (WIDTH / 2));
      const x = end === 2 ? -2.349 : 2.495;
      box(roof, end === 2 ? m.cedar : m.shell, x, EAVES + h / 2, u, 0.052, h + 0.016, w - 0.002, 0.87 + random() * 0.13);
    }
  }

  // Mattress is 1.40 × 2.00 m. The headboard and bed frame have their own real dimensions.
  const bx = 1.30, bz = 0;
  box(bed, m.timberEdge, bx, FLOOR + 0.13, bz, 2.0, 0.20, 1.4);
  box(bed, m.mattress, bx, FLOOR + 0.298, bz, 2.0, 0.165, 1.40);
  box(bed, m.pine, bx + 1.03, FLOOR + 0.37, bz, 0.065, 0.70, 1.40);
  box(bed, m.linen, bx, FLOOR + 0.387, bz, 1.986, 0.032, 1.388);
  box(bed, m.duvet, bx - 0.28, FLOOR + 0.416, bz, 1.43, 0.066, 1.397);
  box(bed, m.hem, bx - 0.77, FLOOR + 0.457, bz, 0.30, 0.025, 1.397);
  for (const sign of [-1, 1]) box(bed, m.linen, bx + 0.75, FLOOR + 0.47, bz + sign * 0.326, 0.36, 0.13, 0.54, 0.98, [0, sign * 0.033, -0.035]);
  // The doorway is on the inset timber gable, opposite the small window.
  const planWall = (x, z, w, d) => box(plan, m.plan, x, FLOOR + 0.075, z, w, 0.15, d);
  box(planSides[0], m.plan, 0, FLOOR + 0.075, 1.15, 5, 0.15, WALL);
  box(planSides[1], m.plan, 0, FLOOR + 0.075, -1.15, 5, 0.15, WALL);
  planWall(2.45, 0, WALL, WIDTH);
  planWall(-2.30, -0.79, WALL, 0.78);
  planWall(-2.30, 0.79, WALL, 0.78);
  // The photographed door swings out onto the front step.
  for (let i = 0; i < 9; i++) {
    box(plan, m.cedar, -2.423, FLOOR + 0.013, -1.025 + i * 0.255, 0.155, 0.032, 0.253);
  }

  for (const [g, materials] of batches) for (const [material, b] of materials) {
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3));
    buffer.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3));
    buffer.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2));
    buffer.setAttribute('color', new THREE.Float32BufferAttribute(b.colors, 3));
    buffer.setIndex(b.indices);
    const mesh = new THREE.Mesh(buffer, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  // Change the inward depth of the longitudinal walls while preserving the external footprint.
  const widthMeshes = [];
  for (let i = 0; i < 2; i++) for (const g of [sides[i], planSides[i]]) {
    for (const mesh of g.children) widthMeshes.push({
      mesh, original: mesh.geometry.getAttribute('position').array.slice(),
      direction: i === 0 ? 1 : -1, innerDepth: g === planSides[i] ? WALL : WALL + 0.0065,
    });
  }
  function setRoomWidth(cm) {
    const thickness = (WIDTH - cm / 100) / 2;
    for (const { mesh, original, direction, innerDepth } of widthMeshes) {
      const attr = mesh.geometry.getAttribute('position');
      for (let i = 2; i < attr.array.length; i += 3) {
        const depth = WIDTH / 2 - direction * original[i];
        attr.array[i] = original[i] - direction * (thickness - innerDepth) * clamp(depth / innerDepth, 0, 1);
      }
      attr.needsUpdate = true;
      mesh.geometry.computeBoundingSphere(); mesh.geometry.computeBoundingBox();
    }
  }
  setRoomWidth(220);
  for (const mesh of roof.children) mesh.material = mesh.material.clone();
  return { root, base, roof, bed, sides, plan, grain, osb, glazing, setRoomWidth, materials: [...Object.values(m), ...roof.children.map(mesh => mesh.material)] };
}

// A projected canvas rendering retains the same model and controls on devices without WebGL2.
function softwareRenderer(canvas, model, winter) {
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas'), layerCtx = layer.getContext('2d');
  const p = new THREE.Vector3(), n = new THREE.Vector3(), eye = new THREE.Vector3(), tint = new THREE.Color();
  const cameraMatrix = new THREE.Matrix4(), projected = new THREE.Matrix4();
  const sun = new THREE.Vector3(-0.55, 0.82, -0.55).normalize();
  const textures = new Map();
  for (const map of [model.grain, model.osb, model.glazing]) {
    const image = map.image;
    textures.set(map, image.getContext('2d').getImageData(0, 0, image.width, image.height));
  }
  let w = 1, h = 1, pixels, zBuffer;
  const screen = (source, index) => {
    p.fromBufferAttribute(source, index).applyMatrix4(projected);
    return [(p.x + 1) * w / 2, (1 - p.y) * h / 2, p.z];
  };
  function triangle(a, b, c, ua, va, ub, vb, uc, vc, color, texture) {
    const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
    const det = bx * cy - by * cx;
    if (Math.abs(det) < 0.01) return;
    const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), right = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), bottom = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const red = color >> 16, green = (color >> 8) & 255, blue = color & 255, out = pixels.data;
    for (let y = top; y <= bottom; y++) {
      const iy = y + 0.5 - a[1];
      for (let x = left; x <= right; x++) {
        const ix = x + 0.5 - a[0], u = (ix * cy - iy * cx) / det, v = (iy * bx - ix * by) / det;
        if (u < -0.00002 || v < -0.00002 || u + v > 1.00002) continue;
        const z = a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]), id = y * w + x;
        if (z >= zBuffer[id]) continue;
        zBuffer[id] = z;
        const o = id * 4;
        if (texture) {
          const s = ua + u * (ub - ua) + v * (uc - ua), t = va + u * (vb - va) + v * (vc - va);
          const tx = Math.floor((s - Math.floor(s)) * texture.width);
          const ty = texture.height - 1 - Math.floor((t - Math.floor(t)) * texture.height);
          const i = (ty * texture.width + tx) * 4;
          out[o] = red * texture.data[i] / 255; out[o + 1] = green * texture.data[i + 1] / 255; out[o + 2] = blue * texture.data[i + 2] / 255;
        } else { out[o] = red; out[o + 1] = green; out[o + 2] = blue; }
        out[o + 3] = 255;
      }
    }
  }
  return {
    setSize(width, height, ratio) {
      const scale = Math.min(ratio, 1.4, 1180 / Math.max(width, height));
      w = Math.max(1, Math.round(width * scale)); h = Math.max(1, Math.round(height * scale));
      canvas.width = layer.width = w; canvas.height = layer.height = h;
      pixels = layerCtx.createImageData(w, h); zBuffer = new Float32Array(w * h);
    },
    render(camera) {
      ctx.clearRect(0, 0, w, h);
      winter.paint(ctx, (x, y, z) => {
        p.set(x, y, z).project(camera);
        return [(p.x + 1) * w / 2, (1 - p.y) * h / 2];
      });
      ctx.save();
      p.set(0.10, -0.03, 0.12).project(camera);
      ctx.translate((p.x + 1) * w / 2, (1 - p.y) * h / 2);
      const scale = h / (camera.top - camera.bottom);
      ctx.scale(2.75 * scale, Math.max(0.34, -Math.sin(camera.rotation.x)) * 1.48 * scale);
      const gradient = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.2);
      gradient.addColorStop(0, 'rgba(63,61,48,.19)'); gradient.addColorStop(0.63, 'rgba(63,61,48,.12)'); gradient.addColorStop(1, 'rgba(63,61,48,0)');
      ctx.fillStyle = gradient; ctx.fillRect(-1.3, -1.3, 2.6, 2.6); ctx.restore();
      zBuffer.fill(Infinity); pixels.data.fill(0);
      camera.getWorldDirection(eye).negate();
      cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const roofOpacity = model.roof.userData.opacity ?? 1;
      const fadingRoof = model.roof.visible && roofOpacity < 0.995;
      function rasterize(root, omitRoof) {
        root.traverseVisible(mesh => {
          if (!mesh.isMesh || (omitRoof && mesh.parent === model.roof)) return;
          projected.multiplyMatrices(cameraMatrix, mesh.matrixWorld);
          const g = mesh.geometry, pos = g.attributes.position, normals = g.attributes.normal, index = g.index.array, uv = g.attributes.uv;
          const material = mesh.material, texture = textures.get(material.map);
          for (let i = 0; i < index.length; i += 6) {
            const a = index[i];
            n.fromBufferAttribute(normals, a).transformDirection(mesh.matrixWorld);
            if (n.dot(eye) < 0.001) continue;
            const ids = [a, index[i + 1], index[i + 4], index[i + 2]];
            const v = ids.map(id => screen(pos, id)), uvs = ids.map(id => [uv.getX(id), uv.getY(id)]);
            const shade = (0.68 + Math.max(0, n.dot(sun)) * 0.86) * g.attributes.color.getX(a);
            const color = tint.copy(material.color).multiplyScalar(shade).getHex();
            triangle(v[0], v[1], v[3], ...uvs[0], ...uvs[1], ...uvs[3], color, texture);
            triangle(v[1], v[2], v[3], ...uvs[1], ...uvs[2], ...uvs[3], color, texture);
          }
        });
      }
      rasterize(model.root, fadingRoof);
      layerCtx.putImageData(pixels, 0, 0); ctx.drawImage(layer, 0, 0);
      if (fadingRoof) {
        pixels.data.fill(0);
        rasterize(model.roof, false);
        layerCtx.putImageData(pixels, 0, 0);
        ctx.globalAlpha = roofOpacity; ctx.drawImage(layer, 0, 0); ctx.globalAlpha = 1;
      }
    },
  };
}

const presets = {
  outside: { yaw: -2.34, pitch: 0.42, aim: 1.17 },
  inside: { yaw: -2.49, pitch: 0.80, aim: 0.90 },
  plan: { yaw: 0, pitch: HALF_PI - 0.001, aim: 0.15 },
};

export function mountViewer(container) {
  container.dataset.kwView = 'outside';
  const scene = new THREE.Scene();
  const winter = seasonalGround([-LENGTH / 2, 0, -WIDTH / 2], [LENGTH / 2, RIDGE, WIDTH / 2]);
  scene.add(winter.mesh);
  const model = createModel(scene);
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 70);
  let canvas = document.createElement('canvas'), renderer, fallback;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch {
    canvas = document.createElement('canvas');
    fallback = softwareRenderer(canvas, model, winter);
  }
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;outline-offset:-3px';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Объёмная модель барн-модуля. Вращение — движением по горизонтали или стрелками клавиатуры.');
  container.appendChild(canvas);
  scene.add(new THREE.HemisphereLight('#fff8e9', '#b4ae9e', 1.85));
  const sun = new THREE.DirectionalLight('#ffefd8', 2.45);
  sun.position.set(-4.6, 7.8, -3.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4.8, right: 4.8, top: 4.8, bottom: -4.8, near: 0.5, far: 17 });
  sun.shadow.normalBias = 0.014; sun.shadow.bias = -0.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#e2ebee', 0.85);
  fill.position.set(4, 4, 3); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.105, depthWrite: false }));
  ground.rotation.x = -HALF_PI; ground.position.y = -0.005; ground.receiveShadow = true; scene.add(ground);

  const modelBounds = new Map();
  for (const g of [model.base, model.roof, ...model.sides, model.plan]) {
    const b = new THREE.Box3().setFromObject(g);
    const corners = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
    modelBounds.set(g, corners);
  }
  let mode = 'outside', showBed = true, bedWidth = 140, insideWidth = 220, zoom = 1;
  let yaw = presets.outside.yaw, pitch = presets.outside.pitch, aim = presets.outside.aim;
  let turn = yaw, tilt = pitch, targetAim = aim;
  let w = 1, h = 1, frame = 0, disposed = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastTime = 0, opening = 0, planMix = 0, auto = false, inViewport = true;
  const smooth = THREE.MathUtils.smoothstep;
  const step = (value, target, distance) => value + clamp(target - value, -distance, distance);
  function setAutoRotate(value, reason = 'control') {
    const active = Boolean(value) && mode !== 'plan' && !motion.matches && !document.hidden && inViewport;
    if (active !== auto || (value && !active)) {
      auto = active;
      container.dispatchEvent(new CustomEvent('viewer:autorotate', { bubbles: true, detail: { active, reason } }));
    }
    if (auto) queue();
    return active;
  }
  function draw(time) {
    frame = 0;
    if (disposed || document.hidden || !inViewport) return;
    const dt = lastTime ? clamp((time - lastTime) / 1000, 0.001, 0.09) : 1 / 60;
    lastTime = time;
    const ease = motion.matches ? 1 : 1 - Math.exp(-dt * 14);
    const openTarget = mode === 'outside' ? 0 : 1, planTarget = mode === 'plan' ? 1 : 0;
    opening = step(opening, openTarget, motion.matches ? 1 : dt / 0.72);
    planMix = step(planMix, planTarget, motion.matches ? 1 : dt / 0.54);
    if (auto) turn += dt * 0.17;
    yaw += (turn - yaw) * ease; pitch += (tilt - pitch) * ease; aim += (targetAim - aim) * ease;
    const dx = Math.sin(yaw), dz = Math.cos(yaw), radius = Math.cos(pitch) * 13;
    camera.position.set(dx * radius, aim + Math.sin(pitch) * 13, dz * radius);
    camera.lookAt(0, aim, 0); camera.updateMatrixWorld();
    const lift = smooth(opening, 0, 0.64);
    const opacity = 1 - smooth(opening, 0.12, 0.68);
    model.roof.position.y = lift * 0.25;
    model.roof.visible = opacity > 0.002;
    if (opacity !== model.roof.userData.opacity) {
      model.roof.userData.opacity = opacity;
      for (const mesh of model.roof.children) {
        const transparent = opacity < 0.995;
        if (mesh.material.transparent !== transparent) { mesh.material.transparent = transparent; mesh.material.needsUpdate = true; }
        mesh.material.opacity = opacity; mesh.material.depthWrite = !transparent; mesh.castShadow = opacity > 0.6;
      }
    }
    const cut = smooth(opening, 0.18, 1), planAmount = smooth(planMix, 0, 1);
    model.plan.visible = planAmount > 0.002;
    model.plan.scale.y = Math.max(0.001, planAmount); model.plan.position.y = FLOOR * (1 - model.plan.scale.y);
    model.bed.visible = showBed && opening > 0.12;
    model.bed.scale.z = bedWidth / 140;
    model.bed.position.z = (insideWidth - bedWidth) / 200;
    const facing = [dz, -dz, -dx, dx];
    model.sides.forEach((g, i) => {
      const near = smooth(facing[i], -0.15, 0.13);
      const amount = 1 - cut * (near + (1 - near) * planAmount);
      g.visible = amount > 0.002;
      g.scale.y = Math.max(amount, 0.001); g.position.y = FLOOR * (1 - g.scale.y);
    });
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    for (const [g, points] of modelBounds) if (g.visible) {
      for (const p of points) {
        const u = p.x * dz - p.z * dx;
        const v = (p.y * g.scale.y + g.position.y - aim) * cp - (p.x * dx + p.z * dz) * sp;
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
    }
    const aspect = w / h;
    const span = Math.max(maxV - minV, (maxU - minU) / aspect) * 1.23 / zoom;
    const midU = (maxU + minU) / 2, midV = (maxV + minV) / 2;
    camera.top = midV + span / 2; camera.bottom = midV - span / 2;
    camera.left = midU - span * aspect / 2; camera.right = midU + span * aspect / 2;
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld();
    if (renderer) renderer.render(scene, camera); else fallback.render(camera);
    if (auto || opening !== openTarget || planMix !== planTarget || Math.max(Math.abs(turn - yaw), Math.abs(tilt - pitch), Math.abs(aim - targetAim)) > 0.0006) queue();
  }
  function queue() { if (!disposed && !frame && !document.hidden && inViewport) frame = requestAnimationFrame(draw); }
  function resize() {
    const rect = container.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (renderer) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
    else fallback.setSize(w, h, dpr);
    queue();
  }
  function reset() {
    setAutoRotate(false, 'reset');
    const p = presets[mode];
    // Pick the nearest equivalent angle so a reset never spins a full revolution.
    turn = yaw + Math.atan2(Math.sin(p.yaw - yaw), Math.cos(p.yaw - yaw));
    tilt = p.pitch; targetAim = p.aim; zoom = 1; queue();
  }
  function setView(view) {
    if (!Object.prototype.hasOwnProperty.call(presets, view)) return;
    setAutoRotate(false, 'view'); mode = view; container.dataset.kwView = view; reset();
  }
  function rotate(delta) { const amount = Number(delta); if (Number.isFinite(amount)) { setAutoRotate(false, 'interaction'); turn += amount; queue(); } }
  const pointers = new Map();
  let pinchDistance = 0;
  const distance = () => { const [a, b] = pointers.values(); return Math.hypot(a.x - b.x, a.y - b.y); };
  function pointerDown(e) {
    if (e.button !== 0) return;
    setAutoRotate(false, 'interaction');
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinchDistance = distance();
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  }
  function pointerMove(e) {
    const last = pointers.get(e.pointerId); if (!last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last.x = e.clientX; last.y = e.clientY;
    if (pointers.size === 2) {
      const next = distance(); if (next > 0 && pinchDistance > 0) zoom = clamp(zoom * next / pinchDistance, 0.75, 1.65);
      pinchDistance = next;
    } else {
      turn -= dx / Math.max(220, w) * 4.0;
      if (mode !== 'plan') tilt = clamp(tilt + dy / Math.max(190, h) * 1.9, mode === 'inside' ? 0.4 : 0.09, 1.34);
    }
    queue();
  }
  function pointerEnd(e) { pointers.delete(e.pointerId); if (!pointers.size) canvas.style.cursor = 'grab'; }
  function wheel(e) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setAutoRotate(false, 'interaction'); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.006), 0.75, 1.65); queue(); }
  function keydown(e) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '-', '='].includes(e.key)) return;
    e.preventDefault(); setAutoRotate(false, 'interaction');
    if (e.key === 'Home') return reset();
    if (e.key === 'ArrowLeft') return rotate(-0.21);
    if (e.key === 'ArrowRight') return rotate(0.21);
    if (e.key === '+' || e.key === '=') zoom = clamp(zoom * 1.12, 0.75, 1.65);
    else if (e.key === '-') zoom = clamp(zoom / 1.12, 0.75, 1.65);
    else if (mode !== 'plan') tilt = clamp(tilt + (e.key === 'ArrowUp' ? 0.10 : -0.10), mode === 'inside' ? 0.4 : 0.09, 1.34);
    queue();
  }
  function contextLost(event) {
    event.preventDefault(); setAutoRotate(false, 'context-lost'); pointers.clear();
    const focused = document.activeElement === canvas;
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement); canvas = replacement; canvas.style.cursor = 'grab';
    renderer.dispose(); renderer = undefined; fallback = softwareRenderer(canvas, model, winter);
    bindCanvas(); resize();
    if (focused) canvas.focus({ preventScroll: true });
  }
  function bindCanvas() {
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('lostpointercapture', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd); canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', keydown);
    if (renderer) canvas.addEventListener('webglcontextlost', contextLost, { once: true });
  }
  function visibility() {
    container.toggleAttribute('data-kw-view-active', !document.hidden && inViewport);
    lastTime = 0;
    if (document.hidden || !inViewport) {
      setAutoRotate(false, document.hidden ? 'hidden' : 'offscreen'); cancelAnimationFrame(frame); frame = 0;
    } else queue();
  }
  function motionChange() { if (motion.matches) setAutoRotate(false, 'reduced-motion'); queue(); }
  bindCanvas(); winter.watch(queue); visibility(); motion.addEventListener('change', motionChange);
  document.addEventListener('visibilitychange', visibility);
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting; visibility();
  }) : null;
  visibilityObserver?.observe(container);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(container); window.addEventListener('resize', resize); resize();
  return {
    setView, rotate, reset, resize, setAutoRotate,
    setBed(visible) { if (Boolean(visible) !== showBed) { setAutoRotate(false, 'interaction'); showBed = Boolean(visible); queue(); } },
    setBedWidth(cm) { const value = Number(cm); if ([90, 140, 160].includes(value) && bedWidth !== value) { setAutoRotate(false, 'interaction'); bedWidth = value; queue(); } },
    setInsideWidth(cm) {
      const value = Number(cm);
      if (!Number.isFinite(value) || value < 185 || value > 240 || insideWidth === value) return;
      setAutoRotate(false, 'interaction'); insideWidth = value; model.setRoomWidth(value); queue();
    },
    dispose() {
      delete container.dataset.kwView; container.removeAttribute('data-kw-view-active');
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); visibilityObserver?.disconnect(); window.removeEventListener('resize', resize);
      motion.removeEventListener('change', motionChange); document.removeEventListener('visibilitychange', visibility);
      winter.dispose();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      model.materials.forEach(m => m.dispose()); model.grain.dispose(); model.osb.dispose(); model.glazing.dispose();
      sun.shadow.dispose(); ground.material.dispose(); renderer?.dispose(); canvas.remove();
    },
  };
}
