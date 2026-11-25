// Convex faces in metres. Both renderers use these same openings, boards and roof planes.
const FLOOR = 0.24;
const WALL = 0.105;
const EPS = 0.00001;
const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const NORMALS = { front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0] };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const num = (x, fallback) => Number.isFinite(x) ? x : fallback;
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const average = points => points.reduce((acc, p) => acc.map((v,i) => v + p[i]/points.length), [0,0,0]);
const hex = (color, fallback) => /^#[0-9a-f]{6}$/i.test(color || '') ? color : fallback;
const mix = (color, target, amount) => '#' + [1,3,5].map(i => Math.round(
  parseInt(color.slice(i,i+2),16)*(1-amount) + parseInt(target.slice(i,i+2),16)*amount
).toString(16).padStart(2,'0')).join('');
const variation = (color, index) => mix(color, index % 3 ? '#493222' : '#e6c9a3', Math.abs(Math.sin(index*41.73 + .3)) * .09);
const style = (group, color, material = 'plain', grain = 'y') => ({group,color,material,grain});
const timber = '#cda576';
const interior = '#dec5a0';
const baseStyle = style('base', '#5e4f3f', 'wood', 'x');

function addFace(faces, points, appearance, outward) {
  let n;
  for (let i = 1; i < points.length - 1; i++) {
    n = cross(subtract(points[i],points[0]),subtract(points[i+1],points[0]));
    if (Math.hypot(...n) > EPS * EPS) break;
  }
  if (!n || Math.hypot(...n) <= EPS * EPS) return;
  if (dot(n,outward) < 0) {
    points = points.slice().reverse();
    n = n.map(v => -v);
  }
  const normal = n.map(v => v/Math.hypot(...n));
  let along = AXES[appearance.grain] || AXES.y;
  if (Math.abs(dot(along, normal)) > .9) along = Math.abs(normal[0]) > .9 ? AXES.z : AXES.x;
  const side = cross(along,normal);
  let uv = points.map(p => [dot(p,side),dot(p,along)]);
  if (appearance.material === 'glass') {
    const us=uv.map(p=>p[0]), vs=uv.map(p=>p[1]);
    const u0=Math.min(...us), v0=Math.min(...vs);
    const du=Math.max(...us)-u0 || 1, dv=Math.max(...vs)-v0 || 1;
    uv=uv.map(([u,v])=>[(u-u0)/du,(v-v0)/dv]);
  }
  faces.push({...appearance, points, normal, uv});
}

function prism(faces, front, back, appearance, backAppearance = appearance) {
  const origin = average([...front,...back]);
  function surface(points, skin) { addFace(faces, points, skin, subtract(average(points),origin)); }
  surface(front,appearance);
  surface(back,backAppearance);
  for (let i=0; i<front.length; i++) {
    const j=(i+1)%front.length;
    surface([front[i],front[j],back[j],back[i]],appearance);
  }
}

