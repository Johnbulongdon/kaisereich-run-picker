# Kaiserreich Run Picker — Engineering Handover

## 1. Project Overview

Repository: `Johnbulongdon/kaisereich-run-picker`

Build a free, open-source web application for players of the Hearts of Iron IV mod **Kaiserreich**.

The application helps players decide which country and political path to play next and tracks which country/path combinations they have already played or completed.

The core concept is:

**Kaiserreich Country + Political Path Randomizer + Completion Tracker**

The project should be deployable for free using GitHub Pages.

---

## 2. Product Goals

The application should allow users to:

1. Randomly select a Kaiserreich country.
2. Randomly select a valid political path for that country.
3. Select a political path/category first and randomly choose a country capable of that path.
4. Generate a completely random Country + Path combination.
5. Browse all available countries and paths.
6. Mark paths as:
   - Unplayed
   - Played
   - Completed
7. Exclude played/completed paths from future random selections.
8. Track overall completion progress.
9. Preserve progress after closing the website.
10. Export and import progress.
11. Work without accounts or a backend.

The application should eventually support the full set of meaningful playable Kaiserreich country paths.

---

## 3. Technical Philosophy

Keep V1 extremely lightweight.

Preferred stack:

- HTML
- CSS
- Vanilla JavaScript
- JSON
- Browser localStorage
- GitHub Pages

Do NOT introduce React, Vue, Next.js, databases, authentication, Node backend, or paid services unless there is a compelling technical reason.

The application should be usable as a static website.

No server should be required.

---

## 4. Data Architecture

Do NOT hard-code country/path information into UI components.

Keep game data separate from application logic.

Suggested structure:

    /
    ├── index.html
    ├── README.md
    ├── HANDOVER.md
    ├── LICENSE
    │
    ├── css/
    │   └── style.css
    │
    ├── js/
    │   ├── app.js
    │   ├── picker.js
    │   ├── tracker.js
    │   └── storage.js
    │
    ├── data/
    │   └── paths.json
    │
    └── scripts/
        └── README.md

Exact structure may be adjusted if there is a good reason.

---

## 5. Country/Path Data Model

Create a clean schema capable of supporting the entire mod.

Example:

    {
      "tag": "ARG",
      "country": "Argentina",
      "region": "South America",
      "startingCountry": true,
      "paths": [
        {
          "id": "ARG_CARLES",
          "name": "Manuel Carlés / Liga Patriótica",
          "ideology": "National Populist",
          "category": "Nationalist"
        },
        {
          "id": "ARG_GOU",
          "name": "GOU Military Government",
          "ideology": "Paternal Autocrat",
          "category": "Military"
        }
      ]
    }

Every path MUST have a stable unique ID.

Never use the displayed path name itself as the save identifier because names may change between Kaiserreich versions.

The schema should be extensible.

Potential future fields:

- leader
- ideology
- ideology group
- government type
- region
- subregion
- difficulty
- tags
- requires another country/path
- hidden path
- starting country
- releasable country
- notes
- Kaiserreich version
- source reference

Do not implement all of these in V1 unless needed.

---

## 6. Important Data Rule

Do NOT assume every Kaiserreich game rule represents a meaningful playable political path.

Kaiserreich source data contains:

- political paths
- sub-path choices
- diplomatic behavior
- AI behavior
- war outcomes
- scripted decisions
- country-specific settings
- temporary states
- revolters
- other non-playthrough choices

The eventual database should represent meaningful player playthroughs.

Architecture should therefore support:

**Kaiserreich source data → extraction/parsing → curated playable-path database**

Do not attempt to automatically populate the complete database during the first MVP unless reliable extraction is straightforward.

For the MVP, use a small representative sample dataset sufficient to test the application.

Do not invent uncertain Kaiserreich paths merely to populate the database.

---

# 7. Main Interface

The homepage should make the core function immediately obvious.

Suggested header:

# Kaiserreich Run Picker

Subtitle:

> Can't decide what to play next? Let fate decide.

Main mode selector:

    Country → Path
    Path → Country
    Fully Random

The exact wording/design can be improved.

---

# 8. Mode A — Country → Path

Flow:

1. User chooses or randomly spins a country.
2. Application displays that country.
3. User can then randomly select one of that country's available paths.

Example:

    ARGENTINA
    ARG

    ↓

    Manuel Carlés
    Liga Patriótica
    National Populist

Buttons:

    Spin Country
    Spin Path
    Randomize Both
    Start Run

If "Exclude completed" is active, completed paths should not be eligible.

---

# 9. Mode B — Path → Country

Allow the user to select a political category/ideology first.

