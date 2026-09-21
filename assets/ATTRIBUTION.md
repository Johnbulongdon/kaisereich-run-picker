# Kaiserreich visual assets

Nation flags and ideology emblems are sourced from the official
[Kaiserreich/Kaiserreich-HOI4 repository](https://github.com/Kaiserreich/Kaiserreich-HOI4)
at commit `00f64443a8a3ec4ae0cc78179efade3cb41e1946` (Kaiserreich 1.6.4).

- `flags/<TAG>.png`: lossless PNG conversions of the exact file recorded in each country's `flagSource` field in `data/paths.json`. Starting cosmetic and ideology variants are resolved from the pinned country-history files. These identify the starting nation; they do not claim to represent every later political flag.
- `ideologies/*.png`: images from `gfx/interface/goals/ideology_<ideology>.png`, converted to RGBA PNG without changing the artwork. These are the mod's ideology focus emblems.
- Ideology colors in `data/paths.json` use the exact RGB values from `common/ideologies/00_ideologies.txt` at the same commit.

These third-party assets remain the property of their respective creators. The application's MIT license does **not** grant rights to this artwork. No official endorsement is implied. The official source does not supply a blanket MIT license for these assets; consult the Kaiserreich creators before reusing them in other projects.

## Geographic base map

`world-land.svg` is a local equirectangular conversion of Natural Earth’s 1:110m land geometry, rounded to one SVG decimal place. [Source GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), retrieved 2026-09-19. Made with Natural Earth; this geometry is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). The map shows geographic coastlines only and does not represent Kaiserreich political borders.

Roster expansion: all 109 nation flags use the same pinned source snapshot. `flagSource` records cosmetic and ideology overrides (for example, `CAN_entente.tga`). CAN retains its stable display/save identity; the ownership manifest records the corresponding IMP source country.

The catalogue now bundles flags for 94 later nations in addition to the 109 starting nations. Each country’s `flagSource` in `data/paths.json` records its official upstream flag asset at the pinned commit. TGA originals were converted to PNG for browser display; government-specific variants may differ.

## Ideology and path flag variants

`flags/variants/<upstream-blob-sha>.png` contains 95 additional lossless conversions from the same pinned source. `data/flag-variants.json` maps each asset to its exact upstream TGA path and SHA, with 116 ideology mappings across 57 nations and 14 explicit path overrides. Identical upstream assets share one PNG. `scripts/import-flag-variants.py` uses exact ideology filenames and unconditional same-country cosmetic effects; conditional branches are not guessed. Path overrides take precedence, followed by ideology variants and the country reference flag. These assets remain under the upstream artwork terms above.
