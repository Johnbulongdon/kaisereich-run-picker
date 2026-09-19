# Curated campaign data

Current coverage: **109 starting countries, 90 verified paths across 35 countries**, checked against Kaiserreich **1.6.4** at commit `00f64443a8a3ec4ae0cc78179efade3cb41e1946` on 2026-09-19. This is a curated incomplete collection, not exhaustive mod coverage or exhaustive coverage of those countries.

## Schema version 1

Top level:

- `metadata`: `schemaVersion`, `kaiserreichVersion`, `lastUpdated`, `sample`, `upstreamCommit`, `source`, `notes`.
- `countries`: array of country records, each with `tag`, `country`, `region`, `startingCountry`, `paths`, `location` as [longitude, latitude], `challenge` as an optional player-made goal, optional local `flag` PNG path and `enabled`.
- Each path: stable `id`, display `name`, `ideology`, `category`, optional `shortName` for the wheel, `notes`, `source`, `sourceKey`, `objectives` as a list of source-backed political objectives, `flag` override and `enabled`.
- `ideologies`: a display-name-keyed map of exact upstream hex `color` values and local `icon` PNG paths. All optional image paths must be inside `./assets/`. Missing visual metadata falls back to labels and a neutral slice.

IDs use uppercase letters, digits and underscores. Preserve IDs across renames. The app uses the ID only for progress, not display names. IDs must be globally unique; duplicates reject the database to avoid ambiguous saves. Disabled and invalid records are omitted from draws, checklist and completion totals. An empty/unsupported database shows a recoverable load error. Unknown saved IDs survive dataset changes and exports.

An ideology identifies the featured phase of the route, not necessarily the starting country's ideology or every phase of a long campaign. Where a route changes ideology, explain that in notes. `category` is available to search but does not add another filtering taxonomy in V1. Additional optional fields may be added without changing the save format; incompatible database/save changes require explicit schema migrations.

## Review decisions

Primary references at the pinned commit:

- [Country path game rules](https://github.com/Kaiserreich/Kaiserreich-HOI4/blob/00f64443a8a3ec4ae0cc78179efade3cb41e1946/common/game_rules/game_rules_country_paths.txt)
- [English game-rule descriptions](https://github.com/Kaiserreich/Kaiserreich-HOI4/blob/00f64443a8a3ec4ae0cc78179efade3cb41e1946/localisation/english/KR_common/Game%20Rules%20l_english.yml)

| Stable ID | Source key | Scope / curation decision |
| --- | --- | --- |
| `ARG_CARLES` | `RULE_OPTION_ARG_PATH_NATPOP` | Carlés and Liga Patriótica political route. |
| `ARG_GOU` | `RULE_OPTION_ARG_PATH_RAMIREZ_PATAUT` | Ramírez / GOU junta. Neutrality versus joining Germany is diplomatic behavior, grouped into one political route. |
| `GXC_FEDERALIST_SOCDEM` | `RULE_OPTION_GXC_UPC_PATH_FIRST_SOCDEM` | Federalist China / Zhang Junmai. Requires independent Liangguang to unify China before the featured elections; not a starting ideology claim. First/second-election variants are not duplicated as separate sample campaigns. |
| `CAN_LIBERALS` | `RULE_OPTION_CAN_PATH_MARLIB` | Mackenzie King's 1936 Liberal route. Market Liberal describes its early phase; source notes a later Social Liberal tendency. |
| `CAN_CONSERVATIVES` | `RULE_OPTION_CAN_PATH_SOCCON` | Robert Manion's moderate Conservative electoral route. |

These descriptions are concise summaries, not copied game scripts. Source keys make follow-up review possible. No automatic extraction or in-game playtesting has been claimed. Treat additions and changed prerequisites as review work before expanding coverage.

## Atlas expansion

The original five IDs are unchanged. Added selected political routes for Mexico, Brazil, the Commune of France, the Union of Britain, Germany, Russia, Japan, Australasia, Norway, Sweden, Finland, Serbia, Romania, Bulgaria, Egypt, Persia, Ireland, Portugal, Switzerland and the Socialist Republic of Italy. Each added route includes its exact official game-rule key. These are manually reviewed choices, not an exhaustive import of game rules.

Objectives paraphrase the political outcome and major prerequisites in the pinned official descriptions. They are not step-by-step walkthroughs. Temporary regimes (such as Mannerheim) and post-unification or postwar routes are marked in the notes. Country-level optional challenges are original suggestions, not claims about official achievements.

Map anchors are approximate geographic reference points for the starting country. They are not territory centroids or territorial claims. Flag displacement and leader lines keep nearby countries distinguishable. The map never draws modern or invented Kaiserreich political borders. All data and assets are bundled locally.

## Complete starting roster, partial route coverage

`starting-roster.json` records every initial territorial owner in the 1,125 state files at the pinned commit, along with owned-state filenames and capital state IDs. There are 109 unique tags; system country AAA owns no territory and is excluded. Later releasable nations are outside this starting-country scope. Subjects are included. The source bookmark omits some countries without bespoke content, so its featured-country list alone is insufficient. Canada uses upstream tag IMP, mapped to the existing CAN display identity without changing saved path IDs.

Each country has `sourceTag`, a pinned country-history `source`, `pathCoverage` (partial or pending), and `contentStatus`. All 35 countries with verified routes remain partial; the 74 others have empty `paths` arrays. Empty arrays are intentional and must never be padded with invented political routes. Geography uses approximate locator anchors.

To reproduce the territorial roster against a local checkout of the recorded commit:

```sh
python scripts/audit-starting-roster.py /path/to/Kaiserreich-HOI4
```

The expansion adds 24 reviewed routes for the Ottoman Empire, United States, Qing, Bharatiya People’s Republic, Dominion of India, French Republic, Chile, Denmark, Netherlands, Lithuania, Flanders-Wallonia and Ukraine. Prerequisites include post-unification Indian elections, the US civil-war settlement and Belgian independence; these are retained in each route’s notes.