Examples:

- National Populist
- Paternal Autocrat
- Authoritarian Democrat
- Social Conservative
- Market Liberal
- Social Liberal
- Social Democrat
- Radical Socialist
- Syndicalist
- Totalist

Then randomly select a country with at least one qualifying path.

Result should show:

    IDEOLOGY
    National Populist

    COUNTRY
    Argentina

    PATH
    Manuel Carlés / Liga Patriótica

This system should operate on actual path records, not merely the country's starting ideology.

---

# 10. Mode C — Fully Random

One action randomly selects an eligible Country + Path combination.

Example:

    YOUR NEXT RUN

    Argentina
    ARG

    Manuel Carlés / Liga Patriótica

    National Populist

    [Start Run]
    [Spin Again]

Every eligible Country + Path combination should have equal probability by default.

Important:

Do NOT first randomly select a country and then randomly select a path if this would unintentionally overweight countries with fewer paths.

For Fully Random mode, construct the list of eligible **path combinations** first and randomly choose from that list.

---

# 11. Filters

V1 should support:

### Region

Examples:

- Europe
- North America
- South America
- Africa
- Middle East
- Central Asia
- East Asia
- South Asia
- Southeast Asia
- Oceania

Use whatever region taxonomy best fits Kaiserreich.

### Ideology

Allow one or multiple ideology filters if practical.

### Progress

Options:

    All
    Unplayed
    Played
    Completed

Include:

    ☑ Exclude completed

Potential future filters:

- Major/minor
- Starting countries only
- Releasables
- Difficulty
- Recommended content
- Recently updated countries

Do not overbuild these for V1.

---

# 12. Progress Tracking

Each path should have one of three states:

    unplayed
    played
    completed

Default:

    unplayed

"Played" means the user has attempted the path.

"Completed" means the user considers the run finished.

Example:

    Argentina
    Manuel Carlés / Liga Patriótica

    Status:
    ○ Unplayed
    ○ Played
    ● Completed

Users must be able to change this manually at any time.

---

# 13. Start Run Behavior

When a user gets a result and clicks:

    Start Run

mark the path as:

    played

Do NOT automatically mark it completed.

Completion must always be manually selected.

---

# 14. Local Persistence

Use browser `localStorage`.

Progress should survive:

- page refresh
- browser restart
- computer restart

Suggested save structure:

    {
      "version": 1,
      "progress": {
        "ARG_CARLES": "completed",
        "GXC_CHEN": "played"
      }
    }

Do not store unnecessary application state.

Create a storage abstraction so the persistence system could eventually be replaced or supplemented by cloud synchronization.

---

# 15. Export Save

Users should be able to click:

    Export Progress

Generate/download a JSON file.

Example:

    kaiserreich-run-picker-progress.json

Example contents:

    {
      "schemaVersion": 1,
      "exportedAt": "...",
      "progress": {
        "ARG_CARLES": "completed",
        "GXC_CHEN": "played"
      }
    }

---

# 16. Import Save

Provide:

    Import Progress

User selects an exported JSON file.

Validate the file before applying it.

Do not allow malformed JSON to break the application.

If IDs exist in the save that no longer exist in the current database, preserve or safely ignore them rather than crashing.

Ideally warn:

    2 saved paths are no longer present in this version.

---

# 17. Reset Progress

Provide:

    Reset Progress

This is destructive.

Require explicit confirmation before deleting progress.

Example:

    This will erase all locally saved run progress.
    This cannot be undone unless you exported a backup.

    Cancel
    Reset

---

# 18. Progress Dashboard

Display overall statistics.

Example:

    37 / 284 paths completed
    13.0%

Also show:

    Completed: 37
    Played: 12
    Unplayed: 235

The numbers must be calculated dynamically from the database.

Potentially show a progress bar.

---

# 19. Browse / Checklist View

This is an important part of the product.

Provide a view where users can browse every country and its paths.

Example:

    ARGENTINA

    ✓ Manuel Carlés / Liga Patriótica
    ○ GOU Military Government
    ○ Democratic Argentina

    LIANGGUANG

    ◐ Chen Jiongming / Federalists
    ○ ...

Suggested visual meanings:

    ○ Unplayed
    ◐ Played
    ✓ Completed

Do not rely solely on color; status should remain understandable through text/iconography.

Users should be able to click a path and change its status.

Include search.

Searching:

    Argentina
    Carlés
    Federalist
    National Populist

should return appropriate results.

---

# 20. Randomization

Use JavaScript random selection for V1.

No cryptographic randomness is necessary.

However:

