import { readDataset, eligiblePaths, choose, countriesIn, searchPaths } from './picker.js';
import { setStatus, summarize, STATUSES, STATUS_LABELS } from './tracker.js';
import { createStorage, parseSave, exportSave, MAX_SAVE_BYTES, STORAGE_KEY } from './storage.js';

const $ = id => document.getElementById(id);
const storage = createStorage();
let records = [], progress = {}, result = null, selectedCountry = '', mode = 'country';
let protectCorruptSave = false;

function announce(message) { $('announcement').textContent = message; }
function warn(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = !message; }
function filters() {
  return { region: $('region').value, ideology: $('ideology').value, status: $('status-filter').value,
    excludeCompleted: $('exclude-completed').checked, excludePlayed: $('exclude-played').checked };
}
function pool() { return eligiblePaths(records, progress, filters()); }
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

function refreshEligibility() {
  const eligible = pool();
  const countries = countriesIn(eligible);
  if (!countries.some(country => country.tag === selectedCountry)) selectedCountry = '';
  options($('country'), countries.map(country => ({ label: country.country, value: country.tag })), 'Let fate choose');
  $('country').value = selectedCountry;
  $('eligible-count').textContent = `${eligible.length} eligible ${eligible.length === 1 ? 'path' : 'paths'} · ${countries.length} countries`;
  $('spin-country').disabled = !eligible.length;
  $('spin-path').disabled = !selectedCountry;
  $('spin-both').disabled = !eligible.length || (mode === 'ideology' && !$('ideology').value);
  if (result && !eligible.some(path => path.id === result.id)) result = null;
  if (!eligible.length) {
    $('result-country').textContent = 'No paths match.';
    $('result-path').textContent = 'Clear filters or include more progress states to draw again.';
  }
}

function renderResult() {
  $('result-actions').hidden = !result;
  $('result-ideology').hidden = !result;
  $('result-notes').hidden = !result?.notes;
  $('result-tag').textContent = result?.tag || selectedCountry || '—';
  $('result-region').textContent = result?.region || 'THE WORLD AWAITS';
  $('result-country').textContent = result?.country || countriesIn(records).find(country => country.tag === selectedCountry)?.country || 'A new history starts here.';
  $('result-path').textContent = result?.name || (selectedCountry ? 'Country selected. Spin a political path.' : 'Spin to discover your next campaign.');
  $('result-ideology').textContent = result?.ideology || '';
  $('result-notes').textContent = result?.notes || '';
  if (result) $('result-status').value = progress[result.id] ?? 'unplayed';
  if (!pool().length) {
    $('result-country').textContent = 'No paths match.';
    $('result-path').textContent = 'Clear filters or include more progress states to draw again.';
    $('result-tag').textContent = '—';
  }
}
function reveal() {
  renderResult();
  $('result-card').classList.remove('revealing');
  // Restart a short reveal; reduced-motion users receive the result immediately.
  void $('result-card').offsetWidth;
  $('result-card').classList.add('revealing');
  announce(result ? `${result.country} — ${result.name}. ${result.ideology}.` : `${$('result-country').textContent}. ${$('result-path').textContent}`);
}
function spin(kind) {
  const eligible = pool();
  if (kind === 'country') {
    selectedCountry = choose(countriesIn(eligible))?.tag ?? '';
    result = null;
  } else {
    if (mode === 'ideology' && !$('ideology').value) return announce('Choose a political ideology first.');
    result = choose(kind === 'path' ? eligible.filter(path => path.tag === selectedCountry) : eligible);
    selectedCountry = result?.tag ?? selectedCountry;
  }
  refreshEligibility();
  reveal();
}
function changeMode() {
  mode = document.querySelector('input[name=mode]:checked').value;
  result = null;
  selectedCountry = '';
  $('country-control').hidden = mode !== 'country';
  $('spin-country').hidden = mode !== 'country';
  $('spin-path').hidden = mode !== 'country';
  $('spin-both').textContent = mode === 'country' ? 'Randomize both ↻' : mode === 'ideology' ? 'Find a country & path ↻' : 'Spin a new run ↻';
  $('mode-help').textContent = mode === 'country' ? 'Pick a country first, then discover one of its eligible paths.' : mode === 'ideology' ? 'Choose a political ideology in the conditions, then draw a country and matching path.' : 'Every eligible country–path combination has an equal chance.';
  $('selection-footnote').textContent = mode === 'country' ? 'A country first. A political path second. Your next run awaits.' : 'Filters apply before the draw. Every matching path gets one slot.';
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
  const visible = searchPaths(eligiblePaths(records, progress, { status: $('browse-status').value }), $('search').value);
  $('browse-count').textContent = `${visible.length} of ${records.length} sample paths`;
  $('browse-empty').hidden = visible.length > 0;
  const fragment = document.createDocumentFragment();
  for (const country of countriesIn(visible)) {
    const section = node('section', undefined, 'country-group');
    const heading = node('h2', country.country);
    heading.append(node('span', country.tag));
    section.append(heading);
    for (const path of visible.filter(item => item.tag === country.tag)) {
      const row = node('div', undefined, 'path-row');
      const info = node('div');
      info.append(node('h3', path.name), node('p', `${path.ideology} · ${path.region}`), node('p', path.notes ?? ''));
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
      section.append(row);
    }
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
    records = data.records;
    const saved = storage.load();
    progress = saved.progress;
    protectCorruptSave = saved.corrupt;
    if (saved.error) warn(saved.corrupt ? 'The saved record is unreadable and has been left untouched. Export any new progress before resetting the damaged save.' : 'Progress cannot be saved in this browser. Export your progress before closing.');
    options($('region'), [...new Set(records.map(path => path.region))].sort(), 'All regions');
    options($('ideology'), [...new Set(records.map(path => path.ideology))].sort(), 'All ideologies');
    $('sample-summary').textContent = `${countriesIn(records).length} countries · ${records.length} paths. An incomplete collection for this first edition.`;
    $('about-sample').textContent = `This MVP contains ${records.length} paths across ${countriesIn(records).map(country => country.country).join(', ')}.`;
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
  window.addEventListener('hashchange', () => route(true));
  for (const id of ['region', 'ideology', 'status-filter', 'exclude-completed', 'exclude-played']) {
    $(id).addEventListener('change', () => { result = null; refreshEligibility(); renderResult(); });
  }
  $('clear-filters').addEventListener('click', () => {
    for (const id of ['region', 'ideology', 'status-filter']) $(id).value = '';
    $('exclude-completed').checked = false; $('exclude-played').checked = false;
    result = null; selectedCountry = ''; refreshEligibility(); renderResult(); announce('Filters cleared.');
  });
  document.querySelectorAll('input[name=mode]').forEach(input => input.addEventListener('change', changeMode));
  $('country').addEventListener('change', () => { selectedCountry = $('country').value; result = null; refreshEligibility(); renderResult(); });
  for (const kind of ['country', 'path', 'both']) $(`spin-${kind}`).addEventListener('click', () => spin(kind));
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
