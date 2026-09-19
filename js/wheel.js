const NS = 'http://www.w3.org/2000/svg';

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
    this.frame = null;
    this.resolveSpin = null;
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
      segment.setAttribute('fill', entry.color || '#30373e');
      segment.setAttribute('stroke', '#d8bf83');
      segment.setAttribute('stroke-width', '1');
      segment.dataset.entryId = entry.id;
      segment.append(svgNode('title', {}, entry.label));
      this.rotor.append(segment);
      const angle = (index + 0.5) * step;
      const [x, y] = point(angle, 140);
      // Keep flags visible for the country roster; dense path wheels use the legend.
      if (entries.length > 16 && entries.length <= 32 && entry.flag) {
        const [fx, fy] = point(angle, 145);
        this.rotor.append(svgNode('image', { href: entry.flag, x: fx - 14, y: fy - 9, width: 28, height: 18, transform: `rotate(${angle}, ${fx}, ${fy})` }));
      }
      if (entries.length <= 16) {
        const text = svgNode('text', { x, y, transform: `rotate(${angle}, ${x}, ${y})`, class: 'wheel-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, entry.shortLabel);
        text.style.fill = entry.color === '#ffed00' ? '#171b20' : '#fff9e9';
        this.rotor.append(text);
        const [ix, iy] = point(angle, 100);
        const art = svgNode('g', { transform: `translate(${ix} ${iy}) rotate(${angle})` });
        if (entry.flag) art.append(svgNode('image', { href: entry.flag, x: entry.icon ? -44 : -28, y: -18, width: 56, height: 36 }));
        if (entry.icon) art.append(svgNode('image', { href: entry.icon, x: 13, y: -22, width: 44, height: 44 }));
        this.rotor.append(art);
      }
      const item = document.createElement('li');
      item.dataset.entryId = entry.id;
      const number = document.createElement('span');
      number.className = 'wheel-key';
      number.style.backgroundColor = entry.color || '#30373e';
      number.style.color = entry.color === '#ffed00' ? '#171b20' : '#fff9e9';
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
    if (reducedMotion) { this.land(index, target); return true; }
    const start = performance.now();
    const from = this.rotation;
    // Animate SVG geometry directly so the visible spin does not depend on
    // CSS animation settings or a browser's Web Animations playback policy.
    return new Promise(resolve => {
      this.resolveSpin = resolve;
      const tick = now => {
        const elapsed = Math.min((now - start) / 3400, 1);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        this.rotor.setAttribute('transform', `rotate(${from + (target - from) * eased} 200 200)`);
        if (elapsed < 1) this.frame = requestAnimationFrame(tick);
        else {
          this.frame = null;
          this.resolveSpin = null;
          this.land(index, target);
          resolve(true);
        }
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  land(index, target = landingRotation(index, this.entries.length, this.rotation)) {
    this.rotation = target;
    this.rotor.setAttribute('transform', `rotate(${target} 200 200)`);
    this.svg.dataset.selectedId = this.entries[index].id;
    [...this.legend.children].forEach((item, position) => {
      if (position === index) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  cancel() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.resolveSpin?.(false);
    this.resolveSpin = null;
    delete this.svg.dataset.selectedId;
  }
}
