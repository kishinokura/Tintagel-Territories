## [0.4.0] - 2025-10-21
### Added
- **Randomize EPs** button: instantly grants each participant a random EP in `[2..20]`. Does not start expansion. EPs carry over if unused.
- **Color in Active Player selector**: each option displays a color swatch; persistent dot beside the control mirrors the active player color.
- **DEVLOG file**: real, downloadable `DEVLOG_TTG.txt`. On code version bump, an entry is appended and the file is auto-offered.

### Changed
- Button order adjusted: `[Randomize EPs] [Start Expansion] [Finish Expansion] [Resolve Expansions]`.
- Periphery seeding logic clarified and made deterministic.

### Fixed
- None beyond UI instrumentation.

### Notes
- EP carry-over is inherent: EP is deducted only when a claim is queued; otherwise it persists across phases and months.
## [0.4.1] - 2025-10-21
### Added
- **Sidebar EP list**: numbered list of all fighters with live EP totals. Updates whenever EP changes via Randomize, manual award, or queued captures.
- **Home labels**: each fighter’s **home hex** shows their list number (1..N). Expansion captures are intentionally unlabeled.
- **Persistence**: home coordinates stored in save (`game.homes[playerId] = {q,r}`).

### Changed
- Drawing pipeline renders home-number overlays after ownership and queue layers.

### Notes
- EP carry-over unchanged: EP is only decremented when a claim is queued; otherwise it persists across phases and months.
## [0.4.2] - 2025-10-21
### Added
- **Numbered EP sidebar**: each fighter shows a colored number badge (1..N). Numbers match home labels on the map and the color matches the player color.
- **Sidebar EP submenu**: clicking any fighter opens a small menu with +1, +5, +10, or a custom amount. EP updates persist immediately and refresh the list, HUD, and active totals.

### Changed
- Clarified expansion cost in code path: claiming a neutral, adjacent hex **deducts exactly 1 EP** on queue.

### Notes
- EP carry-over unchanged. Home labels remain on the initial tiles only; expansions are intentionally unlabeled.
## [0.5.0] - 2025-10-21
### Added
- **Rounds system**: removed months/phases. Game tracks `currentRound` and `totalRounds` (set in setup). HUD shows `Round X / N`.
- **Save Round**: button saves a snapshot of the current game state to `localStorage` under `ttg_round_saves`.
- **EP submenu (edit/remove)**: popup now supports add and remove (`±1/±5/±10`) and **Set** to an exact value. EP is clamped at 0.

### Changed
- **Expansion cost**: queuing an expansion into a neutral, adjacent hex deducts **1 EP** immediately from the active player and updates the sidebar.
- **Home protection**: home hexes cannot be expanded into; attempts are ignored both during queue and on resolve.

### Notes
- Randomize EPs continues to carry over. Ownership resolution remains first-come by queue order.
## [0.6.0] - 2025-10-21
### Removed
- Top-bar **Active Player** selector. Player activation is done by clicking entries in the sidebar list (selected entry is highlighted).
- **EP award** input field in the header.

### Added
- **Phase label** shown in the HUD: `EP Award`, `Expansion`, `Resolve`, `Bidding`.
- **Auto round save**: after pressing **Resolve Expansions**, the phase switches to **Bidding**; when **Finish Bidding** is pressed, the round snapshot is saved automatically and the game advances to the next round.
- **Load Round** button opens a popup to select and load any saved round snapshot.

### Changed
- Sidebar click both **activates** the player and opens the EP editor. The active player’s row is visibly highlighted.
- EP costs, adjacency rule, and home-tile protection are unchanged and enforced on queue.
## [0.6.2] - 2025-10-21
### Fixed
- Disabled all board ownership changes outside **Expansion**. No more accidental recoloring pre-expansion.
- Participant selection is independent from the EP popup; any selected fighter can queue expansions.
- Phase and round labels made prominent: `Round X / N` and `Phase: <name>` always visible.
- Sidebar selection highlight strengthened with outline, background, and inset glow.

