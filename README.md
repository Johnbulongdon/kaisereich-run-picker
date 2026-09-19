# Kaiserreich Run Picker

A free, static country + political path randomizer and personal completion tracker for **Kaiserreich**, the Hearts of Iron IV mod.

**Status: complete starting-country roster for the pinned source snapshot; incomplete political-path coverage.** The app lists **109 starting nations** and **90 verified political paths across 35 of them**. The other **74 nations** are available for country discovery and clearly marked **Paths pending**. All ten ideologies are represented. It does not represent every path in these countries or the whole mod. The collection is checked against the official 1.6.4 source snapshot; it is not a guarantee of compatibility with every subsequent release.

## Features

- **Clickable campaign atlas:** coastlines, geographic flag anchors, regional views and accessible country buttons. Selecting a country prepares its path wheel; filter-ineligible markers are disabled. This is a geographic locator, not a Kaiserreich political-border map.
- **Campaign briefings:** a sourced political objective for each route and a separate optional country-specific challenge. These are suggestions for your run, not game achievements or automatic completion checks.

- **Country → Path:** choose or spin an eligible country, then spin one of its paths.
- **Path → Country:** choose an ideology, then draw a matching country–path record.
- **Fully random / Randomize both:** equal probability for each eligible country–path combination.
- **Interactive selection wheel:** nation flags and ideology emblems on equal eligible slices, a fixed pointer, and a visible 3.4-second slowing spin. The center button also works with the keyboard. Choose **Instant result · no motion** to skip the spin. Changing filters cancels a pending spin.
- Region, ideology and progress filters; independent exclusions for Played and Completed.
- Searchable checklist and manual Unplayed / Played / Completed statuses.
- Dynamic completion counts and percentage.
- Browser-local persistence, JSON export/import, and confirmed reset.
- Dark charcoal/muted-gold interface, official ideology colors, keyboard controls and visible focus states. Decorative reveals respect reduced motion; the explicit wheel animation selector controls the spin independently.

There is no build step, runtime dependency, account, backend, analytics, application cookie or paid service. Node is **only an optional development/test tool**, never a production server requirement.

## Use the app

1. Open **Pick a run** and select a mode.
2. Set any filters. In Path → Country, choose a political ideology first.
3. Draw a result and read its notes: some political routes occur after unification or later elections.
4. Click **Start run** to mark the path **Played**. This never marks it Completed.
5. Use the result’s status selector or **Checklist** to change status manually.

Country-only draws include nations with no verified routes. Ideology and progress filters require an actual matching verified route, so they exclude pending nations. Fully Random and Path → Country draw only verified routes. Empty path lists never create placeholder completion entries. Picker filters affect draws only. The checklist has independent search/status controls; the Progress view always counts the entire active database. With no eligible paths, the app explains the empty result and offers **Clear filters**. An ideology appears in the filter only when the dataset includes a path of that ideology.

**Randomization:** Spin country selects countries uniformly, and Spin path selects paths within the chosen country uniformly. Fully random, Randomize both and Path → Country select from a flat list of eligible path records. Countries with more paths therefore occupy more slots in those modes, while every path has equal probability.

## Local development

Serve the repository over HTTP; opening `index.html` through `file://` may block JSON/module loading.

With Node 22 or later:

```sh
npm start
```

Open **http://127.0.0.1:4173/kaisereich-run-picker/**. This preview deliberately supports the same project subpath as GitHub Pages. The root address also works. No `npm install` is needed.

Alternatively, use any static server, such as `python -m http.server 8000`, and open http://localhost:8000/.

## GitHub Pages

All HTML, CSS, JavaScript, JSON and favicon URLs are relative. Navigation uses URL fragments, so reloading Checklist or Progress requires no server rewrite. `.nojekyll` allows plain static publishing.

The included **Deploy GitHub Pages** workflow deploys after a push to `main`, or can be run manually for a review branch. It tests the application and uploads **only public application assets**; scripts, tests and the engineering handover are not published.

One-time repository setup:

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. After reviewing and merging the MVP PR, the push to `main` runs the deployment automatically. Alternatively, use **Actions → Deploy GitHub Pages → Run workflow**, selecting `codex/mvp`, to preview the unmerged implementation. If the `github-pages` environment restricts branches, allow the intended preview branch first.
4. Read the deployed URL from the workflow’s `github-pages` environment. The expected project URL is `https://johnbulongdon.github.io/kaisereich-run-picker/`.

The implementation PR is intentionally **not automatically merged**. Until Pages is enabled and a deployment succeeds, the expected URL should not be treated as a live deployment.

Branch-based publishing also works: choose **Deploy from a branch**, the desired branch and `/ (root)`. Do not enable both approaches. Branch publishing exposes all non-hidden repository files, while the supplied workflow publishes just the app assets.

## Progress and privacy

The key `kaiserreich-run-picker.progress` in `localStorage` stores a versioned map of stable path IDs to statuses. No names or personal information are stored. The record survives refresh and browser restart if site storage is available. It is scoped to the browser profile and website origin; localhost and GitHub Pages have separate records. Private browsing, clearing site data, changing browser profiles or moving devices can lose access to it. GitHub may collect hosting access logs under its own policies; the app itself has no telemetry.

