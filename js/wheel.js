const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#376b69', '#bd9250', '#234a50', '#7b5144', '#697956', '#536981'];

// Segment zero starts at twelve o'clock; the pointer stays fixed there.
export function landingRotation(index, count, current = 0) {
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 0 || index >= count) {
    throw new Error('Invalid wheel segment.');
  }
  const center = (index + 0.5) * 360 / count;
  const target = (360 - center) % 360;
  return current + 4 * 360 + (target - current % 360 + 360) % 360;
}

function point(angle, radius) {
  const radians = (angle - 90) * Math.PI / 180;
  return [200 + radius * Math.cos(radians), 200 + radius * Math.sin(radians)];
}
function svgNode(name, attributes, text) {
  const element = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

export class SelectionWheel {
  constructor(svg, legend) {
    this.svg = svg;
    this.legend = legend;
    this.rotation = 0;
    this.animation = null;
    this.entries = [];
  }

  render(entries) {
    this.cancel();
    this.entries = entries;
    this.rotation = 0;
    this.svg.replaceChildren();
    this.legend.replaceChildren();
    this.rotor = svgNode('g', { class: 'wheel-rotor' });
    this.svg.append(this.rotor);
    if (!entries.length) this.rotor.append(svgNode('circle', { cx: 200, cy: 200, r: 176, fill: '#234a50' }));
    entries.forEach((entry, index) => {
      const step = 360 / entries.length;
      const start = point(index * step, 176);
      const end = point((index + 1) * step, 176);
      const segment = entries.length === 1
        ? svgNode('circle', { cx: 200, cy: 200, r: 176 })
        : svgNode('path', { d: `M200 200 L${start.join(' ')} A176 176 0 ${step > 180 ? 1 : 0} 1 ${end.join(' ')} Z` });
      segment.setAttribute('fill', COLORS[index % COLORS.length]);
      segment.setAttribute('stroke', '#d8bf83');
      segment.setAttribute('stroke-width', '1');
      segment.dataset.entryId = entry.id;
      segment.append(svgNode('title', {}, entry.label));
      this.rotor.append(segment);
      const angle = (index + 0.5) * step;
      const [x, y] = point(angle, 119);
      // Dense future datasets retain a complete legend instead of unreadable labels.
      if (entries.length <= 16) {
        this.rotor.append(svgNode('text', { x, y, transform: `rotate(${angle > 90 && angle < 270 ? angle + 180 : angle}, ${x}, ${y})`, class: 'wheel-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, entry.shortLabel));
      }
      const item = document.createElement('li');
      item.dataset.entryId = entry.id;
      const number = document.createElement('span');
      number.className = 'wheel-key';
      number.style.backgroundColor = COLORS[index % COLORS.length];
      number.textContent = String(index + 1).padStart(2, '0');
      item.append(number, document.createTextNode(entry.label));
      this.legend.append(item);
    });
    this.svg.append(svgNode('circle', { cx: 200, cy: 200, r: 184, class: 'wheel-rim' }));
    for (let index = 0; index < 60; index++) {
      const [x1, y1] = point(index * 6, index % 5 ? 186 : 183);
      const [x2, y2] = point(index * 6, 191);
      this.svg.append(svgNode('line', { x1, y1, x2, y2, class: 'wheel-tick' }));
    }
  }

  async spin(index, reducedMotion = false) {
    const target = landingRotation(index, this.entries.length, this.rotation);
    const animation = this.rotor.animate(
      [{ transform: `rotate(${this.rotation}deg)` }, { transform: `rotate(${target}deg)` }],
      { duration: reducedMotion ? 0 : 2100, easing: 'cubic-bezier(.12,.65,.12,1)', fill: 'forwards' }
    );
    this.animation = animation;
    try { await animation.finished; }
    catch { return false; }
    if (this.animation !== animation) return false;
    animation.cancel();
    this.animation = null;
    this.land(index, target);
    return true;
  }

  land(index, target = landingRotation(index, this.entries.length, this.rotation)) {
    this.rotation = target;
    this.rotor.style.transform = `rotate(${target}deg)`;
    this.svg.dataset.selectedId = this.entries[index].id;
    [...this.legend.children].forEach((item, position) => {
      if (position === index) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  cancel() {
    this.animation?.cancel();
    this.animation = null;
    delete this.svg.dataset.selectedId;
  }
}