- filtering must happen BEFORE selection
- excluded paths must never be selected
- disabled/invalid records must never be selected
- Fully Random should operate on eligible path combinations

If no valid results exist, show a useful message instead of throwing an error.

Example:

    No unplayed paths match these filters.

    Clear filters

---

# 21. Spinner Animation

The concept is inspired by a spinner wheel, but functionality is more important than a literal wheel.

For MVP, a polished random-selection animation is sufficient.

Examples:

- rapidly cycling country names
- slowing down before selection
- card-flip/reveal animation

Do NOT spend excessive development time building complicated wheel physics.

Architecture should allow a literal visual wheel to be added later.

---

# 22. Design Direction

The interface should feel inspired by a strategy-game map/document interface without copying Kaiserreich or Paradox copyrighted artwork.

Desired qualities:

- clean
- historical
- slightly 1930s/1940s
- readable
- desktop-first but mobile-friendly
- restrained animation

Avoid:

- generic SaaS dashboard appearance
- excessive gradients
- huge rounded cards everywhere
- excessive animation
- clutter
- copyrighted game artwork unless licensing clearly permits it

Use system fonts or freely licensed web-safe assets.

---

# 23. Responsive Design

The website must work on:

- desktop
- tablet
- mobile

Primary use is likely desktop because users will often have HOI4 open.

Still ensure controls remain usable on phones.

---

# 24. Accessibility

Basic accessibility requirements:

- keyboard-accessible controls
- semantic HTML
- proper labels
- visible focus states
- reasonable contrast
- status must not depend exclusively on color
- buttons should have understandable names

---

# 25. GitHub Pages

The application must deploy successfully through GitHub Pages.

Do not require server-side functionality.

Avoid absolute paths that break when hosted at:

    /kaisereich-run-picker/

Use relative paths or determine the correct base path.

---

# 26. README

Create a useful README explaining:

- what Kaiserreich Run Picker is
- current project status
- features
- how to use it
- how progress storage works
- how to export/import progress
- how to run locally
- how to contribute
- data accuracy limitations
- attribution/disclaimer

Include a disclaimer that this is an unofficial community project and is not affiliated with the Kaiserreich development team or Paradox Interactive.

Do not imply official endorsement.

---

# 27. Open Source

Use the repository's existing license if one exists.

If no license exists, do not arbitrarily choose one without checking with the repository owner.

Keep code understandable for community contributors.

Avoid unnecessary dependencies.

---

# 28. Kaiserreich Data Sources

For future database construction, the primary source should be the current official/open Kaiserreich repository rather than old guides or wiki pages where possible.

Relevant upstream repository:

    Kaiserreich/Kaiserreich-HOI4

Potentially relevant files include:

    common/game_rules/game_rules_country_paths.txt

and country-tag definitions under:

    common/country_tags/

However, investigate the current upstream repository structure before implementing an extractor because file names/structure can change.

Do not scrape random third-party websites as the canonical database.

---

# 29. Future Data Update Tool

NOT required to complete the initial frontend MVP.

Eventually create a script capable of assisting maintainers with Kaiserreich updates.

Potential workflow:

    upstream Kaiserreich update
             ↓
    parser reads game rules / relevant files
             ↓
    identifies possible new/changed paths
             ↓
    generates candidate changes
             ↓
    maintainer reviews changes
             ↓
    curated paths.json updated

Important:

The parser should NOT automatically publish every detected game rule as a playable path.

Human review is required.

---

# 30. Versioning

Display somewhere unobtrusive:

    Kaiserreich data version: [version]

The data JSON should contain metadata.

Example:

    {
      "metadata": {
        "schemaVersion": 1,
        "kaiserreichVersion": "...",
        "lastUpdated": "..."
      },
      "countries": [...]
    }

This allows users to know which Kaiserreich release the picker represents.

---

# 31. Stable IDs and Save Compatibility

This is important.

Once a path receives an ID such as:

    ARG_CARLES

avoid changing that ID unnecessarily.

Display names can change without breaking saved progress.

If paths are renamed or reorganized, implement migration when appropriate.

Future schema versions should support save migration.

---

# 32. Sample MVP Data

Do not spend the first implementation phase manually creating hundreds of paths.

Populate enough representative data to prove that the system works.

Include countries with:

- one path
- multiple paths
- different ideologies
- different regions

Include at least Argentina and Liangguang as test examples.

Data should be clearly marked as incomplete/sample data until the full database has been verified.

Do not fabricate uncertain path information.

---

# 33. Suggested Application Navigation

Keep navigation simple.

Possible structure:

    PICK A RUN
    CHECKLIST
    PROGRESS
    ABOUT

"Pick a Run" is the default page.

