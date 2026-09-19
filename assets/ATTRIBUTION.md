# Kaiserreich visual assets

Nation flags and ideology emblems are sourced from the official
[Kaiserreich/Kaiserreich-HOI4 repository](https://github.com/Kaiserreich/Kaiserreich-HOI4)
at commit `00f64443a8a3ec4ae0cc78179efade3cb41e1946` (Kaiserreich 1.6.4).

- `flags/<TAG>.png`: lossless PNG conversions of `gfx/flags/<TAG>.tga` for each of the 23 country tags listed in `data/paths.json`. These identify the starting nation; they do not claim to represent every later political flag.
- `ideologies/*.png`: images from `gfx/interface/goals/ideology_<ideology>.png`, converted to RGBA PNG without changing the artwork. These are the mod's ideology focus emblems.
- Ideology colors in `data/paths.json` use the exact RGB values from `common/ideologies/00_ideologies.txt` at the same commit.

These third-party assets remain the property of their respective creators. The application's MIT license does **not** grant rights to this artwork. No official endorsement is implied. The official source does not supply a blanket MIT license for these assets; consult the Kaiserreich creators before reusing them in other projects.

## Geographic base map

`world-land.svg` is a local equirectangular conversion of Natural Earth’s 1:110m land geometry, rounded to one SVG decimal place. [Source GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), retrieved 2026-09-19. Made with Natural Earth; this geometry is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). The map shows geographic coastlines only and does not represent Kaiserreich political borders.
