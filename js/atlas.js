const NS = 'http://www.w3.org/2000/svg';
export const VIEWS = {
  world: [0, 0, 1080, 465], Europe: [490, 35, 210, 145],
  'East Asia': [795, 75, 210, 165], 'North America': [120, 45, 240, 205],
  'South America': [285, 225, 210, 220], 'North Africa': [480, 130, 210, 135],
  'Middle East': [620, 105, 150, 120], Oceania: [855, 280, 215, 170],
  'Central America': [240, 180, 100, 75], 'Sub-Saharan Africa': [480, 180, 250, 200],
  'Central Asia': [690, 105, 170, 100], 'South Asia': [720, 150, 150, 125],
  'Southeast Asia': [800, 160, 190, 150]
};
export function project([longitude, latitude]) { return [(longitude + 180) * 3, (85 - latitude) * 3]; }
function svg(name, attrs) {
  const element = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}
export class CampaignAtlas {
  constructor(map, list, select) { this.map = map; this.list = list; this.select = select; this.view = 'world'; }
  render(records, eligible, selected) {
    const focused = document.activeElement?.dataset.mapTag;
    const countries = [...new Map(records.map(record => [record.tag, record])).values()];
    const active = new Set(eligible.map(record => record.tag));
    const bounds = VIEWS[this.view];
    this.map.setAttribute('viewBox', bounds.join(' '));
    this.map.replaceChildren(svg('image', { href: new URL('../assets/world-land.svg', import.meta.url).href, x: 0, y: 0, width: 1080, height: 465 }));
    const scale = bounds[2] / 1080;
    const placed = [];
    this.list.replaceChildren();
    for (const country of countries) {
      const enabled = active.has(country.tag);
      const chosen = selected === country.tag;
      const location = country.location;
      const [x, y] = Array.isArray(location) && location.length === 2 && location.every(Number.isFinite) ? project(location) : [NaN, NaN];
      if (x >= bounds[0] && x <= bounds[0] + bounds[2] && y >= bounds[1] && y <= bounds[1] + bounds[3]) {
        // Separate close flags without misrepresenting their locations: leader lines
        // terminate at the geographic anchor, not the displaced flag.
        let px = x, py = y;
        for (let attempt = 0; attempt < 250; attempt++) {
          const angle = attempt * 2.4, radius = Math.sqrt(attempt) * 13 * scale;
          px = Math.max(bounds[0] + 25 * scale, Math.min(bounds[0] + bounds[2] - 25 * scale, x + Math.cos(angle) * radius));
          py = Math.max(bounds[1] + 20 * scale, Math.min(bounds[1] + bounds[3] - 20 * scale, y + Math.sin(angle) * radius));
          if (placed.every(([a,b]) => Math.abs(a-px) > 46 * scale || Math.abs(b-py) > 35 * scale)) break;
        }
        placed.push([px,py]);
        this.map.append(svg('line', { x1:x,y1:y,x2:px,y2:py,class:'atlas-leader' }), svg('circle',{cx:x,cy:y,r:2*scale,class:'atlas-anchor'}));
        const marker = svg('g', { transform:`translate(${px} ${py}) scale(${scale})`, role:'button', tabindex:enabled ? 0 : -1, 'aria-label':`${country.country}${enabled ? ': select country' : ': no eligible paths'}`, 'aria-disabled':String(!enabled), 'aria-pressed':String(chosen), class:'atlas-marker' });
        marker.dataset.mapTag = country.tag;
        const title = svg('title',{}); title.textContent = country.country;
        marker.append(title,svg('rect',{x:-22,y:-17,width:44,height:34,rx:3}),svg('image',{href:country.flag,x:-18,y:-13,width:36,height:24}));
        const activate = () => { if (enabled) this.select(country.tag); };
        marker.addEventListener('click',activate);
        marker.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
        this.map.append(marker);
      }
      if (this.view !== 'world' && country.region !== this.view) continue;
      const button = document.createElement('button');
      button.className = 'atlas-country'; button.disabled = !enabled;
      button.dataset.mapTag = country.tag;
      button.setAttribute('aria-pressed', String(chosen));
      const flag = document.createElement('img'); flag.src = country.flag; flag.alt = '';
      const label = document.createElement('span'); label.textContent = country.country;
      const status = document.createElement('small'); status.textContent = country.paths?.length ? `${country.paths.length} ${country.paths.length === 1 ? 'route' : 'routes'} · partial` : 'Paths pending';
      label.append(status);
      button.append(flag,label);
      button.addEventListener('click',()=>this.select(country.tag));
      this.list.append(button);
    }
    if (focused) this.list.querySelector(`[data-map-tag="${focused}"]`)?.focus({preventScroll:true});
  }
}
