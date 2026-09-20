# Political route data

The collection contains 109 starting nations, 94 later nations and 3,294 political options, pinned to official Kaiserreich 1.6.4 commit `00f64443a8a3ec4ae0cc78179efade3cb41e1946`. Forty-two countries currently have no imported political options and remain available in country-only draws.

## What the count means

Game-rule entries are active, non-default options from included domestic political groups. Additional entries cover visible event choices, political focuses and decisions. This includes conditional coups, governments, elections, later elections and postwar outcomes. Separate groups can describe overlapping parts of one campaign; 3,294 is not a claim of 3,294 mutually exclusive focus trees. Random defaults, foreign-policy groups and war plans are excluded. Focus-tree-only routes and later successor nations are not comprehensively covered. Imported does not mean playtested.

`political-rule-coverage.json` lists the exact 170 groups and option keys included. `sourceKey`, `ruleGroup`, `ruleGroupName`, `sourceStatus` and the pinned source URL make every entry traceable. Display descriptions are drawn from official English game-rule localization, with references expanded and game formatting removed; they remain the work of the Kaiserreich contributors, not MIT application code. Requirements are retained. Generic multi-outcome options are labelled **Varies by branch** when a single ideology is not established, and have no invented ideology emblem. Single-ideology keys take precedence over introductory historical text.

The original 90 IDs are retained, preserving existing local progress. New IDs use the official option key without `RULE_OPTION_`. Rerunning the importer updates existing entries instead of duplicating them. The importer is for the pinned source and does not silently remove retired paths; future version upgrades require review and explicit save migration decisions.

```sh
python scripts/import-political-routes.py /path/to/Kaiserreich-HOI4
node --test
```

## Starting roster and geography

`starting-roster.json` records every initial territorial owner in the 1,125 state files at the pinned commit, with owned-state filenames and capital state IDs. System country AAA owns no territory and is excluded. Subjects are included. Canada maps upstream IMP to stable display tag CAN; Ottoman and later Turkish political rule groups both belong to starting tag TUR.

```sh
python scripts/audit-starting-roster.py /path/to/Kaiserreich-HOI4
```

Map anchors are approximate geographic locators, not borders or territorial claims. Nation flags represent the starting country, not every later government. Country challenges are player-made suggestions, not official achievements. All data and assets are bundled locally.

## Expanded political catalogue (21 September 2026)

The catalogue contains 203 nations: all 109 audited starting owners and 94 later nations. There are 3,294 political options: 1,039 game-rule options, 2,098 event choices, 149 focus outcomes and 8 decision outcomes. Use country availability and route-type filters to distinguish them. Options may overlap within a campaign; these are not 3,294 mutually exclusive focus trees.

The source importer examines 545 event, focus and decision files, follows scripted effects and traces event recipients using triggers and country-scoped calls. The pinned upstream snapshot is `00f64443a8a3ec4ae0cc78179efade3cb41e1946`. `data/source-inputs.json` records required source paths and upstream blob identities; `data/source-branch-audit.json` records imports and exclusions. It currently leaves 66 events with unresolved recipients and seven dynamic country aliases for review. There are no unresolved display strings among imported options. Static analysis does not establish in-game reachability or exhaustive coverage. Forty-two listed nations have no catalogued political outcome and never receive placeholder completion entries.

All 788 previously published route IDs remain valid for existing saves. Later nations have formation labels and their own bundled flags. Flag variants are references, not a claim that every government uses the same flag.