### Removed
- **Redraw Grid** button and related handlers.
## [0.7.0] - 2025-10-21
### Added
- Chain-claiming during **Expansion**: a player can claim tiles contiguous with any already-queued claim, provided the chain touches their territory. Neutral claim costs **1 EP** per tile.
- **Takeovers**: during Expansion, a player can target a tile owned by someone else at **2 EP** per queued takeover.
- **Contested claims** and **Bidding**: any hex claimed by multiple players becomes contested. In **Bidding**, select the fighter in the sidebar and click the highlighted contested hex to enter a bid. Highest unique bid wins and spends EP; others keep theirs. Ties revert to prior ownership (or remain neutral).
- **Connectivity purge**: after Resolve and Bidding, any tiles not connected to a player’s home are removed from their control.

### Changed
- Resolve now groups claims per-hex; single-claim tiles resolve immediately, others route to Bidding and are highlighted in yellow.
## [0.8.0] - 2025-10-21
### Added
- **Named games with isolated storage.** Each game has its own save (`ttg_game:<name>`), round history, and devlog namespace. UI: Game tag, New/Save/Load Game, and Load Round lists only snapshots for the currently open game.
- **EP Adjustment phase** restored as the start of each round. Sidebar EP editor works again; **Randomize EPs** is enabled only in this phase.
- **Bidding UX**: clicking a contested hex opens a bid popup labeled with the bidder’s name, clamps to available EP, and highlights all contestants in the sidebar.

### Unchanged
- Expansion rules: chain-claiming; neutral claim 1 EP; takeover 2 EP.
- Post-bidding connectivity purge and automatic per-round save.

## [0.9.0] - 2025-10-21
### Added
- Unified **Game Menu** subwindow containing: Save Game, New Game (with name + hex radius), Load Game list, and Load Round list for the current game.
- **EP edit restored**: during **EP Adjustment** phase, clicking a fighter opens the EP editor to add/remove/set EP. Randomize EPs remains a sub-option in this phase.
- **Phase highlighting**: current phase drives a prominent highlight on its buttons; buttons are slightly restyled for clarity.
- **Hex radius** field in New Game flow: configurable in both the overlay and the Game Menu’s create section. If omitted, auto-sizing remains in effect.

### Changed
- Header now uses a single **Game Menu** button; previous individual New/Save/Load/Load Round buttons consolidated.

### Unchanged
- Expansion rules, contested bidding workflow, per-game namespacing, autosave at end of round, and connectivity purge.
## [0.9.2] - 2025-10-21
### Fixed
- **EP editing:** clicking a fighter’s **name** always opens the EP submenu. Editing is permitted only during **EP Adjustment**; outside that phase the popup is read-only with a clear hint.
- **Bidding popup:** title shows ONLY the selected bidder’s name; removed extra contested info text from the window.
- **Bidding order enforced:** contested hexes must be bid in the exact order they were first claimed. The currently-required hex is highlighted more strongly; a small **Next Hex** button advances to the next contested tile.
## [0.9.4] - 2025-10-23
### Added
- **EP Tools submenu** under the EP Adjustment phase. Contains **Randomize EPs (2–20 each)**. Button appears enabled only during EP Adjustment and opens a small submenu.
- **Right-side Bidding Queue window** that lists all contested hexes in the exact order they must be resolved. Only the current item is clickable. Clicking it highlights that hex and opens the Bid popup for the active fighter if they are eligible.

### Changed
- Removed the standalone **Randomize EPs** top-level button; functionality moved into **EP Tools**.
- HUD updates keep the Bidding Queue window in sync with the current contested index and map highlight.

### Unchanged
- EP editing by clicking a fighter’s **name** works only during **EP Adjustment**. Reads are visible at all times.
- Bidding still requires each fighter to enter bids; finish with **Finish Bidding** to resolve and autosave.
## [0.9.5] - 2025-10-23
### Fixed
- EP editor now opens when clicking anywhere on a fighter row during **EP Adjustment**. Previously only clicks on the name span were handled, which could fail depending on target element.
- Popup elevation increased to ensure it isn’t hidden behind other elements.

### Added
- **Undo Last Selection** button during **Expansion** input. Removes the most recently queued hex for the active player and refunds the correct EP (1 for neutral claim, 2 for takeover). Button is enabled only when undo is possible.
## [0.9.6] - 2025-10-23
### Fixed
- EP editor opens reliably when clicking any fighter row during **EP Adjustment**; binding moved to LI elements and reattached on each render. Popup positioning and z-index hardened.

