const BED_WIDTHS = [90, 140, 160];
const BED_LENGTH = 200;
const INSIDE_WIDTH = 220;
let nextId = 0;

const styles = `
  .fit-root {
    --fit-ink: #302d27;
    --fit-muted: #656156;
    --fit-accent: #9c482b;
    --fit-paper: #f4f1e9;
    color: var(--fit-ink);
    container: fit-card / inline-size;
    font: inherit;
  }
  .fit-root *, .fit-root *::before, .fit-root *::after { box-sizing: border-box; }
  .fit-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(240px, 1fr);
    overflow: hidden;
    border: 1px solid #d5d0c4;
    border-radius: 4px;
    background: #faf8f2;
  }
  .fit-drawing {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    margin: 0;
    padding: clamp(12px, 2.5cqw, 34px);
    background-color: var(--fit-paper);
    background-image: radial-gradient(#cec8b957 0.8px, transparent 0.9px);
    background-size: 15px 15px;
  }
  .fit-plan { display: block; width: 100%; height: auto; overflow: visible; }
  .fit-plan text { font-family: inherit; font-variant-numeric: tabular-nums; }
  .fit-legend {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px 18px;
    color: var(--fit-muted);
    font-size: 13px;
    line-height: 1.4;
  }
  .fit-legend span { display: inline-flex; align-items: center; gap: 7px; }
  .fit-swatch { width: 14px; height: 10px; border: 1px solid currentColor; }
  .fit-swatch-bed { color: #a89073; background: #d9c8ac; }
  .fit-swatch-pass {
    color: #bb7656;
    background: repeating-linear-gradient(135deg, #f2dfc9 0 3px, #dab994 3px 4px);
  }
  .fit-controls {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    gap: 23px;
    min-width: 0;
    padding: clamp(20px, 3.3cqw, 44px);
    border-left: 1px solid #d5d0c4;
  }
  .fit-set { padding: 0; margin: 0; border: 0; min-width: 0; }
  .fit-set legend, .fit-result-label { padding: 0; margin: 0 0 10px; font-size: 15px; font-weight: 600; line-height: 1.35; }
  .fit-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .fit-choice { display: block; position: relative; cursor: pointer; }
  .fit-choice input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .fit-choice span {
    display: grid;
    place-items: center;
    min-height: 44px;
    padding: 0 4px;
    border: 1px solid #bfb8aa;
    border-radius: 3px;
    color: var(--fit-ink);
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    transition: border-color .15s, background-color .15s;
  }
  .fit-choice:hover span { border-color: var(--fit-accent); }
  .fit-choice input:checked + span { border-color: var(--fit-accent); background: var(--fit-accent); color: #fff; }
  .fit-choice input:focus-visible + span { outline: 2px solid var(--fit-ink); outline-offset: 3px; }
  .fit-result { margin: 0; border-top: 1px solid #ddd7ca; padding: 18px 0 0; }
  .fit-result-label { display: block; margin-bottom: 3px; }
  .fit-value { display: block; line-height: 1.02; color: var(--fit-accent); font-weight: 500; }
  .fit-value b { font: inherit; font-size: clamp(40px, 5.5cqw, 68px); font-variant-numeric: tabular-nums; letter-spacing: -.065em; }
  .fit-value small { margin-left: .25em; font-size: 21px; font-weight: 500; }
  .fit-note { margin: 0; color: var(--fit-muted); font-size: 13px; line-height: 1.5; }
  @container fit-card (max-width: 650px) {
    .fit-layout { grid-template-columns: minmax(0, 1fr); }
    .fit-drawing { padding: 12px 9px 18px; }
    .fit-controls { padding: 20px; gap: 16px; border-left: 0; border-top: 1px solid #d5d0c4; }
    .fit-result { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; }
    .fit-result-label { margin: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .fit-choice span { transition: none; } }
`;

