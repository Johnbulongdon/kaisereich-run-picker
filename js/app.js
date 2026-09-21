import { resolveFlag } from './flags.js';
import { readDataset, eligiblePaths, eligibleCountries, choose, countriesIn, searchPaths, groupByIdeology } from './picker.js';
import { setStatus, summarize, STATUSES, STATUS_LABELS } from './tracker.js';
import { createStorage, parseSave, exportSave, MAX_SAVE_BYTES, STORAGE_KEY } from './storage.js';
import { SelectionWheel } from './wheel.js';
import { CampaignAtlas } from './atlas.js';
import { VIEWS } from './atlas.js';

const $ = id => document.getElementById(id);
const storage = createStorage();
let countries = [];
let flagVariants = {};
let records = [], progress = {}, result = null, selectedCountry = '', selectedIdeology = '', mode = 'country';
let protectCorruptSave = false;
const wheel = new SelectionWheel($('selection-wheel'), $('wheel-entries'));
let spinning = false, spinToken = 0;
const atlas = new CampaignAtlas($('campaign-map'), $('atlas-countries'), tag => {
  document.querySelector('input[name=mode][value=country]').checked = true;
  changeMode();
  selectedCountry = tag; selectedIdeology = '';
  refreshEligibility(); renderResult();
  announce(`${$('result-country').textContent} selected from the map. Spin a political path.`);
});

function wheelItems(kind) {
  const eligible = pool();
  if (kind === 'country') return countryPool().map(country => ({ ...country, id: country.tag, color: '#30373e', label: country.country, shortLabel: country.country.length > 14 ? country.tag : country.country }));
  if (kind === 'ideology') return groupByIdeology(eligible.filter(path => path.tag === selectedCountry)).map(group => ({ ...group, flag: resolveFlag(countries.find(country => country.tag === selectedCountry), group.ideology, null, flagVariants).flag, id: group.ideology, label: `${group.ideology} · ${group.paths.length} ${group.paths.length === 1 ? 'path' : 'paths'}`, shortLabel: group.ideology }));
  return (kind === 'path' ? eligible.filter(path => path.tag === selectedCountry && path.ideology === selectedIdeology) : eligible)
    .map(path => ({ ...path, label: `${path.country} — ${path.name}`, shortLabel: path.shortName || path.tag }));
}
function assetUrl(path) { return /^\.\/assets\/[\w/-]+\.png$/.test(path ?? '') ? new URL('../' + path.slice(2), import.meta.url).href : ''; }
function defaultSpinKind() { return mode === 'country' ? (selectedCountry ? (selectedIdeology ? 'path' : 'ideology') : 'country') : 'both'; }
function renderWheel(kind = defaultSpinKind()) {
  const entries = wheelItems(kind);
  wheel.render(entries);
  const selectedIndex = entries.findIndex(entry => entry.id === result?.id);
  if (selectedIndex >= 0) wheel.land(selectedIndex);
  $('wheel-legend-title').textContent = `On the wheel · ${entries.length} ${kind === 'country' ? 'countries' : kind === 'ideology' ? 'ideologies' : 'paths'}`;
  $('wheel-caption').textContent = entries.length ? (kind === 'country' ? 'Each country gets an equal slice.' : kind === 'ideology' ? 'Each available ideology gets an equal slice. Paths come next.' : 'Each eligible political option gets an equal slice.') : selectedCountry && !records.some(path => path.tag === selectedCountry) ? 'Routes awaiting review. Use Spin country to discover another nation.' : 'No eligible paths. Adjust your filters.';
  $('wheel-spin').disabled = !entries.length || (mode === 'ideology' && !$('ideology').value);
  $('wheel-button-label').textContent = 'SPIN';
}
function cancelSpin() {
  spinToken++;
  spinning = false;
  wheel.cancel();
  $('result-card').removeAttribute('aria-busy');
}

