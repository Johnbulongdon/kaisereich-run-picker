// A path's explicit cosmetic change takes priority over an ideology variant.
// Unknown or multi-outcome ideologies retain the nation's reference flag.
export function resolveFlag(country, ideology, pathId, variants = {}) {
  const pathFlag = pathId && variants.paths?.[pathId]?.flag;
  if (pathFlag) return { flag: pathFlag, kind: 'path' };
  const ideologyFlag = variants.countries?.[country?.tag]?.[ideology];
  if (ideologyFlag) return { flag: ideologyFlag, kind: 'ideology' };
  return { flag: country?.flag || '', kind: 'country' };
}