function box(faces, x0,y0,z0,x1,y1,z1, appearance) {
  if (Math.min(x1-x0, y1-y0, z1-z0) <= EPS) return;
  const footprint = [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
  prism(faces,footprint.map(([x,z])=>[x,y1,z]),footprint.map(([x,z])=>[x,y0,z]),appearance);
}

function deck(faces, x0,x1,z0,z1, exposed=false, withPads=true) {
  if (withPads) {
    for (const x of [x0+.22, (x0+x1)/2, x1-.22]) for (const z of [z0+.19,z1-.19]) {
      box(faces,x-.12,.012,z-.14,x+.12,.115,z+.14,style('base','#a39886'));
    }
  }
  box(faces,x0,.105,z0,x1,FLOOR-.03,z1,baseStyle);
  const count = Math.max(1,Math.round((z1-z0)/.15));
  for (let i=0;i<count;i++) {
    const za=z0+(z1-z0)*i/count+.002, zb=z0+(z1-z0)*(i+1)/count-.002;
    const seams=[x0,x1];
    for(let x=x0+1.1+(i%3)*.88;x<x1-.20;x+=2.7) if(x>x0+.2) seams.push(x);
    seams.sort((a,b)=>a-b);
    for(let j=0;j<seams.length-1;j++) {
      const xa=seams[j]+.002, xb=seams[j+1]-.002;
      const skin=style('base',variation(exposed?'#b5916d':'#c8a881',i+3*j),'floor','x');
      addFace(faces,[[xa,FLOOR,za],[xa,FLOOR,zb],[xb,FLOOR,zb],[xb,FLOOR,za]],skin,AXES.y);
    }
  }
}

function cylinder(faces, x, z, radius, lo, hi, appearance, sides = 12) {
  if (hi - lo <= EPS) return;
  const ring = Array.from({length: sides}, (_, i) => [x + radius * Math.cos(i * 2 * Math.PI / sides), z + radius * Math.sin(i * 2 * Math.PI / sides)]);
  prism(faces, ring.map(([px, pz]) => [px, hi, pz]), ring.map(([px, pz]) => [px, lo, pz]), appearance);
}

// Мебель и оборудование показывают назначение помещений. Размеры типовые, расстановка условная.
// У каждого предмета x и z — центр, length идёт вдоль оси axis ('x' по умолчанию), depth — поперёк.
function footprint(item, length, depth) {
  const along = num(item.length, length) / 2, across = num(item.depth, depth) / 2;
  const x = num(item.x, 0), z = num(item.z, 0);
  return item.axis === 'z' ? [x - across, z - along, x + across, z + along] : [x - along, z - across, x + along, z + across];
}

function slatTop(faces, x0, z0, x1, z1, top, axis, color, thickness = .04) {
  const lengthwise = axis === 'z';
  const span = lengthwise ? x1 - x0 : z1 - z0;
  const count = Math.max(2, Math.round(span / .1));
  for (let i = 0; i < count; i++) {
    const a = i / count * span + .006, b = (i + 1) / count * span - .006;
    const skin = style('base', variation(color, i), 'wood', lengthwise ? 'z' : 'x');
    if (lengthwise) box(faces, x0 + a, top - thickness, z0, x0 + b, top, z1, skin);
    else box(faces, x0, top - thickness, z0 + a, x1, top, z0 + b, skin);
  }
}

const furnitureKit = {
  // Полок: tiers 2 добавляет нижнюю ступень со стороны step (+1 или -1 поперёк полка).
  bench(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1.6, .6);
    const top = FLOOR + num(item.height, item.tiers === 2 ? .92 : .46);
    const wood = hex(item.color, '#dcc294');
    const leg = style('base', mix(wood, '#6d5230', .25), 'wood');
    for (const px of [x0 + .05, x1 - .05]) for (const pz of [z0 + .05, z1 - .05]) box(faces, px - .03, FLOOR, pz - .03, px + .03, top - .04, pz + .03, leg);
    slatTop(faces, x0, z0, x1, z1, top, item.axis, wood);
    if (item.tiers !== 2) return;
    const depth = num(item.stepDepth, .38), side = item.step === -1 ? -1 : 1, low = FLOOR + .46;
    const step = item.axis === 'z'
      ? (side > 0 ? [x1, z0, x1 + depth, z1] : [x0 - depth, z0, x0, z1])
      : (side > 0 ? [x0, z1, x1, z1 + depth] : [x0, z0 - depth, x1, z0]);
    for (const px of [step[0] + .05, step[2] - .05]) for (const pz of [step[1] + .05, step[3] - .05]) box(faces, px - .03, FLOOR, pz - .03, px + .03, low - .04, pz + .03, leg);
    slatTop(faces, step[0], step[1], step[2], step[3], low, item.axis, wood);
    // Глухая подступенка закрывает пространство под верхним полком.
    const riser = style('base', mix(wood, '#6d5230', .12), 'wood', item.axis === 'z' ? 'z' : 'x');
    if (item.axis === 'z') { const rx = side > 0 ? x1 : x0; box(faces, rx - .012, low, z0, rx + .012, top - .04, z1, riser); }
    else { const rz = side > 0 ? z1 : z0; box(faces, x0, low, rz - .012, x1, top - .04, rz + .012, riser); }
  },
  // Банная печь-сетка с камнями и трубой до кровли.
  stove(faces, item, context) {
    const x = num(item.x, 0), z = num(item.z, 0);
    box(faces, x - .36, FLOOR, z - .36, x + .36, FLOOR + .012, z + .36, style('base', '#d5d2c6', 'plain'));
    cylinder(faces, x, z, .2, FLOOR + .012, FLOOR + .62, style('base', '#2c2d2f', 'metal'), 14);
    cylinder(faces, x, z, .185, FLOOR + .62, FLOOR + .7, style('base', '#8b877e', 'plain'), 10);
    cylinder(faces, x, z, .062, FLOOR + .7, FLOOR + 1.05, style('base', '#a9a89f', 'metal'), 10);
    cylinder(faces, x, z, .1, FLOOR + 1.05, FLOOR + 1.5, style('base', '#b8b7ae', 'metal'), 12);
    cylinder(faces, x, z, .062, FLOOR + 1.5, context.roofY(x, z) - .04, style('base', '#a9a89f', 'metal'), 10);
  },
  shower(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, .8, .8);
    box(faces, x0, FLOOR, z0, x1, FLOOR + .06, z1, style('base', '#eceeed', 'plain'));
    box(faces, x0 + .05, FLOOR + .06, z0 + .05, x1 - .05, FLOOR + .066, z1 - .05, style('base', '#d7dcdb', 'plain'));
    const px = num(item.x, 0), pz = z0 + .035, steel = style('base', '#b5b8b6', 'metal');
    box(faces, px - .012, FLOOR + .06, pz - .012, px + .012, FLOOR + 2.02, pz + .012, steel);
    box(faces, px - .09, FLOOR + 1.99, pz - .012, px + .09, FLOOR + 2.02, pz + .22, steel);
  },
  // Накопительный водонагреватель на стене.
  heater(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, .78, .3);
    const low = FLOOR + num(item.y, 1.35);
    box(faces, x0, low, z0, x1, low + .34, z1, style('base', '#f1f2ef', 'plain'));
    box(faces, x0 + .06, low + .1, z0 - .004, x1 - .06, low + .24, z1 + .004, style('base', '#dcdfdb', 'plain'));
  },
  // Обливное устройство: деревянное ведро под потолком.
  bucket(faces, item) {
    const x = num(item.x, 0), z = num(item.z, 0), low = FLOOR + num(item.y, 1.78);
    cylinder(faces, x, z, .17, low, low + .3, style('base', '#c79a62', 'wood'), 12);
    cylinder(faces, x, z, .178, low + .08, low + .11, style('base', '#56575a', 'metal'), 12);
    cylinder(faces, x, z, .178, low + .22, low + .25, style('base', '#56575a', 'metal'), 12);
  },
  table(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1, .6);
    const top = FLOOR + num(item.height, .74), wood = hex(item.color, '#cfa878');
    for (const px of [x0 + .05, x1 - .05]) for (const pz of [z0 + .05, z1 - .05]) box(faces, px - .028, FLOOR, pz - .028, px + .028, top - .035, pz + .028, style('base', mix(wood, '#5c4630', .3), 'wood'));
    box(faces, x0, top - .035, z0, x1, top, z1, style('base', wood, 'wood', item.axis === 'z' ? 'z' : 'x'));
  },
  // Скамья со спинкой: back задаёт сторону спинки (+1 или -1 поперёк скамьи).
  seat(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1.3, .44);
    const wood = hex(item.color, '#d2ad7c'), top = FLOOR + .44, side = item.back === 1 ? 1 : -1;
    for (const px of [x0 + .04, x1 - .04]) for (const pz of [z0 + .04, z1 - .04]) box(faces, px - .026, FLOOR, pz - .026, px + .026, top - .035, pz + .026, style('base', mix(wood, '#5c4630', .3), 'wood'));
    slatTop(faces, x0, z0, x1, z1, top, item.axis, wood, .035);
    const skin = style('base', mix(wood, '#5c4630', .08), 'wood', item.axis === 'z' ? 'z' : 'x');
    if (item.axis === 'z') { const bx = side > 0 ? x1 : x0; box(faces, bx - .02, top, z0, bx + .02, top + .42, z1, skin); }
    else { const bz = side > 0 ? z1 : z0; box(faces, x0, top, bz - .02, x1, top + .42, bz + .02, skin); }
  },
  // Стеллаж с ящиками на полках.
  shelves(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1.8, .42);
    const height = num(item.height, 1.8), levels = Math.max(2, Math.round(num(item.levels, 4)));
    const post = style('base', '#b08c60', 'wood'), lengthwise = item.axis === 'z';
    const span = lengthwise ? z1 - z0 : x1 - x0, bays = Math.max(1, Math.round(span / 1.1));
    for (let i = 0; i <= bays; i++) for (const far of [0, 1]) {
      const along = (lengthwise ? z0 : x0) + span * i / bays, across = far ? (lengthwise ? x1 - .02 : z1 - .02) : (lengthwise ? x0 + .02 : z0 + .02);
      const px = lengthwise ? across : clamp(along, x0 + .02, x1 - .02), pz = lengthwise ? clamp(along, z0 + .02, z1 - .02) : across;
      box(faces, px - .02, FLOOR, pz - .02, px + .02, FLOOR + height, pz + .02, post);
    }
    const bins = ['#c9a577', '#6f8a8e', '#a5553a', '#d7c9a3', '#55685a', '#b98a54'];
    for (let level = 0; level < levels; level++) {
      const y = FLOOR + .12 + (height - .16) * level / (levels - 1);
      box(faces, x0, y - .025, z0, x1, y, z1, style('base', variation('#d1b182', level), 'wood', lengthwise ? 'z' : 'x'));
      if (level === levels - 1) continue;
      const room = (height - .16) / (levels - 1) - .06, count = Math.max(1, Math.floor(span / .62));
      for (let n = 0; n < count; n++) {
        const pick = (level * 3 + n * 5 + Math.round(span * 10)) % 7;
        if (pick > 4) continue;
        const size = .26 + (pick % 3) * .07, tall = Math.min(room, .16 + (pick % 4) * .06);
        const center = (lengthwise ? z0 : x0) + span * (n + .5) / count;
        const skin = style('base', bins[(level + n * 2 + pick) % bins.length], 'plain');
        if (lengthwise) box(faces, x0 + .05, y, center - size / 2, x1 - .05, y + tall, center + size / 2, skin);
        else box(faces, center - size / 2, y, z0 + .05, center + size / 2, y + tall, z1 - .05, skin);
      }
    }
  },
  workbench(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1.6, .6);
    const top = FLOOR + num(item.height, .88), frame = style('base', '#8f6f4a', 'wood');
    for (const px of [x0 + .05, x1 - .05]) for (const pz of [z0 + .05, z1 - .05]) box(faces, px - .04, FLOOR, pz - .04, px + .04, top - .05, pz + .04, frame);
    box(faces, x0 + .03, FLOOR + .2, z0 + .03, x1 - .03, FLOOR + .23, z1 - .03, style('base', '#c2a071', 'wood', item.axis === 'z' ? 'z' : 'x'));
    box(faces, x0, top - .05, z0, x1, top, z1, style('base', '#d6b584', 'wood', item.axis === 'z' ? 'z' : 'x'));
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box(faces, cx - .22, top, cz - .12, cx + .14, top + .13, cz + .12, style('base', '#a5482b', 'plain'));
    box(faces, cx + .3, top, cz - .07, cx + .44, top + .1, cz + .07, style('base', '#4b5356', 'metal'));
  },
  stool(faces, item) {
    const x = num(item.x, 0), z = num(item.z, 0);
    cylinder(faces, x, z, .15, FLOOR + .42, FLOOR + .46, style('base', '#cfa878', 'wood'), 10);
    for (const [dx, dz] of [[.09, .09], [-.09, .09], [.09, -.09], [-.09, -.09]]) box(faces, x + dx - .018, FLOOR, z + dz - .018, x + dx + .018, FLOOR + .42, z + dz + .018, style('base', '#8f6f4a', 'wood'));
  },
  bed(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 2, .9);
    box(faces, x0, FLOOR, z0, x1, FLOOR + .26, z1, style('base', '#b08c60', 'wood', item.axis === 'z' ? 'z' : 'x'));
    box(faces, x0 + .02, FLOOR + .26, z0 + .02, x1 - .02, FLOOR + .42, z1 - .02, style('base', '#e8e0cf', 'plain'));
    const head = item.head === -1 ? -1 : 1;
    if (item.axis === 'z') { const a = head > 0 ? z1 - .5 : z0 + .08, b = head > 0 ? z1 - .08 : z0 + .5; box(faces, x0 + .12, FLOOR + .42, a, x1 - .12, FLOOR + .5, b, style('base', '#f6f1e4', 'plain')); box(faces, x0 + .02, FLOOR + .42, head > 0 ? z0 + .02 : z0 + .62, x1 - .02, FLOOR + .47, head > 0 ? z1 - .62 : z1 - .02, style('base', '#7f917f', 'plain')); }
    else { const a = head > 0 ? x1 - .5 : x0 + .08, b = head > 0 ? x1 - .08 : x0 + .5; box(faces, a, FLOOR + .42, z0 + .12, b, FLOOR + .5, z1 - .12, style('base', '#f6f1e4', 'plain')); box(faces, head > 0 ? x0 + .02 : x0 + .62, FLOOR + .42, z0 + .02, head > 0 ? x1 - .62 : x1 - .02, FLOOR + .47, z1 - .02, style('base', '#7f917f', 'plain')); }
  },
  // Поленница: торцы поленьев смотрят вдоль оси axis.
  firewood(faces, item) {
    const [x0, z0, x1, z1] = footprint(item, 1.3, .5);
    const height = num(item.height, 1.2), lengthwise = item.axis === 'z';
    const span = lengthwise ? z1 - z0 : x1 - x0, columns = Math.max(2, Math.round(span / .14)), rows = Math.max(2, Math.round(height / .13));
    const palette = ['#c9a06c', '#b98b57', '#d8b684', '#a97c4c', '#c4a274'];
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
      const shift = r % 2 ? span / columns / 2 : 0;
      const a = (lengthwise ? z0 : x0) + span * c / columns + shift + .008, b = a + span / columns - .016;
      if (b > (lengthwise ? z1 : x1) + EPS) continue;
      const y = FLOOR + height * r / rows, inset = ((r * 7 + c * 3) % 4) * .012;
      const skin = style('base', palette[(r * 3 + c * 5) % palette.length], 'wood', lengthwise ? 'x' : 'z');
      if (lengthwise) box(faces, x0 + inset, y + .006, a, x1 - inset, y + height / rows - .006, b, skin);
      else box(faces, a, y + .006, z0 + inset, b, y + height / rows - .006, z1 - inset, skin);
    }
  },
};