function announce(message) { $('announcement').textContent = message; }
function warn(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = !message; }
function filters() {
  return { region: $('region').value, ideology: $('ideology').value, status: $('status-filter').value, availability: $('availability').value, routeKind: $('route-kind').value,
    excludeCompleted: $('exclude-completed').checked, excludePlayed: $('exclude-played').checked };
}
function pool() { return eligiblePaths(records, progress, filters()); }
function countryPool() { return eligibleCountries(countries, records, progress, filters()); }
function coverage(country) { const count = records.filter(path => path.tag === country.tag).length; return count ? `${count} political ${count === 1 ? 'route' : 'routes'} · coverage incomplete` : 'Political paths awaiting review'; }
function safeSource(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.hostname === 'github.com' ? parsed.href : null; }
  catch { return null; }
}
function options(select, entries, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  for (const entry of entries) select.add(new Option(entry.label ?? entry, entry.value ?? entry));
}
function persist() {
  if (protectCorruptSave) {
    warn('The existing saved record is unreadable and has been left untouched. Changes are temporary. Export this session, then use Reset progress to replace the damaged record.');
    return false;
  }
  const saved = storage.save(progress);
  warn(saved ? '' : 'Progress cannot be saved in this browser. Changes are kept for this session only. Export a backup before closing.');
  return saved;
}
function updateStatus(id, status) {
  progress = setStatus(progress, id, status);
  const saved = persist();
  renderStats();
  renderChecklist();
  refreshEligibility();
  renderResult();
  announce(`${records.find(path => path.id === id).name}: ${STATUS_LABELS[status]}. ${saved ? 'Saved in this browser.' : 'Session only; export to keep a backup.'}`);
}

function refreshEligibility(preserveWheel = false) {
  if (!preserveWheel) cancelSpin();
  const eligible = pool();
  const countries = countryPool();
  if (!countries.some(country => country.tag === selectedCountry)) selectedCountry = '';
  options($('country'), countries.map(country => ({ label: `${country.country}${country.startingCountry ? '' : ' (forms during play)'} — ${coverage(country)}`, value: country.tag })), 'Let fate choose');
  $('country').value = selectedCountry;
  const countryRoutes = eligible.filter(path => path.tag === selectedCountry);
  const groups = groupByIdeology(countryRoutes);
  if (!groups.some(group => group.ideology === selectedIdeology)) selectedIdeology = '';
  options($('country-ideology'), groups.map(group => ({value:group.ideology, label:`${group.ideology} · ${group.paths.length} ${group.paths.length === 1 ? 'path' : 'paths'}`})), selectedCountry ? 'Choose an ideology, or spin' : 'Choose a country first');
  $('country-ideology').disabled = !groups.length;
  $('country-ideology').value = selectedIdeology;
  const routes = countryRoutes.filter(path => path.ideology === selectedIdeology);
  options($('path-choice'), routes.map(path => ({ value: path.id, label: `${path.name} — ${path.ruleGroupName || path.category}` })), selectedIdeology ? 'Choose a path, or spin' : 'Choose an ideology first');
  $('path-choice').disabled = !routes.length;
  $('path-choice').value = result?.tag === selectedCountry ? result.id : '';
  $('eligible-count').textContent = `${eligible.length} eligible ${eligible.length === 1 ? 'path' : 'paths'} · ${countries.length} countries`;
  $('spin-country').disabled = !countries.length;
  $('spin-ideology').disabled = !groups.length;
  $('spin-path').disabled = !routes.length;
  $('spin-both').disabled = !eligible.length || (mode === 'ideology' && !$('ideology').value);
  if (result && !eligible.some(path => path.id === result.id)) result = null;
  if (!eligible.length) {
    $('result-country').textContent = 'No paths match.';
    $('result-path').textContent = 'Clear filters or include more progress states to draw again.';
  }
  if (!preserveWheel) renderWheel();
  else $('wheel-spin').disabled = !wheelItems(defaultSpinKind()).length;
}