// One drawing unit equals one centimetre. The outer walls span 500 × 240 units.
function drawPlan(id, bedWidth) {
  const clearance = INSIDE_WIDTH - bedWidth;
  const roomLeft = 46;
  const roomTop = 62;
  const roomBottom = roomTop + INSIDE_WIDTH;
  const bedTop = roomBottom - bedWidth;
  const bedEnd = roomLeft + BED_LENGTH;
  const pillowCount = bedWidth === 90 ? 1 : 2;
  const pillowHeight = pillowCount === 1 ? 52 : (bedWidth - 30) / 2;
  const pillows = Array.from({ length: pillowCount }, (_, i) => {
    const y = pillowCount === 1 ? bedTop + (bedWidth - pillowHeight) / 2 : bedTop + 12 + i * (pillowHeight + 6);
    return `<rect x="53" y="${y}" width="36" height="${pillowHeight}" rx="7" fill="#f6ede0" stroke="#a59175" stroke-width="1.5"/>`;
  }).join('');
  const arrowX = roomLeft + 38;
  const labelY = roomTop + clearance / 2 + 6;

  return `
    <title>План барн-модуля с кроватью шириной ${bedWidth} см</title>
    <desc>Кровать длиной 200 см стоит вдоль стены. При внутренней ширине 220 см рядом с кроватью остаётся ${clearance} см.</desc>
    <defs>
      <pattern id="${id}-floor" width="28" height="20" patternUnits="userSpaceOnUse">
        <rect width="28" height="20" fill="#f8f5ec"/>
        <path d="M0 19.5H28" fill="none" stroke="#e3ddce" stroke-width="1"/>
      </pattern>
      <pattern id="${id}-hatch" width="9" height="9" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="#f2e0cb"/>
        <path d="m-2 2 4 -4m-2 11 9 -9m-2 11 4 -4" fill="none" stroke="#d8b393" stroke-width="1"/>
      </pattern>
    </defs>
    <g stroke="#837d70" stroke-width="1.4" fill="none">
      <path d="M36 23v23m500 -23v23M36 34h500m-505 5 10 -10m490 10 10 -10"/>
      <path d="M542 52h22m-22 240h22m-11 -240v240m-5 -235 10 -10m-10 250 10 -10"/>
    </g>
    <rect x="246" y="19" width="80" height="26" fill="#f4f1e9"/>
    <text x="286" y="39" text-anchor="middle" fill="#565246" font-size="18">5 м</text>
    <g transform="translate(553 172) rotate(-90)">
      <rect x="-33" y="-13" width="66" height="26" fill="#f4f1e9"/>
      <text y="6" text-anchor="middle" fill="#565246" font-size="18">2,4 м</text>
    </g>
    <rect x="36" y="52" width="500" height="240" fill="#625d50"/>
    <rect x="${roomLeft}" y="${roomTop}" width="480" height="${INSIDE_WIDTH}" fill="url(#${id}-floor)"/>
    <rect x="${roomLeft}" y="${roomTop}" width="${BED_LENGTH}" height="${clearance}" fill="url(#${id}-hatch)"/>
    <path d="M${bedEnd} ${roomTop}v${clearance}" stroke="#b27f5d" stroke-dasharray="4 4"/>
    <g>
      <rect x="${roomLeft + 1}" y="${bedTop + 1}" width="${BED_LENGTH - 2}" height="${bedWidth - 2}" rx="4" fill="#c4b396" stroke="#89765f" stroke-width="2"/>
      <rect x="${roomLeft + 5}" y="${bedTop + 5}" width="${BED_LENGTH - 10}" height="${bedWidth - 10}" rx="4" fill="#efe6d5" stroke="#b29e82"/>
      ${pillows}
      <rect x="96" y="${bedTop + 5}" width="146" height="${bedWidth - 10}" rx="3" fill="#d9c8ac" stroke="#a59175"/>
      <path d="M104 ${bedTop + 6}v${bedWidth - 12}" stroke="#b7a485" stroke-width="2"/>
      <text x="171" y="${bedTop + bedWidth / 2 + 6}" text-anchor="middle" fill="#473e30" font-size="17" font-weight="600">200 × ${bedWidth}</text>
    </g>
    <g stroke="#924328" stroke-width="2" stroke-linecap="round" fill="none">
      <path d="M${arrowX} ${roomTop + 5}v${clearance - 10}"/>
      <path d="m${arrowX - 4} ${roomTop + 11} 4 -6 4 6m-8 ${clearance - 22} 4 6 4 -6"/>
    </g>
    <rect x="99" y="${labelY - 18}" width="93" height="25" rx="2" fill="#f2e0cb"/>
    <text x="106" y="${labelY}" fill="#833d26" font-size="18" font-weight="700">${clearance} см</text>
  `;
}

export function mountFit(container, { onChange } = {}) {
  const id = `fit-plan-${++nextId}`;
  const root = document.createElement('div');
  root.className = 'fit-root';
  const choices = BED_WIDTHS.map(width => `
    <label class="fit-choice">
      <input type="radio" name="${id}-width" value="${width}" ${width === 140 ? 'checked' : ''} aria-label="${width} сантиметров">
      <span aria-hidden="true">${width}</span>
    </label>`).join('');

  root.innerHTML = `
    <style>${styles}</style>
    <div class="fit-layout">
      <figure class="fit-drawing">
        <svg class="fit-plan" viewBox="16 8 560 300" role="img" xmlns="http://www.w3.org/2000/svg"></svg>
        <figcaption class="fit-legend">
          <span><i class="fit-swatch fit-swatch-bed" aria-hidden="true"></i>Кровать</span>
          <span><i class="fit-swatch fit-swatch-pass" aria-hidden="true"></i>Боковой проход</span>
        </figcaption>
      </figure>
      <div class="fit-controls">
        <fieldset class="fit-set">
          <legend>Ширина кровати, см</legend>
          <div class="fit-choices">${choices}</div>
        </fieldset>
        <p class="fit-result" aria-live="polite" aria-atomic="true">
          <span class="fit-result-label">Свободный проход</span>
          <span class="fit-value"><b></b><small>см</small></span>
        </p>
        <p class="fit-note">Для примера взята внутренняя ширина 220 см. Кровать длиной 200 см стоит вплотную к стене. Точные размеры зависят от отделки и каркаса кровати.</p>
      </div>
    </div>`;

  const svg = root.querySelector('.fit-plan');
  const result = root.querySelector('.fit-value b');
  function update(bedWidth) {
    const clearance = INSIDE_WIDTH - bedWidth;
    svg.innerHTML = drawPlan(id, bedWidth);
    result.textContent = String(clearance);
    onChange?.({ bedWidth, bedLength: BED_LENGTH, insideWidth: INSIDE_WIDTH, clearance });
  }
  function handleChange(event) {
    if (event.target.name === `${id}-width` && event.target.checked) {
      update(Number(event.target.value));
    }
  }
  root.addEventListener('change', handleChange);
  container.replaceChildren(root);
  update(140);
  return {
    destroy() {
      root.removeEventListener('change', handleChange);
      root.remove();
    },
  };
}