// Roof lines are piecewise linear. Clip the upper wall boards to the actual rake.
function clipTop(polygon, roofY) {
  const result=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i], b=polygon[(i+1)%polygon.length];
    const da=roofY(a[0])-a[1], db=roofY(b[0])-b[1];
    if(da>=-EPS) result.push(a);
    if ((da >= -EPS) !== (db >= -EPS)) {
      const f=da/(da-db);
      result.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);
    }
  }
  return result.filter((p,i) => {
    const q=result[(i+1)%result.length];
    return Math.hypot(p[0]-q[0],p[1]-q[1])>EPS;
  });
}

function createShell(def) {
  const faces=[];
  const length=clamp(num(def.length,5),1,30), width=clamp(num(def.width,2.4),1,20);
  const height=clamp(num(def.height,2.8),1.8,12);
  const roof=def.roof || 'gable', ridgeZ=def.ridgeAxis==='z';
  const halfSlope=(ridgeZ ? length : width)/2;
  const rise=roof==='flat' ? .065 : roof==='shed' ? .24 : Math.min(.70,halfSlope*.33);
  const eaves=clamp(num(def.eaves,height-rise),FLOOR+1.5,height-.025);
  const roofY=(x,z)=>{
    const u=(ridgeZ ? x : z)/halfSlope;
    return roof==='gable' ? height-(height-eaves)*Math.abs(u) : eaves+(height-eaves)*(u+1)/2;
  };
  const x0=-length/2, x1=length/2, z0=-width/2, z1=width/2;
  const terrace=def.terrace && num(def.terrace.length,0)>0 ? def.terrace : null;
  const openLength=terrace ? clamp(terrace.length,.28,length-.45) : 0;
  const left=x0+(terrace?.end==='left' ? openLength : 0);
  const right=x1-(terrace && terrace.end!=='left' ? openLength : 0);
  const trim=hex(def.trim,'#4c4943'), wall=hex(def.wall,timber), roofing=hex(def.roofColor,'#3f4646');
  deck(faces,x0,x1,z0,z1);

  function buildWall(side) {
    const long=side==='front'||side==='back', normal=NORMALS[side];
    const start=long ? left : z0, end=long ? right : z1;
    const at=long ? (side==='front' ? z1 : z0) : (side==='left' ? left : right);
    const point=(u,y,d=0)=>long ? [u,y,at+normal[2]*d] : [at+normal[0]*d,y,u];
    const top=u=>{ const p=point(u,0); return roofY(p[0],p[2]); };
    const color=hex(def.wallColors?.[side],wall);
    const cladding=def.claddings?.[side] || def.cladding || 'vertical';
    const horizontal=cladding==='horizontal', metal=cladding==='metal';
    const grain=horizontal ? (long ? 'x':'z') : 'y';
    const material=metal?'metal':'wood';
    function rect(a,b,lo,hi,d,skin) {
      const poly=clipTop([[a,lo],[b,lo],[b,hi],[a,hi]],top);
      if(poly.length>=3) addFace(faces,poly.map(([u,y])=>point(u,y,d)),skin,normal);
    }
    function solid(a,b,lo,hi,back,front,skin) {
      if(b-a<EPS || hi-lo<EPS || front-back<EPS) return;
      const p=[[a,lo],[b,lo],[b,hi],[a,hi]];
      prism(faces,p.map(([u,y])=>point(u,y,front)),p.map(([u,y])=>point(u,y,back)),skin);
    }
    function shaft(a,lo,b,hi,breadth,d,skin) {
      const len=Math.hypot(b-a,hi-lo);
      if(len<EPS) return;
      const du=(hi-lo)/len*breadth/2, dy=-(b-a)/len*breadth/2;
      const p=[[a-du,lo-dy],[b-du,hi-dy],[b+du,hi+dy],[a+du,lo+dy]];
      prism(faces,p.map(([u,y])=>point(u,y,d)),p.map(([u,y])=>point(u,y,d-.015)),skin);
    }
    const apertures=(def.features || []).filter(it=>it.wall===side).map(feature=>{
      const w=clamp(num(feature.width, .85),.15,end-start-.12);
      const center=clamp(start+(end-start)*clamp(num(feature.at,.5),0,1),start+w/2+.045,end-w/2-.045);
      const a=center-w/2,b=center+w/2;
      const lo=clamp(FLOOR+num(feature.sill,feature.kind==='window' ? .82 : 0),FLOOR,Math.min(top(a),top(b))-.2);
      const hi=clamp(lo+num(feature.height,1.94),lo+.12,Math.min(top(a),top(b))-.055);
      return {feature,a,b,lo,hi};
    });
    const bounds=[start,end,...apertures.flatMap(h=>[h.a,h.b])];
    if((ridgeZ===long) && start<0 && end>0) bounds.push(0);
    const split=Array.from(new Set(bounds)).sort((a,b)=>a-b);
    const boardStep=metal ? .156 : horizontal ? .135 : .145;
    for(let i=0;i<split.length-1;i++) {
      const a=split[i],b=split[i+1],mid=(a+b)/2;
      const openings=apertures.filter(h=>h.a<mid && h.b>mid).sort((a,b)=>a.lo-b.lo);
      const bands=[]; let lower=FLOOR;
      for(const h of openings) {
        if(h.lo>lower+EPS) bands.push([lower,h.lo]);
        lower=Math.max(lower,h.hi);
      }
      if(lower<height) bands.push([lower,height]);
      for(const [lo,hi] of bands) {
        const poly=clipTop([[a,lo],[b,lo],[b,hi],[a,hi]],top);
        if(poly.length<3) continue;
        const front=poly.map(([u,y])=>point(u,y,0)), back=poly.map(([u,y])=>point(u,y,-WALL));
        prism(faces,front,back,style(side,mix(color,'#211b16',.26),material,grain),style(side,interior,'wood',long?'x':'z'));
        const begin=horizontal ? lo : a, finish=horizontal ? hi : b, origin=horizontal ? FLOOR : start;
        for(let j=Math.floor((begin-origin)/boardStep);origin+j*boardStep<finish-EPS;j++) {
          const p0=origin+j*boardStep, p1=p0+boardStep;
          const h0=horizontal ? Math.max(lo,p0+.003) : lo;
          const h1=horizontal ? Math.min(hi,p1-.003) : hi;
          const u0=horizontal ? a : Math.max(a,p0+.0025);
          const u1=horizontal ? b : Math.min(b,p1-.0025);
          if(u1-u0<EPS||h1-h0<EPS) continue;
          rect(u0,u1,h0,h1,.011,style(side,variation(color,j),material,grain));
          if(metal) {
            const seamEnd=Math.min(u1,u0+.019);
            rect(u0,seamEnd,h0,h1,.016,style(side,mix(color,'#e5e0d3',.10),'metal',grain));
          }
        }
      }
    }
    const jamb=style(side,trim,'wood'), casing=style(side,trim,'wood',long?'x':'z');
    solid(start,start+.055,FLOOR,top(start)-.042,-.015,.031,jamb);
    solid(end-.055,end,FLOOR,top(end)-.042,-.015,.031,jamb);
    solid(start,end,FLOOR,FLOOR+.065,-.012,.028,casing);
    for(const {feature:f,a,b,lo,hi} of apertures) {
      const w=b-a, mid=(a+b)/2, t=Math.min(.065,w*.1,(hi-lo)*.08);
      const light=hex(f.trim,trim);
      const frame=style(side,light,'wood');
      const crossbar=style(side,light,'wood',long?'x':'z');
      const doorColor=hex(f.color,cladding==='metal' ? '#795e45' : mix(color,'#504535',.12));
      const leaf=style(side,doorColor,'wood');
      solid(a-t*.55,a+t,lo,hi+t*.55,-WALL-.008,.054,frame);
      solid(b-t,b+t*.55,lo,hi+t*.55,-WALL-.008,.054,frame);
      solid(a+t,b-t,hi-t,hi+t*.55,-WALL-.008,.054,crossbar);
      solid(a+t,b-t,lo,lo+t,-WALL-.008,.056,crossbar);
      const il=a+t, ir=b-t, bottom=lo+t, cap=hi-t;
      const door=['door','glazed','double'].includes(f.kind);
      const glass=(u0,u1,y0,y1)=>{
        const points=[[u0,y0],[u1,y0],[u1,y1],[u0,y1]];
        const skin=style(side,'#a9c5c4','glass');
        addFace(faces,points.map(([u,y])=>point(u,y,-.034)),skin,normal);
        addFace(faces,points.map(([u,y])=>point(u,y,-.038)),skin,normal.map(v=>-v));
      };
      if(f.kind==='window'||f.kind==='panorama'||f.kind==='glazed') {
        if(f.kind==='glazed') {
          const st=Math.min(.095,w*.12);
          solid(il,il+st,bottom,cap,-.066,.012,leaf);
          solid(ir-st,ir,bottom,cap,-.066,.012,leaf);
          solid(il+st,ir-st,bottom,bottom+.17,-.066,.012,leaf);
          solid(il+st,ir-st,cap-st,cap,-.066,.012,leaf);
          glass(il+st,ir-st,bottom+.17,cap-st);
        } else {
          glass(il,ir,bottom,cap);
          const count=f.panes ?? (f.kind==='panorama' ? Math.max(1,Math.round(w/.95)) : Math.max(1,Math.round(w/1.30)));
          for(let n=1;n<count;n++) {
            const u=il+(ir-il)*n/count;
            solid(u-.018,u+.018,bottom,cap,-.067,.024,frame);
          }
          solid(a-.035,b+.035,lo-.028,lo+.015,-.013,.095,crossbar);
        }
      } else {
        solid(il,ir,bottom,cap,-.073,-.007,style(side,mix(doorColor,'#332719',.22),'wood'));
        const leaves=f.kind==='double'?2:1;
        for(let n=0;n<leaves;n++) {
          const la=il+(ir-il)*n/leaves+.004,lb=il+(ir-il)*(n+1)/leaves-.004;
          const pieces=Math.max(2,Math.round((lb-la)/.12));
          for(let k=0;k<pieces;k++) {
            const pa=la+(lb-la)*k/pieces+.002,pb=la+(lb-la)*(k+1)/pieces-.002;
            rect(pa,pb,bottom,cap,.002,style(side,variation(doorColor,k),'wood'));
          }
          if(f.kind==='double' && f.braces) {
            shaft(la+.035,bottom+.13,lb-.035,cap-.13,.067,.022,leaf);
            solid(la,lb,bottom+.10,bottom+.165,.001,.022,leaf);
            solid(la,lb,cap-.165,cap-.10,.001,.022,leaf);
          }
          const hinge=n===1 ? lb-.035 : la+.035;
          for(const yy of [bottom+.21,cap-.23]) solid(hinge-.018,hinge+.018,yy,yy+.085,.006,.034,style(side,'#45433e','metal'));
        }
      }
      if(door) {
        const handle=f.kind==='double'?mid+.08:ir-.075;
        const yy=lo+Math.min(.97,(hi-lo)*.52);
        solid(handle-.023,handle+.023,yy-.055,yy+.055,.010,.044,style(side,'#42443e','metal'));
        solid(handle-.075,handle+.019,yy,yy+.022,.033,.080,style(side,'#343b38','metal'));
      }
      if(f.planter) {
        solid(a-.045,b+.045,lo-.24,lo-.085,.02,.19,style(side,hex(f.planterColor,'#6a5541'),'wood',long?'x':'z'));
        for(let k=0;k<Math.ceil(w/.11);k++) {
          const u=a+.04+((k+.5)*.113)%(w-.06);
          solid(u-.037,u+.037,lo-.10,lo-.015+Math.sin(k*9)*.032,.07,.15, style(side,variation('#688057',k),'plain'));
        }
      }
      if(f.shutters) {
        for(const [sa,sb] of [[Math.max(start,a-w*.30),a-.05],[b+.05,Math.min(end,b+w*.30)]]) {
          solid(sa,sb,lo,hi,.015,.048,style(side,doorColor,'wood'));
          for(let y=lo+.055;y<hi-.035;y+=.095) solid(sa+.01,sb-.01,y,y+.028,.045,.062,crossbar);
        }
      }
    }
    // Фасадные светильники-кубы, как на фотографиях мастерской.
    for(const lamp of (def.lamps || []).filter(it=>it.wall===side)) {
      const u=clamp(start+(end-start)*clamp(num(lamp.at,.5),0,1),start+.1,end-.1), y=FLOOR+num(lamp.y,1.82);
      solid(u-.045,u+.045,y,y+.13,.012,.1,style(side,'#2a2c2e','metal'));
      solid(u-.03,u+.03,y-.012,y,.03,.085,style(side,'#f3d9a2','plain'));
    }
    // Ступень у входа. Она относится к основанию и не опускается вместе со стеной в разрезе.
    if(def.steps!==false) for(const {feature:f,a,b,lo} of apertures) {
      if(!['door','glazed','double'].includes(f.kind) || f.step===false || lo>FLOOR+.03) continue;
      solid(a-.1,b+.1,.015,FLOOR-.045,.03,.36,style('base','#b89a70','wood',long?'x':'z'));
      solid(a-.1,b+.1,FLOOR-.045,FLOOR-.012,.03,.38,style('base','#cbb089','wood',long?'x':'z'));
    }
  }
  for(const side of Object.keys(NORMALS)) buildWall(side);

  if(terrace) {
    const a=terrace.end==='left'?x0:right, b=terrace.end==='left'?left:x1;
    const exposedX=terrace.end==='left'?x0:x1, endGroup=terrace.end==='left'?'left':'right';
    const wood=hex(terrace.color,wall);
    for(const z of [z0+.059,z1-.059]) {
      const x=exposedX+(terrace.end==='left'?.059:-.059);
      box(faces,x-.056,FLOOR,z-.056,x+.056,roofY(x,z)-.028,z+.056,style(z<0?'back':'front',trim,'wood'));
    }
    if(terrace.style==='slats') {
      const face=terrace.openSide==='back'?'front':'back';
      const rear=face==='back'?z0:z1;
      for(let y=FLOOR+.08,i=0;y<Math.min(eaves,height)-.16;y+=.161,i++) {
        const color=variation(wood,i);
        box(faces,a,y,rear-.027,b,y+.090,rear+.027,style(face,color,'wood','x'));
        box(faces,exposedX-.028,y,z0,exposedX+.028,y+.090,z1,style(endGroup,color,'wood','z'));
      }
    }
  }
  for(const partition of def.partitions||[]) {
    const x=num(partition.x,0),z=num(partition.z,0), half=num(partition.length,1)/2;
    const hx=partition.axis==='z'?.043:half,hz=partition.axis==='z'?half:.043;
    box(faces,x-hx,FLOOR,z-hz,x+hx,Math.min(eaves,FLOOR+num(partition.height,1.93)),z+hz,style('base',interior,'wood',partition.axis==='z'?'z':'x'));
  }
  for(const bench of def.benches||[]) {
    const x=num(bench.x,0),z=num(bench.z,0),hx=num(bench.length,1.5)/2,hz=num(bench.width,.5)/2;
    const top=FLOOR+num(bench.height,.53);
    for(const px of [x-hx+.09,x+hx-.09]) for(const pz of [z-hz+.08,z+hz-.08])
      box(faces,px-.035,FLOOR,pz-.035,px+.035,top-.055,pz+.035,style('base',timber,'wood'));
    const n=Math.max(2,Math.round(2*hz/.094));
    for(let i=0;i<n;i++) box(faces,x-hx,top-.055,z-hz+2*hz*i/n+.005,x+hx,top,z-hz+2*hz*(i+1)/n-.005,style('base',variation('#d7b988',i),'wood','x'));
  }

  for(const item of def.furniture||[]) furnitureKit[item.type]?.(faces,item,{roofY,eaves,height});

  const over=clamp(num(def.overhang,.095),.015,.45);
  const halfRun=(ridgeZ?width:length)/2;
  const roofAt=(along,across,offset=0)=>ridgeZ ? [across,roofY(across,along)+offset,along] : [along,roofY(along,across)+offset,across];
  function roofStrip(a,b,low,high,bottom,top,color) {
    const uv=[[a,low],[b,low],[b,high],[a,high]];
    prism(faces,uv.map(([u,v])=>roofAt(u,v,top)),uv.map(([u,v])=>roofAt(u,v,bottom)),style('roof',color,'metal',ridgeZ?'x':'z'));
  }
  const along0=-halfRun-over, along1=halfRun+over, outward=halfSlope+over;
  const panels=roof==='gable' ? [[-outward,0],[0,outward]] : [[-outward,outward]];
  for(const [low,high] of panels) {
    roofStrip(along0,along1,low,high,-.026,.037,roofing);
    const ribs=Math.ceil((along1-along0)/.39);
    for(let i=1;i<ribs;i++) {
      const u=along0+(along1-along0)*i/ribs;
      roofStrip(u-.008,u+.008,low,high,.036,.058,mix(roofing,'#d1d6d1',.085));
    }
    for(const [a,b] of [[along0,along0+.032],[along1-.032,along1]]) roofStrip(a,b,low,high,-.093,.036,trim);
  }
  for(const [low,high] of [[-outward,-outward+.031],[outward-.031,outward]]) roofStrip(along0,along1,low,high,-.082,.034,trim);
  if(roof==='gable') for(const [low,high] of [[-.056,0],[0,.056]]) roofStrip(along0,along1,low,high,.038,.059,mix(roofing,'#a0a19b',.12));
  if(def.chimney) {
    const x=clamp(num(def.chimney.x,0),x0+.12,x1-.12), z=clamp(num(def.chimney.z,0),z0+.12,z1-.12);
    const base=roofY(x,z), stack=base+clamp(num(def.chimney.height,.68),.18,1.8);
    const flash=style('roof','#4c5250','metal'), steel=style('roof','#a5a49b','metal');
    box(faces,x-.15,base-.02,z-.15,x+.15,base+.08,z+.15,flash);
    cylinder(faces,x,z,.084,base+.03,stack,steel); cylinder(faces,x,z,.115,stack-.043,stack+.002,flash); cylinder(faces,x,z,.129,stack+.035,stack+.068,steel);
  }
  return {faces,length,width,height,floor:FLOOR};
}