function renderResult() {
  renderBriefing();
  const nation = countries.find(country => country.tag === (result?.tag || selectedCountry));
  const ideologyDisplay = result || records.find(path => path.tag === selectedCountry && path.ideology === selectedIdeology);
  const selectedFlag = resolveFlag(nation, ideologyDisplay?.ideology, result?.id, flagVariants);
  atlas.render(countries.map(country => country.tag === nation?.tag ? { ...country, flag: selectedFlag.flag } : country), countryPool(), result?.tag || selectedCountry);
  $('result-coverage').hidden = !nation;
  $('result-coverage').textContent = nation ? coverage(nation) : '';
  $('result-heraldry').hidden = !nation?.flag;
  if (selectedFlag.flag) {
    $('result-flag').src = selectedFlag.flag;
    $('result-flag').alt = selectedFlag.kind === 'path' ? `${nation.country} — ${result.name} flag` : selectedFlag.kind === 'ideology' ? `${nation.country} — ${ideologyDisplay.ideology} flag` : `${nation.country} reference flag`;
    $('result-flag').title = selectedFlag.kind === 'country' && ideologyDisplay ? 'Country reference flag; no confirmed variant for this selection.' : $('result-flag').alt;
  }
  $('result-emblem').hidden = !ideologyDisplay?.icon;
  if (ideologyDisplay?.icon) { $('result-emblem').src = ideologyDisplay.icon; $('result-emblem').alt = `${ideologyDisplay.ideology} emblem`; }
  $('result-ideology').style.borderColor = ideologyDisplay?.color || '';
  $('result-actions').hidden = !result;
  $('result-ideology').hidden = !ideologyDisplay;
  $('result-notes').hidden = !result?.notes && !nation?.formationContext;
  $('result-tag').textContent = result?.tag || selectedCountry || '—';
  $('result-region').textContent = nation?.region || 'THE WORLD AWAITS';
  $('result-country').textContent = nation?.country || 'A new history starts here.';
  $('result-path').textContent = result?.name || (selectedCountry ? (records.some(path => path.tag === selectedCountry) ? (selectedIdeology ? `${selectedIdeology} selected. Choose or spin a path in layer 3.` : 'Country selected. Choose or spin an ideology in layer 2.') : 'This nation is playable. Its political routes are still awaiting verification; choose your own route in-game.') : 'Spin to discover your next campaign.');
  $('result-ideology').textContent = ideologyDisplay?.ideology || '';
  $('result-notes').textContent = `${nation?.formationContext ? nation.formationContext + '\n\n' : ''}${result ? `${result.ruleGroupName ? result.ruleGroupName + '\n\n' : ''}${result.notes || ''}` : ''}`;
  if (result) $('result-status').value = progress[result.id] ?? 'unplayed';
  if (!countryPool().length) {
    $('result-country').textContent = 'No paths match.';
    $('result-path').textContent = 'Clear filters or include more progress states to draw again.';
    $('result-tag').textContent = '—';
  }
}
function renderBriefing() {
  $('campaign-briefing').hidden = !result;
  $('campaign-objectives').replaceChildren();
  if (!result) return;
  $('briefing-title').textContent = `${result.country} · Campaign goals`;
  for (const objective of result.objectives ?? []) $('campaign-objectives').append(node('li', objective));
  $('campaign-challenge').textContent = result.challenge || 'Keep your capital under your control through your first major war.';
  const source = safeSource(result.source);
  $('briefing-source').hidden = !source;
  if (source) $('briefing-source').href = source;
}
function reveal() {
  renderResult();
  $('result-details').classList.remove('revealing');
  // Restart a short reveal; reduced-motion users receive the result immediately.
  void $('result-details').offsetWidth;
  $('result-details').classList.add('revealing');
  announce(result ? `${result.country} — ${result.name}. ${result.ideology}.` : `${$('result-country').textContent}. ${$('result-path').textContent}`);
}
async function spin(kind) {
  if (spinning) return;
  if (mode === 'ideology' && !$('ideology').value) return announce('Choose a political ideology first.');
  const entries = wheelItems(kind);
  const chosen = choose(entries);
  if (!chosen) return;
  renderWheel(kind);
  const token = ++spinToken;
  spinning = true;
  result = null;
  renderResult();
  for (const id of ['spin-country', 'spin-ideology', 'spin-path', 'spin-both', 'wheel-spin']) $(id).disabled = true;
  $('result-card').setAttribute('aria-busy', 'true');
  $('result-country').textContent = 'Fate is turning…';
  $('result-path').textContent = 'The pointer will reveal your next campaign.';
  $('wheel-button-label').textContent = '…';
  $('wheel-caption').textContent = 'Drawing your next campaign…';
  announce('Spinning the selection wheel.');
  const landed = await wheel.spin(entries.indexOf(chosen), $('spin-motion').value === 'off');
  if (!landed || token !== spinToken) return;
  spinning = false;
  $('result-card').removeAttribute('aria-busy');
  if (kind === 'country') {
    selectedCountry = chosen.tag;
    selectedIdeology = '';
    result = null;
  } else if (kind === 'ideology') {
    selectedIdeology = chosen.ideology;
    result = null;
  } else {
    result = records.find(path => path.id === chosen.id);
    selectedCountry = result.tag;
    selectedIdeology = result.ideology;
  }
  refreshEligibility(true);
  $('wheel-caption').textContent = kind === 'country' ? `${chosen.country} selected. ${records.some(path => path.tag === chosen.tag) ? 'Spin again to choose its ideology, then its path.' : 'Political paths awaiting review.'}` : kind === 'ideology' ? `${chosen.ideology} selected. Spin again to choose a path.` : `${chosen.country} · ${chosen.ideology}`;
  $('wheel-button-label').textContent = kind === 'country' ? (records.some(path => path.tag === chosen.tag) ? 'IDEOLOGY' : 'PENDING') : kind === 'ideology' ? 'PATH' : 'AGAIN';
  reveal();
}
function changeMode() {
  mode = document.querySelector('input[name=mode]:checked').value;
  result = null;
  selectedCountry = ''; selectedIdeology = '';
  $('country-control').hidden = mode !== 'country';
  $('spin-country').hidden = mode !== 'country';
  $('spin-path').hidden = mode !== 'country';
  $('spin-ideology').hidden = mode !== 'country';
  $('spin-both').textContent = mode === 'country' ? 'Randomize run ↻' : mode === 'ideology' ? 'Find a country & path ↻' : 'Spin a new run ↻';
  $('mode-help').textContent = mode === 'country' ? 'Choose a country, then an ideology, then a specific path. Each layer narrows the next.' : mode === 'ideology' ? 'Choose a political ideology in the conditions, then draw a country and matching path.' : 'Every eligible country–path combination has an equal chance.';
  $('selection-footnote').textContent = mode === 'country' ? 'Layer 1: Country → Layer 2: Ideology → Layer 3: Path.' : 'Filters apply before the draw. Every matching path gets one slot.';
  refreshEligibility();
  renderResult();
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function renderChecklist() {
  const activeId = document.activeElement?.dataset.pathId;
  const expanded = new Set([...document.querySelectorAll('.ideology-group[open]')].map(group => group.dataset.groupKey));
  const visible = searchPaths(eligiblePaths(records, progress, { status: $('browse-status').value }), $('search').value);
  const query = $('search').value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const pending = countries.filter(country => !records.some(path => path.tag === country.tag) && !$('browse-status').value && `${country.country} ${country.tag} ${country.region}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(query));
  $('browse-count').textContent = `${visible.length} of ${records.length} source-backed political options · ${pending.length} matching countries awaiting path review`;
  $('browse-empty').hidden = visible.length + pending.length > 0;
  const fragment = document.createDocumentFragment();
  for (const country of countriesIn(visible)) {
    const section = node('section', undefined, 'country-group');
    const heading = node('h2', country.country);
    heading.append(node('span', country.tag));
    section.append(heading, node('p', coverage(country), 'coverage-label'));
    for (const group of groupByIdeology(visible.filter(item => item.tag === country.tag))) {
      const layer = node('details', undefined, 'ideology-group');
      layer.dataset.groupKey = `${country.tag}:${group.ideology}`;
      layer.open = Boolean(query || $('browse-status').value || expanded.has(layer.dataset.groupKey));
      const summary = node('summary');
      if (group.icon) { const icon = node('img'); icon.src = group.icon; icon.alt = ''; summary.append(icon); }
      summary.append(node('span', group.ideology), node('small', `${group.paths.length} ${group.paths.length === 1 ? 'path' : 'paths'}`));
      layer.append(summary);
      for (const path of group.paths) {
      const row = node('div', undefined, 'path-row');
      const info = node('div');
      const imagery = node('div', undefined, 'checklist-heraldry');
      if (path.flag) { const flag = node('img'); flag.src = path.flag; flag.alt = `${path.country} flag`; imagery.append(flag); }
      if (path.icon) { const emblem = node('img'); emblem.src = path.icon; emblem.alt = `${path.ideology} emblem`; imagery.append(emblem); }
      info.append(imagery);
      info.append(node('h3', path.name), node('p', `${path.ideology} · ${path.region} · ${path.routeKind === 'event-choice' ? 'Event choice' : path.routeKind === 'focus-branch' ? 'Focus outcome' : path.routeKind === 'decision-branch' ? 'Decision outcome' : 'Game-rule route'}`), node('p', path.notes ?? ''));
      const url = safeSource(path.source);
      if (url) { const link = node('a', 'View official source ↗'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; info.append(link); }
      const control = node('div');
      const label = node('label', 'Run status');
      label.htmlFor = `status-${path.id}`;
      const select = node('select');
      select.id = label.htmlFor;
      select.dataset.pathId = path.id;
      select.setAttribute('aria-label', `${path.country} — ${path.name}: run status`);
      for (const status of STATUSES) select.add(new Option(STATUS_LABELS[status], status));
      select.value = progress[path.id] ?? 'unplayed';
      control.append(label, select);
      row.append(info, control);
      layer.append(row);
      }
      section.append(layer);
    }
    fragment.append(section);
  }
  for (const country of pending) {
    const section = node('section', undefined, 'country-group');
    const heading = node('h2', country.country); heading.append(node('span', country.tag));
    const flag = node('img'); flag.src = country.flag; flag.alt = `${country.country} flag`; flag.className = 'roster-flag';
    section.append(flag, heading, node('p', `${country.region} · Political paths awaiting review`, 'coverage-label'), node('p', country.startingCountry ? 'Available in 1936. No political outcome has been catalogued yet; this is not a claim that every country has a bespoke route.' : country.formationContext));
    if (country.contentStatus?.startsWith('No bespoke')) section.append(node('p', country.contentStatus));
    const source = safeSource(country.source);
    if (source) { const link = node('a', 'Official country source ↗'); link.href = source; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.append(link); }
    fragment.append(section);
  }
  $('checklist-list').replaceChildren(fragment);
  // Keep keyboard focus after replacing a changed row; filtered-out rows return to the search.
  if (activeId) ($(`status-${activeId}`) ?? $('search')).focus();
}
function renderStats() {
  const stats = summarize(records, progress);
  $('mini-progress').textContent = `${stats.completed} / ${stats.total} paths completed`;
  $('completion-fraction').textContent = `${stats.completed} / ${stats.total}`;
  $('completion-percent').textContent = `${stats.percent.toFixed(1)}%`;
  $('completion-bar').value = stats.percent;
  for (const status of STATUSES) $(`${status}-count`).textContent = stats[status];
  const known = new Set(records.map(path => path.id));
  const unknown = Object.keys(progress).filter(id => !known.has(id)).length;
  $('unknown-count').textContent = unknown ? `${unknown} saved ${unknown === 1 ? 'path is' : 'paths are'} outside this database. Preserved in your save and exports; excluded from these statistics.` : '';
}
function route(focus = false) {
  const id = location.hash.slice(1);
  const view = ['picker', 'checklist', 'progress', 'about'].includes(id) ? id : 'picker';
  for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== view;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === `#${view}`) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  if (focus) $(`${view}-heading`).focus({ preventScroll: true });
}

async function init() {
  try {
    const response = await fetch(new URL('../data/paths.json', import.meta.url));
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const data = readDataset(await response.json());
    const flagResponse = await fetch(new URL('../data/flag-variants.json', import.meta.url));
    if (!flagResponse.ok) throw new Error(`Flag data request failed: ${flagResponse.status}`);
    flagVariants = await flagResponse.json();
    for (const mapping of Object.values(flagVariants.countries)) for (const ideology of Object.keys(mapping)) mapping[ideology] = assetUrl(mapping[ideology]);
    for (const variant of Object.values(flagVariants.paths)) variant.flag = assetUrl(variant.flag);
    records = data.records.map(path => ({ ...path, flag: resolveFlag({ tag: path.tag, flag: assetUrl(path.flag) }, path.ideology, path.id, flagVariants).flag, icon: assetUrl(data.ideologies[path.ideology]?.icon), color: /^#[0-9a-f]{6}$/i.test(data.ideologies[path.ideology]?.color ?? '') ? data.ideologies[path.ideology].color : '#30373e' }));
    countries = data.countries.map(country => ({ ...country, flag: assetUrl(country.flag) }));
    const saved = storage.load();
    progress = saved.progress;
    protectCorruptSave = saved.corrupt;
    if (saved.error) warn(saved.corrupt ? 'The saved record is unreadable and has been left untouched. Export any new progress before resetting the damaged save.' : 'Progress cannot be saved in this browser. Export your progress before closing.');
    options($('region'), [...new Set(countries.map(country => country.region))].sort(), 'All regions');
    $('atlas-view').replaceChildren(...Object.keys(VIEWS).map(view => new Option(view === 'world' ? 'Whole world' : view, view)));
    options($('ideology'), [...new Set(records.map(path => path.ideology))].sort(), 'All ideologies');
    $('sample-summary').textContent = `${countries.filter(country => country.startingCountry).length} starting nations + ${countries.filter(country => !country.startingCountry).length} later nations · ${records.length} political options. Includes game-rule routes, focus outcomes and conditional event choices; these can overlap within a campaign.`;
    $('about-sample').textContent = `${records.filter(path => path.routeKind === 'game-rule').length} game-rule options, ${records.filter(path => path.routeKind === 'focus-branch').length} political focus outcomes and ${records.filter(path => path.routeKind === 'event-choice').length} event choices and ${records.filter(path => path.routeKind === 'decision-branch').length} decision outcomes. Later nations form through events, independence, release or unification and are labelled accordingly. The source audit traces country-specific effects and event recipients; it is not an in-game reachability proof. Dynamic scripts and unresolved source cases still require review. These options are not a count of mutually exclusive focus trees. Countries with no catalogued outcomes never become invented completion entries.`;
    $('data-version').textContent = `Kaiserreich data version: ${data.metadata.kaiserreichVersion}. Checked ${data.metadata.lastUpdated}.`;
    $('footer-version').textContent = `KR ${data.metadata.kaiserreichVersion}`;
    if (data.skipped) announce(`${data.skipped} disabled or invalid records were omitted from this collection.`);
    bindEvents();
    renderStats(); renderChecklist(); changeMode(); route();
    $('application').hidden = false;
  } catch (error) {
    console.error('Unable to initialize the path database:', error);
    $('load-error').hidden = false;
  } finally { $('loading').hidden = true; }
}

function bindEvents() {
  $('atlas-view').addEventListener('change', event => { atlas.view = event.target.value; renderResult(); });
  $('spin-motion').addEventListener('change', () => { if (spinning) { cancelSpin(); refreshEligibility(); renderResult(); announce('Animation setting changed. Spin again when ready.'); } });
  window.addEventListener('hashchange', () => route(true));
  for (const id of ['region', 'ideology', 'status-filter', 'availability', 'route-kind', 'exclude-completed', 'exclude-played']) {
    $(id).addEventListener('change', () => { result = null; refreshEligibility(); renderResult(); });
  }
  $('clear-filters').addEventListener('click', () => {
    for (const id of ['region', 'ideology', 'status-filter', 'availability', 'route-kind']) $(id).value = '';
    $('exclude-completed').checked = false; $('exclude-played').checked = false;
    result = null; selectedCountry = ''; selectedIdeology = ''; refreshEligibility(); renderResult(); announce('Filters cleared.');
  });
  document.querySelectorAll('input[name=mode]').forEach(input => input.addEventListener('change', changeMode));
  $('country').addEventListener('change', () => { selectedCountry = $('country').value; selectedIdeology = ''; result = null; refreshEligibility(); renderResult(); });
  $('country-ideology').addEventListener('change', () => { selectedIdeology = $('country-ideology').value; result = null; refreshEligibility(); renderResult(); });
  $('path-choice').addEventListener('change', () => {
    cancelSpin();
    result = pool().find(path => path.tag === selectedCountry && path.ideology === selectedIdeology && path.id === $('path-choice').value) || null;
    refreshEligibility(); reveal();
  });
  for (const kind of ['country', 'ideology', 'path', 'both']) $(`spin-${kind}`).addEventListener('click', () => spin(kind));
  $('wheel-spin').addEventListener('click', () => spin(defaultSpinKind()));
  $('start-run').addEventListener('click', () => { if (result) updateStatus(result.id, 'played'); });
  $('result-status').addEventListener('change', event => { if (result) updateStatus(result.id, event.target.value); });
  $('search').addEventListener('input', renderChecklist);
  $('browse-status').addEventListener('change', renderChecklist);
  $('checklist-list').addEventListener('change', event => {
    if (event.target.dataset.pathId) updateStatus(event.target.dataset.pathId, event.target.value);
  });
  $('export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportSave(progress)], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = 'kaiserreich-run-picker-progress.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Progress exported. Keep the JSON file as your backup.');
  });
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > MAX_SAVE_BYTES) throw new Error('Save is too large.');
      const imported = parseSave(await file.text());
      progress = { ...progress, ...imported };
      const saved = persist();
      renderStats(); renderChecklist(); refreshEligibility(); renderResult();
      announce(`Imported ${Object.keys(imported).length} path statuses. ${saved ? 'Saved in this browser.' : 'Session only; export to keep a backup.'} ${$('unknown-count').textContent}`);
    } catch { announce('This does not appear to be a valid Kaiserreich Run Picker save file (maximum 1 MB). Your progress was not changed.'); }
    finally { event.target.value = ''; }
  });
  $('reset').addEventListener('click', () => { $('reset-dialog').returnValue = ''; $('reset-dialog').showModal(); });
  $('reset-dialog').addEventListener('close', () => {
    if ($('reset-dialog').returnValue !== 'reset') return;
    const removed = storage.reset();
    if (!removed) { warn('The browser could not erase the stored record. Your progress has been kept. Allow site storage and try again.'); return; }
    progress = {}; protectCorruptSave = false; result = null; warn('');
    renderStats(); renderChecklist(); refreshEligibility(); renderResult(); announce('All saved progress has been reset.');
  });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const saved = storage.load();
    if (saved.error) { protectCorruptSave = true; warn('Progress changed in another tab but could not be read. Reload before editing.'); return; }
    progress = saved.progress; protectCorruptSave = false;
    renderStats(); renderChecklist(); refreshEligibility(); renderResult(); announce('Progress updated from another tab.');
  });
}
init();