### Improved
- Bidding header now shows **Hex (q,r) — [Current Bidder] vs [Opponents]** and highlights the current bidder in the roster (`bidding-now`).
## [0.9.7] - 2025-10-23
### Changed
- “EP Tools” renamed to **EP Adjustment** in HUD and submenu title.

### Added
- EP Adjustment submenu now offers exactly two choices:
  - **Assign EP individually**: opens a fighter list; selecting a fighter opens the EP editor with add and set controls.
  - **Randomize EP**: same behavior as before.
- Assign EP list stays within EP Adjustment phase and updates labels live as EP values change.
## [0.9.8] - 2025-10-23
### Improved
- Bid popup title now emphasizes the **current bidder** and lists opponents with their current bids, e.g. `Hex (q,r) — CURRENT vs Alice (3), Bob (0)`.

### Fixed
- EP is now reliably deducted from the winning bidder when finishing Bidding. Added explicit numeric parsing, cap to current EP, and logging of before/after amounts.
## [0.9.9] - 2025-10-23
### Fixed
- Restored Expansion input after loading a game/round that was already in Expansion by syncing `expansionMode` on load and boot.
### Fixed
- Bid queue ordering now anchored to home base location: sorted by lowest home index among contestants, then distance from that home, then axial coordinates.
- Bid popup clarifies current bidder, EP cap, and opponents; title tinted with bidder color.
# CHANGELOG

## v0.10.0 — 2025-10-24
### Added
- Large-map support with adjustable **Home separation** and **Extra rows** beyond the home ring.
  - New start-overlay inputs: `Home separation` (default 10) and `Extra rows` (default 5).
  - New game menu fields mirror these for shell creation.
- Zoom system:
  - Buttons: **Fit**, **+**, **−**.
  - Mouse-wheel zoom centered on cursor.
  - Auto **Fit to view** on new game and when loading a game/round.
- Home-court hardening:
  - All 6 hexes surrounding each **home** become **hardened** for that home’s owner.
  - Non-owners pay **double EP** on hardened hexes: neutral claim = 2 EP, takeover = 4 EP.
  - **Undo** refunds the exact EP cost paid (hardened-aware).

### Changed
- Map sizing:
  - Final map radius = `homeRingRadius + extraRows` unless an explicit Hex radius override is provided.
  - Home placement uses step spacing along the outer ring derived from **Home separation**.
- Rendering and input are now scale-aware; all axial↔pixel math respects zoom and fit offsets.

### Saved Data
- New fields in save: `homeRingRadius`, `hardened`, and zoom-independent map values.
- Backward compatible: older saves load with sane defaults and without zoom assumptions.

### UI/UX
- Bid popup positions correctly over the focused contested hex at any zoom level.
- “Fit” re-centers and resets offsets without altering game state.

### Notes
- No pan yet by design; Fit recenters the map.
- No rule changes to bidding order or round flow.
## v0.11.1 — 2025-10-24
### Added
- `index.html`: inserted `<section id="legendBox" class="panel legend"></section>` in the sidebar for the in-game legend rendered by `game.js`.
## v0.11.2 — 2025-10-24
### Fixed
- **Reset Game** button now works with confirmation and clears the current game’s namespaces before reload.
- **Save Game** reliably persists the active game and updates the Game Menu header.

### Changed
- **Bidding order** is strictly the order tiles become contested. A tile’s conflict timestamp is the second-claim sequence, not the first. Sorting uses that value, then lowest contestant home index, then axial coords for stability.

### Unchanged
- All bidders still pay their bids; outposts still require ≥ 11 to change hands.
# CHANGELOG

## v0.12.1 — 2025-10-24
### Fixed
- EP now resets to **0** at the start of every round, including immediately after creating a new game.

### Improved
- Bid popup clearly lists all contestants and their current bids for the focused contested hex.

### Added
- **Aggressor-first bidding** for each contested hex:
  - Aggressor is the first player whose claim targeted an already-occupied state of that hex.
    - If the hex was neutral, the earliest claimant is non-aggressor; the next claimant becomes the aggressor.
    - If the hex was owned at the start of the round, the first takeover attempt is the aggressor.
  - Enforcement: no one can place a bid on a contested hex until the aggressor has entered their bid.