export const FLOOR_LEVEL = FLOOR;

export function createProjectGeometry(definition = {}) {
  if (!definition.compound?.parts?.length) return createShell(definition);
  const faces=[];
  for(const part of definition.compound.parts) {
    const piece=createShell(part.definition || {});
    const angle=num(part.rotationY,0), sin=Math.sin(angle),cos=Math.cos(angle);
    const rotate=([x,y,z])=>[cos*x+sin*z,y,-sin*x+cos*z];
    const tx=num(part.x,0),tz=num(part.z,0);
    for(const f of piece.faces) {
      const n=NORMALS[f.group] ? rotate(NORMALS[f.group]) : undefined;
      const group=n ? Object.keys(NORMALS).reduce((best,key)=>dot(n,NORMALS[key])>dot(n,NORMALS[best]) ? key : best,'front') : f.group;
      faces.push({...f,group,normal:rotate(f.normal),points:f.points.map(p=>{
        const [x,y,z]=rotate(p);return [x+tx,y,z+tz];
      })});
    }
  }
  for(const d of definition.compound.decks || []) {
    const x=num(d.x,0),z=num(d.z,0),hx=num(d.length,1)/2,hz=num(d.width,1)/2;
    deck(faces,x-hx,x+hx,z-hz,z+hz,true);
  }
  return {faces,length:definition.length,width:definition.width,height:definition.height,floor:FLOOR};
}
