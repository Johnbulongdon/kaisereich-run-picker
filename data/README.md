# Curated sample data

Current coverage: **3 countries, 5 paths**, checked against Kaiserreich **1.6.4** at commit `00f64443a8a3ec4ae0cc78179efade3cb41e1946` on 2026-09-18. This is a deliberately incomplete MVP sample, not exhaustive mod coverage or exhaustive coverage of those countries.

## Schema version 1

Top level:

- `metadata`: `schemaVersion`, `kaiserreichVersion`, `lastUpdated`, `sample`, `upstreamCommit`, `source`, `notes`.
- `countries`: array of country records, each with `tag`, `country`, `region`, `startingCountry`, `paths` and optional `enabled`.
- Each path: stable `id`, display `name`, `ideology`, `category`, optional `notes`, `source`, `sourceKey` and `enabled`.

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