In **Progress**:

- **Export progress** downloads `kaiserreich-run-picker-progress.json` with `schemaVersion`, `exportedAt` and `progress`.
- **Import progress** validates a JSON file (maximum 1 MB) before changing anything. It **merges** IDs, with imported statuses winning conflicts. Entries absent from the import remain untouched.
- IDs absent from the current database are retained, counted in a warning, and included in future exports. They do not count toward visible completion statistics.
- **Reset progress** requires explicit confirmation and erases the entire local record, including unknown IDs. Cancel and Escape leave it intact.

If localStorage fails, the app explains that changes are session-only and can still export them. A malformed existing save is not silently overwritten; export any new session progress, reset the damaged record, then reimport. Valid updates from other tabs are synchronized; simultaneous conflicting edits use last-write-wins browser storage, not collaborative merging.

`schemaVersion: 1` is current. The proposed legacy `{ "version": 1, "progress": { ... } }` envelope is accepted too. Unsupported versions and invalid statuses are rejected. Future schema changes need explicit migrations and tests.

## Structure

```text
index.html                    Accessible views and controls
css/style.css                 Responsive strategy-document styling
assets/                       Official nation flags and ideology emblems, with attribution
js/app.js                     DOM rendering and interaction orchestration
js/picker.js                  Data validation, filtering, random selection, search
js/tracker.js                 Status transitions and progress summaries
js/wheel.js                   SVG wheel rendering and exact result landing
js/atlas.js                   Geographic map and country selection
js/storage.js                 Versioned persistence and save validation
data/paths.json               Curated game data and source metadata
scripts/serve.mjs              Optional static preview server
scripts/browser-check.mjs      Optional browser acceptance suite
tests/core.test.js             Dependency-free logic and storage tests
HANDOVER.md                   Original engineering brief
.github/workflows/            CI checks and static Pages deployment
```

## Tests

```sh
npm test
```

The 16 core tests cover valid/invalid data, stable IDs, equal draw intervals, country relationships, combined filters, excluded statuses, empty pools, search, progress math, save compatibility, denied storage, reset and exact wheel landing angles. In restricted environments that block Node child processes, use `node --test --test-isolation=none`.

Optional browser acceptance checks require Playwright as a **development-only** tool:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
# In one terminal:
npm start
# In another:
node scripts/browser-check.mjs
```

Set `BROWSER_CHANNEL=msedge` or `chrome` to use an installed browser instead of downloading Chromium. `APP_URL` can point at a deployed URL, and `QA_OUTPUT` controls the screenshot directory. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation. The suite uses a new temporary browser profile, leaves it available for inspection, and never touches your normal browser progress.

The browser suite includes atlas selection, regional zoom, filtered markers, goal/source rendering and all three modes, persistence across an actual browser restart, searches, status updates, counts, downloads, imports, unknown IDs, malformed saves, reset cancellation/confirmation, subpath resources, navigation/refresh, reduced motion, storage failure and data-load errors. It checks all four views for horizontal overflow at 320, 390, 768 and 1440 pixels and checks 200% text size. Screenshots support visual review. Browser QA is optional locally; dependency-free core tests run in CI.

## Data accuracy and contribution

See [data/README.md](data/README.md) for the schema, source decisions and stable-ID rules. Add game data to JSON, never to UI code. Keep coverage explicitly incomplete until the intended full collection has been reviewed. A one-path country does **not** mean the country only has one playable path in the mod.

Use the [official Kaiserreich source repository](https://github.com/Kaiserreich/Kaiserreich-HOI4) as the primary source. Inspect current file locations and record the exact upstream commit. Political branches, diplomatic variants, AI rules, war outcomes and temporary regimes are not interchangeable. Review whether a candidate represents a meaningful player campaign; do not import every game rule.

For contributions:

1. Create a feature branch and keep changes focused.
2. Preserve existing path IDs when display names change; document migrations when IDs really must change.
3. Include source references and notes for prerequisites or uncertain classifications.
4. Run the core tests; use browser checks for interaction or layout changes.
5. Open a pull request explaining the behavior and validation.

Full political-path coverage and cloud sync remain future work. The starting roster is audited against all 1,125 state-history files; the checked-in ownership manifest and `scripts/audit-starting-roster.py` make the 109-country count reproducible. Canada retains its existing CAN display/save identity while the source uses IMP. The original handover deferred a literal wheel; one was added following the owner's visual-feedback request. See [scripts/README.md](scripts/README.md) for the future curation workflow.

## License and attribution

The repository’s existing [MIT License](LICENSE) is preserved for application code. Kaiserreich flags and ideology emblems are bundled at the owner's request and remain the property of their respective creators; they are **not** relicensed under MIT. See [asset attribution](assets/ATTRIBUTION.md) for exact upstream sources. Flags identify the starting nation rather than every later government. The interface uses system fonts and original CSS/SVG decoration.

**This is an unofficial community project and is not affiliated with or endorsed by the Kaiserreich development team or Paradox Interactive.**
