// Only enabled, structurally valid records ever enter the picker or dashboard.
export function readDataset(data) {
  if (data?.metadata?.schemaVersion !== 1 || !Array.isArray(data.countries)) {
    throw new Error('Unsupported path database.');
  }
  const ids = new Set();
  const records = [];
  let skipped = 0;
  for (const country of data.countries) {
    if (!country || country.enabled === false || !/^[A-Z0-9]{3}$/.test(country.tag ?? '') ||
        ![country.tag, country.country, country.region].every(x => typeof x === 'string' && x.trim()) || !Array.isArray(country.paths)) {
      skipped++;
      continue;
    }
    for (const path of country.paths) {
      if (!path || path.enabled === false || typeof path.id !== 'string' || !/^[A-Z0-9_]+$/.test(path.id) ||
          ![path.name, path.ideology, path.category].every(x => typeof x === 'string' && x.trim())) {
        skipped++;
        continue;
      }
      if (ids.has(path.id)) throw new Error(`Duplicate path ID: ${path.id}`);
      ids.add(path.id);
      records.push({ ...path, tag: country.tag, country: country.country, region: country.region, startingCountry: country.startingCountry, formationContext: country.formationContext, flag: path.flag ?? country.flag, location: country.location, challenge: country.challenge });
    }
  }
  if (!records.length) throw new Error('No valid paths in the database.');
  return { records, countries: data.countries.filter(country => country.enabled !== false && /^[A-Z0-9]{3}$/.test(country.tag) && typeof country.country === 'string' && typeof country.region === 'string' && Array.isArray(country.paths)), skipped, metadata: data.metadata, ideologies: data.ideologies ?? {} };
}

// Country discovery includes nations whose routes have not yet been reviewed.
// Path-specific filters require a real matching route, never a placeholder.
export function eligibleCountries(countries, records, progress = {}, filters = {}) {
  const matching = new Set(eligiblePaths(records, progress, filters).map(path => path.tag));
  const pathFilter = filters.ideology || filters.status || filters.excludeCompleted || filters.excludePlayed || filters.routeKind;
  return countries.filter(country => (!filters.region || country.region === filters.region) &&
    (!filters.country || country.tag === filters.country) && (!filters.availability || (filters.availability === 'starting') === country.startingCountry) && (!pathFilter || matching.has(country.tag)));
}

export function eligiblePaths(records, progress = {}, filters = {}) {
  return records.filter(path => {
    const status = progress[path.id] ?? 'unplayed';
    return (!filters.region || path.region === filters.region) &&
      (!filters.availability || (filters.availability === 'starting') === path.startingCountry) &&
      (!filters.routeKind || path.routeKind === filters.routeKind) &&
      (!filters.ideology || path.ideology === filters.ideology) &&
      (!filters.country || path.tag === filters.country) &&
      (!filters.status || status === filters.status) &&
      (!filters.excludeCompleted || status !== 'completed') &&
      (!filters.excludePlayed || status !== 'played');
  });
}

// Fully random samples this flat array, giving each eligible path one slot.
export function choose(items, random = Math.random) {
  return items.length ? items[Math.floor(random() * items.length)] : null;
}

export function countriesIn(records) {
  return [...new Map(records.map(path => [path.tag, { tag: path.tag, country: path.country }])).values()];
}

export function searchPaths(records, query) {
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = normalize(query).trim().split(/\s+/);
  return records.filter(path => {
    const text = normalize([path.country, path.tag, path.name, path.ideology, path.category].join(' '));
    return terms.every(term => text.includes(term));
  });
}