### Unchanged
- Contested hex order is still the order conflicts arise (the second-claim sequence), then tie-broken by home index and coordinates.
- End-of-game scoring popup with winner/tie logic remains.

---

## v0.12.0 — 2025-10-24
### Added
- Large-map support with adjustable **Home separation** and **Extra rows** beyond the home ring.
- Zoom system: **Fit**, **+**, **−**, and mouse-wheel zoom centered on cursor.
- Home-court hardening: all 6 hexes around each home are hardened; non-owners pay double EP to attack them.
- Fortify (double-click, 4 EP) and Fortified Outpost (triple-click, 10 EP; requires ≥11 to take; acts as an additional root for connectivity and expansion).
- Right-side **Bidding Queue** listing contested hexes in mandatory resolution order.
- End-of-game **Final Results** popup with winner or tie announcement.

### Changed
- Map sizing derived from home ring + extra rows unless radius override is provided.
- Rendering/input are scale-aware; “Fit” re-centers view.

### Saved Data
- `homeRingRadius`, `hardened`, `outposts`, bidding queue metadata.

### Notes
- Undo refunds exact EP spent including hardened/fortify/outpost costs.

(Older history omitted for brevity.)
## v0.12.2 — 2025-10-25
- Fix: Roster add regression prevented adding fighters and starting new games. Removed a stray, half-written `$btnAddSample10` listener that caused a script error before setup completed.
- Restored working handlers for:
  - Manual fighter add (`Add Fighter`).
  - Sample population (`Insert 10 Sample Fighters`).
- Verified start flow: adding/removing fighters, then starting a new game, all function as intended.
# CHANGELOG

## v0.12.3 — 2025-10-25
### Fixed
- EP hard reset to **0** at the start of every round is enforced via `startGame()` and `autoSaveAndAdvance()`. Verified for empty-expansion rounds and normal rounds alike.

### Changed
- **Bidding pays immediately:** when a bid is placed, the bidder’s EP is adjusted at once by the **delta** between the new bid and their previous bid on that hex. The bid input cap equals `current EP + previous bid`, allowing up-bids without soft-lock. Aggressor-first enforcement remains.
- Bid popup now shows EP cap that reflects immediate payment logic.

### Unchanged
- Bidding queue list opens at the start of Bidding and buttons unlock strictly in conflict order. Clicking the current item focuses the hex and opens the bid popup for eligible fighters.
# CHANGELOG

## v0.12.4 — 2025-10-25
### Fixed
- EP reset moved to **end-of-round only**. Participants now start a round at 0, you award EP during EP Adjustment, and any remaining EP is eliminated after resolving bidding and closing the round.
- Removed the redundant EP reset at the start of each round that caused Round 2 to zero out after distribution.

### Notes
- EP now zeros in both round-end paths: (a) normal flow after bidding, and (b) no-contest flow when Expansion resolves directly to the next round.
## v0.12.5 — 2025-10-25
### Added
- **Bidding Queue details:** Each contested hex in the right-side list now shows participant names with their current bids. Only the current item is actionable; still resolves in strict order.

- **Solo-positive bid refund (live):**
  - If exactly one contestant has a bid > 0 on a contested hex, that bidder immediately receives an EP refund equal to their bid so they can reuse EP on other contested hexes this phase.
  - If a second contestant later places any bid > 0 on that same hex, the refund is revoked immediately and the first bidder is charged. If they can’t cover the revocation, their bid is automatically reduced to the maximum affordable amount, and their EP is clamped at 0.

### Fixed
- **End-of-round EP burn:** Remaining EP is eliminated at round end after bidding resolution, and also in the no-contest advance path. Redundant paths hardened to prevent stragglers.

### Notes
- Bids still “pay as you type” via deltas; the refund system sits on top and adjusts balances safely.
- No change to bidding order, aggressor-first rule, outpost ≥ 11 rule, or connectivity purge.
## v0.12.5 — 2025-10-25
### Fixed
- Ensured **EP elimination at round end** executes on all code paths, including bidding and no-contest resolves.
### Added
- **Bidding Queue** now lists **contestant names** per hex at the start of Bidding for clarity.
- **Refund rule**: if any contestant bids 0 and another wins with a positive, unique bid, refund the winner’s bid EP immediately on resolution of that hex. EP is still zeroed when the round ends.