Do not create unnecessary pages.

---

# 34. Error Handling

The application should fail gracefully.

Examples:

If paths.json cannot load:

    Unable to load Kaiserreich path data.

If filters return zero results:

    No paths match your current filters.

If localStorage is unavailable:

    Progress cannot be saved in this browser.

If import JSON is invalid:

    This does not appear to be a valid Kaiserreich Run Picker save file.

Never leave the user staring at a blank page because of an uncaught error.

---

# 35. Privacy

The MVP should require:

- no login
- no analytics
- no cookies
- no external database
- no personal information

Progress stays locally in the user's browser unless they explicitly export it.

Mention this in the README/About section.

---

# 36. Testing

At minimum test:

### Randomization

- correct country/path relationship
- filters correctly restrict results
- completed paths can be excluded
- zero-result filters handled

### Storage

- status persists after refresh
- changing status updates storage
- reset works
- export works
- import works
- malformed imports do not crash

### Checklist

- all database paths appear
- search works
- status can be changed

### Progress

- counts are accurate
- percentages are accurate

### GitHub Pages

- CSS loads
- JavaScript loads
- JSON loads
- navigation works
- refresh does not produce broken paths

---

# 37. MVP Acceptance Criteria

The MVP is complete when:

1. The application loads from GitHub Pages.
2. Country → Path works.
3. Path → Country works.
4. Fully Random works.
5. Region filtering works.
6. Ideology filtering works.
7. Completed paths can be excluded.
8. Users can mark paths Unplayed / Played / Completed.
9. Progress survives browser restart through localStorage.
10. Checklist view works.
11. Search works.
12. Overall completion statistics work.
13. Export progress works.
14. Import progress works.
15. Reset progress works.
16. Application works reasonably on desktop and mobile.
17. README contains setup/contribution information.
18. Sample data is clearly identified as incomplete.
19. No backend or paid service is required.
20. GitHub Pages deployment is documented/configured.

---

# 38. Things NOT to Build Yet

Do NOT build these during the initial MVP unless they are essentially free:

- user accounts
- cloud saves
- multiplayer
- Steam integration
- HOI4 save-file parsing
- achievements
- recommendation algorithms
- ratings
- comments
- backend database
- mobile application
- Windows EXE
- Electron application
- automatic upstream synchronization
- complicated wheel physics

Keep scope controlled.

---

# 39. Future Features

Design the code so these could be added later:

### Literal Spinner Wheel

Animated country/path wheel.

### Difficulty

Community or maintainer-assigned difficulty ratings.

### Run History

Example:

    Sep 2026
    Argentina — Carlés — Completed

### Favorites

Allow users to save interesting paths.

### Share Result

Generate something like:

    My next Kaiserreich run:
    🇦🇷 Argentina
    Manuel Carlés — National Populist

### Seeded Randomization

Allow friends to use the same seed and receive the same challenge.

### Challenge Mode

Examples:

    Random minor
    Random socialist
    Random monarchy
    Random Asia
    Random path I have never played

### Cloud Sync

Optional account-based synchronization only if the project eventually warrants backend infrastructure.

### Save Game Detection

Potential future local tool could inspect HOI4 saves and automatically identify played countries, but this is far outside MVP scope.

---

# 40. Development Workflow

Do NOT commit implementation directly to `main`.

Create a branch:

    codex/mvp

Implement the MVP there.

Use sensible incremental commits.

Example:

    feat: create base static application
    feat: add country path randomizer
    feat: add local progress tracking
    feat: add checklist
    feat: add progress import export
    docs: add project README

When implementation is ready:

1. run tests/checks
2. verify GitHub Pages compatibility
3. review changed files
4. open a pull request against `main`
5. summarize what was implemented
6. identify known limitations

Do NOT automatically merge the PR.

---

# 41. Instructions to Codex

You are implementing the first MVP of Kaiserreich Run Picker.

Before coding:

1. Inspect the repository.
2. Read this entire HANDOVER.md.
3. Check existing files and configuration.
4. Preserve useful existing work.
5. Create/use branch `codex/mvp`.
6. Make an implementation plan.

Then implement the MVP.

Prioritize:

1. correctness
2. maintainability
3. simplicity
4. usability
5. performance
6. visual polish

Do not overengineer.

When information about Kaiserreich paths is uncertain, do not invent it. Use clearly labeled sample data and leave full data population for the next stage.

The application must remain capable of running entirely as a static GitHub Pages website.

At completion:

- verify the application
- run available tests
- fix obvious issues
- update README
- open a PR against `main`
- provide a concise summary of implementation and remaining work

Do not merge the PR automatically.