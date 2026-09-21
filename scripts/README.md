# Maintainer tools

`serve.mjs` is an optional loopback-only preview server supporting the project subpath `/kaisereich-run-picker/`.

`browser-check.mjs` is the optional Playwright acceptance suite. It uses a separate browser profile for save/import/reset checks.

`audit-starting-roster.py` audits all starting territorial owners against a local checkout of the pinned upstream source.

`import-political-routes.py` imports active domestic political game-rule options for starting nations. It resolves localized references, retains prerequisites and stable IDs, excludes random/foreign-policy/war-plan groups, and records an exact coverage manifest. The extra election and constitutional groups are explicitly allowlisted in the script. It does not fabricate combinations across independent rule groups or claim focus-tree completeness. See `data/README.md` for scope and ideology handling.

For a new mod release, pin and inspect the source before importing. Review changed groups, source keys, prerequisites and ideology; make explicit migration decisions for removed or renamed entries. Run tests and review the PR before merging. No runtime upstream fetches are made by the app.

`import-source-branches.py <upstream-checkout>` adds visible political focus outcomes, event choices and decisions after the game-rule import. Supply every file in `data/source-inputs.json` from the pinned commit; missing files cause a fail-fast error before catalogue replacement. Run the starting-roster audit, game-rule importer, then source-branch importer. Review metadata and coverage manifests after regeneration. Country identity, availability, anchors and flag provenance live in `data/paths.json`. Dynamic-role entries retain explicit role prerequisites. The audit remains incomplete until unresolved recipients and reachability are reviewed.

`import-flag-variants.py <upstream-checkout> <flag-tree.json>` builds the flag selection manifest. The tree is a JSON array of `path`/`sha` entries for root `gfx/flags/*.tga` files from the same pinned commit. Convert each manifest asset’s TGA to RGBA PNG at its recorded local path (Pillow `Image.open(...).convert("RGBA").save(...)`). Assets are deduplicated by upstream blob SHA. Only direct unconditional same-country cosmetic effects, including unconditional scripted effects, qualify as path overrides. Conditional flag choices and changing campaign state are intentionally not inferred. Run the asset and resolver tests after regeneration.
