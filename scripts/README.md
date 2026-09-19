# Maintainer tools

`serve.mjs` is an optional loopback-only preview server supporting the project subpath `/kaisereich-run-picker/`.

`browser-check.mjs` is the optional Playwright acceptance suite. It uses a separate browser profile for save/import/reset checks.

`audit-starting-roster.py` audits all starting territorial owners against a local checkout of the pinned upstream source.

`import-political-routes.py` imports active domestic political game-rule options for starting nations. It resolves localized references, retains prerequisites and stable IDs, excludes random/foreign-policy/war-plan groups, and records an exact coverage manifest. The extra election and constitutional groups are explicitly allowlisted in the script. It does not fabricate combinations across independent rule groups or claim focus-tree completeness. See `data/README.md` for scope and ideology handling.

For a new mod release, pin and inspect the source before importing. Review changed groups, source keys, prerequisites and ideology; make explicit migration decisions for removed or renamed entries. Run tests and review the PR before merging. No runtime upstream fetches are made by the app.
