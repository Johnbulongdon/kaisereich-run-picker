# Maintainer tools

`serve.mjs` is an optional loopback-only static preview server. It supports `/kaisereich-run-picker/` to expose broken absolute asset links before deployment. It is not part of the production app.

`browser-check.mjs` runs the optional Playwright acceptance suite against that URL, including actual browser restart persistence. See the root README for installation and environment options. Screenshots and temporary browser profiles are QA artifacts, not source files.

## Future upstream update assistant (not implemented)

1. Inspect the current official `Kaiserreich/Kaiserreich-HOI4` repository and pin a commit/release.
2. Locate country tags, political game rules, relevant event/focus logic and English localization. Confirm paths rather than assuming old filenames.
3. Extract **candidate** additions/changes into a review report outside `data/paths.json`.
4. Review meaningful political playthroughs separately from AI behavior, diplomatic alignment, election timing, war outcomes and temporary states.
5. Reconcile candidates against existing stable IDs; propose migrations explicitly if needed.
6. Review prerequisites, ideology phase, availability and source references. Update curated JSON only after review.
7. Run validation/tests and submit a PR. Never automatically publish every game rule as a path.

The frontend reads only the curated dataset; it never fetches or parses upstream game scripts at runtime.
