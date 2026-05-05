# Pickleball Round Robin — Comprehensive Test Plan

**App:** Pickleball Round Robin  
**Version:** Angular 20, Angular Material M3  
**Base URL:** http://localhost:4200/roundrobin (local) | https://workcontrolgit.github.io/roundrobin/ (production)  
**Date:** 2026-05-05  
**Scope:** Functional, boundary, negative, accessibility, and persistence testing across all 4 tabs plus the Share dialog.

---

## Testing Conventions

- Each scenario is **independent** — start from a fresh browser state (clear localStorage, no URL hash) unless the scenario explicitly sets up prior state.
- **Fresh state** = navigate to the base URL with no hash, clear localStorage via DevTools > Application > Storage > Clear site data.
- Steps are written so any tester can follow them without prior app knowledge.
- **Expected results** are marked in bold.
- Negative tests use the label `[NEGATIVE]`.
- Boundary tests use the label `[BOUNDARY]`.
- Accessibility tests use the label `[A11Y]`.

---

## 1. Players Tab

### 1.1 — Initial Empty State

**Precondition:** Fresh state (0 players).

1. Navigate to the app.
2. Click the **Players** tab.
3. Observe the heading, player count badge, input field, Add button, and Generate Schedule button.

**Expected:**
- Heading reads "Players".
- Counter badge shows **0 / 11**.
- "Player name" input is visible and empty.
- **Add** button is **disabled** (input is empty).
- **Generate Schedule** button is **not visible** (fewer than 8 players).
- Placeholder message "Add 8–11 players to get started." is displayed.

---

### 1.2 — Add First Player via Button Click

**Precondition:** Fresh state.

1. Click the "Player name" input.
2. Type `Alice`.
3. Click the **Add** button.

**Expected:**
- Input clears after adding.
- Player list shows **1. Alice** with a remove (×) button.
- Counter badge updates to **1 / 11**.
- Message "Add 7 more player(s) to generate schedule" is visible.
- **Generate Schedule** button remains hidden.

---

### 1.3 — Add Player via Enter Key

**Precondition:** Fresh state.

1. Click the "Player name" input.
2. Type `Bob`.
3. Press **Enter**.

**Expected:**
- `Bob` is added to the player list.
- Input field clears.
- Counter badge updates to **1 / 11**.

---

### 1.4 — Add Button Disabled with Empty Input

**Precondition:** 1 player already added.

1. Ensure the "Player name" input is empty.
2. Observe the **Add** button.

**Expected:**
- **Add** button is **disabled**.

---

### 1.5 — Add Button Disabled with Whitespace-Only Input

**Precondition:** Fresh state.  
`[NEGATIVE]`

1. Click the "Player name" input.
2. Type three spaces (e.g., `   `).
3. Observe the **Add** button.

**Expected:**
- **Add** button remains **disabled** (whitespace-only names are rejected via `.trim()`).

---

### 1.6 — Add 8 Players — Generate Schedule Button Appears

**Precondition:** Fresh state.

1. Add 8 players with distinct names (e.g., Alice through Hank).
2. Observe the UI after the 8th player is added.

**Expected:**
- Counter badge shows **8 / 11**.
- **Generate Schedule (8 players · 2 courts)** button appears at the bottom.
- "Add X more player(s)" message disappears.
- All 8 players appear in numbered list order.

---

### 1.7 — Add Maximum 11 Players

**Precondition:** Fresh state.  
`[BOUNDARY]`

1. Add 11 players (e.g., Alice through Kylie).
2. Observe the state after the 11th player.
3. Type a 12th name in the input (e.g., "Lara").
4. Observe the **Add** button.

**Expected:**
- Counter badge shows **11 / 11**.
- **Add** button is **disabled** even with a name typed.
- No 12th player can be added.
- **Generate Schedule (11 players · 2 courts)** button is visible.

---

### 1.8 — Remove a Player

**Precondition:** 3 players added (Alice, Bob, Charlie).

1. Click the **×** (remove) button next to **Bob**.
2. Observe the player list.

**Expected:**
- Bob is removed from the list.
- Counter badge updates to **2 / 11**.
- Remaining players are renumbered (1. Alice, 2. Charlie).

---

### 1.9 — Remove Player Drops Below 8 Hides Generate Button

**Precondition:** Exactly 8 players added.  
`[BOUNDARY]`

1. Click the **×** remove button on any player.
2. Observe the Generate Schedule button.

**Expected:**
- **Generate Schedule** button **disappears**.
- Counter badge shows **7 / 11**.
- Message "Add 1 more player(s) to generate schedule" reappears.

---

### 1.10 — Player Name Maximum Length (30 characters)

**Precondition:** Fresh state.  
`[BOUNDARY]`

1. In the "Player name" input, type exactly 31 characters (e.g., `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`).
2. Observe the input value length.
3. Click **Add**.

**Expected:**
- Input enforces `maxlength="30"` — only 30 characters are accepted.
- The player is added with 30-character name if Add is enabled.

---

### 1.11 — Generate Schedule with Confirmation on Existing Schedule

**Precondition:** 8 players added and schedule already generated.

1. Click **Generate Schedule** again.
2. A browser `confirm()` dialog appears: "This will clear the existing schedule and all scores. Continue?"
3. Click **Cancel**.

**Expected:**
- Dialog dismisses.
- Existing schedule is **not cleared** — rounds remain intact.

4. Click **Generate Schedule** again.
5. Click **OK** in the confirm dialog.

**Expected:**
- A **new schedule** is generated.
- All previous scores are cleared.

---

### 1.12 — Counter Badge Color Changes at 8+ Players

**Precondition:** Fresh state.

1. Add 7 players. Observe the badge color.
2. Add 1 more player (8 total). Observe the badge color.

**Expected:**
- With fewer than 8 players: badge shows `badge-upcoming` styling (muted/grey appearance).
- With 8 or more players: badge shows `badge-completed` styling (green/accent appearance).

---

### 1.13 — Players Tab in Read-Only Mode

**Precondition:** Navigate to the app with a valid URL hash (see Section 7 for setup).

1. Click the **Players** tab.
2. Observe the UI.

**Expected:**
- "Player name" input is **not visible**.
- **Add** button is **not visible**.
- **Generate Schedule** button is **not visible**.
- Remove (×) buttons are **not visible** next to player names.
- Players are displayed in read-only list format.

---

### 1.14 — Persistence: Players Survive Page Reload

**Precondition:** 3 players added.

1. Add Alice, Bob, Charlie to the player list.
2. Reload the page (F5 / Ctrl+R).
3. Click the **Players** tab.

**Expected:**
- All 3 players (Alice, Bob, Charlie) are still listed.
- Counter badge correctly reflects 3 / 11.

---

## 2. Schedule Tab

### 2.1 — Schedule Tab Empty State (No Schedule Generated)

**Precondition:** Fresh state with 0–7 players (no schedule generated).

1. Click the **Schedule** tab.

**Expected:**
- Message: "Add 8–11 players on the Players tab and generate a schedule."
- No round cards are displayed.

---

### 2.2 — Schedule Generated for 8 Players (No Sit-Outs)

**Precondition:** 8 players added and schedule generated.

1. Click the **Schedule** tab.

**Expected:**
- **7 rounds** are displayed (minimum for 8 players).
- **Round 1** has status badge **NOW** with highlighted border.
- Rounds 2–7 have status badge **UPCOMING**.
- Each round shows exactly **2 courts** (Court 1 and Court 2).
- Each court lists 2 team names (e.g., "Alice & Bob vs Charlie & Diana").
- **No "Sitting out:" line** is shown for any round (all 8 play each round).

---

### 2.3 — Schedule Generated for 9 Players (1 Sit-Out Per Round)

**Precondition:** 9 players added and schedule generated.

1. Click the **Schedule** tab.

**Expected:**
- **9 rounds** are generated.
- Each round shows a **"Sitting out: [PlayerName]"** line below the courts.
- Sit-out players rotate fairly across rounds.

---

### 2.4 — Schedule Generated for 10 Players (2 Sit-Outs Per Round)

**Precondition:** 10 players added and schedule generated.

1. Click the **Schedule** tab.

**Expected:**
- **10 rounds** are generated.
- Each round shows **"Sitting out: [Name], [Name]"** with 2 names.

---

### 2.5 — Schedule Generated for 11 Players (3 Sit-Outs Per Round)

**Precondition:** 11 players added and schedule generated.  
`[BOUNDARY]`

1. Click the **Schedule** tab.

**Expected:**
- **11 rounds** are generated.
- Each round shows **"Sitting out: [Name], [Name], [Name]"** with 3 names.

---

### 2.6 — Round Status Transitions: NOW → COMPLETED After Scoring

**Precondition:** 8 players, schedule generated, on Scores tab.

1. On the **Scores** tab, enter scores for both courts of Round 1 and save them.
2. Switch to the **Schedule** tab.

**Expected:**
- **Round 1** now shows badge **COMPLETED** (no longer NOW).
- **Round 2** now shows badge **NOW**.
- Rounds 3–7 remain **UPCOMING**.
- Round 1 courts display the saved scores inline (e.g., "11–7").

---

### 2.7 — Score Display in Schedule After Saving

**Precondition:** Round 1 scores saved (e.g., Court 1: 11–7, Court 2: 9–11).

1. Click the **Schedule** tab.
2. Observe Round 1.

**Expected:**
- Court 1 shows: `Alice & Bob **11–7** Charlie & Diana` (score replaces "vs").
- Court 2 shows: `Eve & Frank **9–11** Grace & Hank`.

---

### 2.8 — All Rounds COMPLETED When All Scores Entered

**Precondition:** All 7 rounds scored on Scores tab.

1. Click the **Schedule** tab.

**Expected:**
- All 7 rounds show badge **COMPLETED**.
- No round shows **NOW** or **UPCOMING**.
- Round 8 does not exist (only 7 rounds generated for 8 players).

---

### 2.9 — Player Names Display Correctly

**Precondition:** Players with recognizable names added; schedule generated.

1. Click the **Schedule** tab.
2. Verify that player IDs are not shown — only names.

**Expected:**
- All team assignments show player **names** (not UUID-format IDs).
- Sitting-out section shows player names, comma-separated.

---

## 3. Scores Tab

### 3.1 — Scores Tab Empty State (No Schedule)

**Precondition:** Fresh state, no schedule generated.

1. Click the **Scores** tab.

**Expected:**
- Message: "Generate a schedule first."
- No round cards displayed.

---

### 3.2 — Active Round Shows Score Input Fields

**Precondition:** 8 players, schedule generated.

1. Click the **Scores** tab.
2. Observe Round 1 (the active round).

**Expected:**
- Round 1 card has a highlighted border (active state).
- **Court 1** shows: player names + two number inputs + disabled **"Save Court 1 Score"** button.
- **Court 2** shows: same layout with its own disabled **"Save Court 2 Score"** button.
- Both Save buttons are **disabled** until both score fields have values.
- Rounds 2–7 show teams as plain text (no inputs), since they are upcoming.

---

### 3.3 — Save Button Enables When Both Scores Entered

**Precondition:** Round 1 is active on Scores tab.

1. Enter `11` in the Court 1 Team 1 score field.
2. Observe the **Save Court 1 Score** button.
3. Enter `7` in the Court 1 Team 2 score field.
4. Observe the **Save Court 1 Score** button.

**Expected:**
- After step 2: button remains **disabled** (only one score entered).
- After step 4: button becomes **enabled**.

---

### 3.4 — Save Court 1 Score

**Precondition:** Round 1 active, Court 1 scores entered (11 and 7).

1. Click **Save Court 1 Score**.

**Expected:**
- Court 1 now displays saved scores with an **Update** button.
- Court 2 still shows score input fields (not yet saved).
- Round 2 remains upcoming (no inputs shown for Round 2 yet).

---

### 3.5 — Active Round Advances After Both Courts Saved

**Precondition:** Round 1 active, Court 1 scores saved.

1. Enter `9` and `11` for Court 2.
2. Click **Save Court 2 Score**.

**Expected:**
- Round 1 transitions to completed state (no more Save buttons in Round 1).
- Round 2 card becomes active — score input fields appear for Round 2's courts.
- Round 2 has a highlighted border (active style).

---

### 3.6 — Update Saved Score

**Precondition:** Round 1 fully scored (Court 1: 11–7, Court 2: 9–11).

1. In Round 1, Court 1: change the Team 1 score from `11` to `9`.
2. Click **Update**.

**Expected:**
- Court 1 score updates to **9–7**.
- Leaderboard reflects the updated scores when viewed.

---

### 3.7 — Save Button Disabled for Zero-Zero Scores

**Precondition:** Round 1 active on Scores tab.  
`[NEGATIVE]`

1. Enter `0` in the Court 1 Team 1 score field.
2. Enter `0` in the Court 1 Team 2 score field.
3. Observe the Save button.

**Expected:**
- **Save Court 1 Score** button is **enabled** (both scores are non-null and >= 0).
- A 0–0 score is a valid (if unusual) result.

---

### 3.8 — Negative Score Rejected

**Precondition:** Round 1 active.  
`[NEGATIVE]`

1. Enter `-1` in the Court 1 Team 1 score field.
2. Enter `11` in the Court 1 Team 2 score field.
3. Observe the Save button.

**Expected:**
- **Save Court 1 Score** button is **disabled** (negative score fails `>= 0` check).

---

### 3.9 — Upcoming Round Shows Read-Only Teams (No Input Fields)

**Precondition:** 8 players, schedule generated. Round 1 is active.

1. Click the **Scores** tab.
2. Observe Rounds 2–7.

**Expected:**
- Rounds 2–7 show only team names as plain text (e.g., "Bob & Charlie vs Diana & Eve").
- No score input fields appear for upcoming rounds.
- No Save buttons appear for upcoming rounds.

---

### 3.10 — Scores Tab in Read-Only Mode

**Precondition:** Navigate to app via a valid URL hash (read-only mode).

1. Click the **Scores** tab.

**Expected:**
- Scores for completed courts are visible (if any in the shared session).
- Score input fields are **disabled** (cannot be edited).
- **Save** and **Update** buttons are **not visible**.

---

### 3.11 — Score Persistence After Reload

**Precondition:** Round 1 Court 1 score saved (11–7).

1. Reload the page.
2. Click the **Scores** tab.
3. Observe Round 1, Court 1.

**Expected:**
- Score **11–7** is still displayed.
- Round 1 Court 1 shows the **Update** button (previously saved state preserved).

---

### 3.12 — Pending Scores Cleared After Session Save

**Precondition:** Round 1 active, Court 1 scores entered but not yet saved.

1. Enter `11` and `7` in Court 1 fields (do not click Save yet).
2. Enter `9` and `11` in Court 2 fields.
3. Click **Save Court 2 Score** first.
4. Observe Court 1 fields.

**Expected:**
- After saving Court 2, Court 1 inputs are still shown (pending scores for Court 1 persist independently).
- No cross-contamination between pending entries.

---

## 4. Leaderboard Tab

### 4.1 — Leaderboard Empty State (No Scores)

**Precondition:** 8 players added, schedule generated, no scores entered.

1. Click the **Leaderboard** tab.

**Expected:**
- Message: "No scores recorded yet."
- No player cards shown.
- **Sort by Wins** toggle is selected by default.
- **Share QR** button is visible.
- **Reset Session** button is visible.

---

### 4.2 — Leaderboard Populates After Round 1 Scored

**Precondition:** Round 1 fully scored (Court 1: 11–7, Court 2: 9–11).

1. Click the **Leaderboard** tab.

**Expected:**
- 8 player cards appear, ranked by wins (default sort).
- Players with 1 win (winning teams) rank above players with 0 wins.
- Each card shows: medal/rank, player name, wins, total points, games played.
- Top 3 show medal emojis: 🥇, 🥈, 🥉.
- Ranks 4+ show numeric rank (4, 5, 6, 7, 8).
- The badge on each card shows "XW" (wins count).

---

### 4.3 — Sort by Points

**Precondition:** Round 1 scored.

1. Click the **Sort by Points** toggle on the Leaderboard.

**Expected:**
- Player cards reorder by total points (descending).
- Badge changes to show "Xpts" instead of "XW".
- Players with equal points are sub-sorted by wins.

---

### 4.4 — Sort by Wins (Default / Toggle Back)

**Precondition:** Sorted by Points from test 4.3.

1. Click **Sort by Wins** toggle.

**Expected:**
- Players reorder by wins (descending).
- Badge reverts to "XW" format.
- Players with equal wins are sub-sorted by total points.

---

### 4.5 — Medal Display for Top 3

**Precondition:** Multiple rounds scored creating distinct win totals.

1. Click the **Leaderboard** tab.

**Expected:**
- Rank 1 player shows 🥇.
- Rank 2 player shows 🥈.
- Rank 3 player shows 🥉.
- Ranks 4 and beyond show the numeric rank number.

---

### 4.6 — Leaderboard Stats Accuracy

**Precondition:** Round 1 scored: Court 1 = 11–7 (Team A wins), Court 2 = 9–11 (Team B wins).

1. Click the **Leaderboard** tab.
2. Find Alice (Team A, Court 1 winner).
3. Find Grace (Team B, Court 2 winner).
4. Find Charlie (Team A, Court 1 loser).
5. Find Eve (Team B, Court 2 loser).

**Expected:**
- Alice: **1 wins · 11 pts · 1 games**.
- Grace: **1 wins · 11 pts · 1 games**.
- Charlie: **0 wins · 7 pts · 1 games**.
- Eve: **0 wins · 9 pts · 1 games**.

---

### 4.7 — Reset Session Confirmation — Cancel

**Precondition:** Players and schedule exist.

1. Click **Reset Session**.
2. A browser `confirm()` dialog appears: "Reset this session? All players, schedule, and scores will be cleared."
3. Click **Cancel**.

**Expected:**
- Session data remains intact (players, rounds, scores preserved).

---

### 4.8 — Reset Session Confirmation — Confirm

**Precondition:** Players, schedule, and scores exist.

1. Click **Reset Session**.
2. Click **OK** in the confirm dialog.

**Expected:**
- Players tab shows **0 / 11** — all players removed.
- Schedule tab shows empty state message.
- Scores tab shows empty state message.
- Leaderboard shows "No scores recorded yet."
- The app is in a fully fresh state for today's date.

---

### 4.9 — Leaderboard in Read-Only Mode

**Precondition:** Navigate to app via a valid URL hash.

1. Click the **Leaderboard** tab.

**Expected:**
- Leaderboard data is visible (read-only display).
- **Share QR** button is **not visible**.
- **Reset Session** button is **not visible**.
- Sort toggles (Wins / Points) are still functional (view-only sorting is allowed).

---

### 4.10 — Leaderboard Updates Live After Score Edit

**Precondition:** Round 1 fully scored. On the Leaderboard tab.

1. Note Alice's current stats.
2. Switch to **Scores** tab.
3. Update Court 1 score: change Team 1 from 11 to 5.
4. Click **Update**.
5. Switch back to **Leaderboard** tab.

**Expected:**
- Alice's total points reflects the updated score (5 instead of 11).
- Win/loss records update if the score change reversed the match outcome.

---

## 5. Share Dialog

### 5.1 — Open Share Dialog

**Precondition:** 8 players added, schedule generated, at least one score saved. On Leaderboard tab.

1. Click the **Share QR** button.

**Expected:**
- A modal dialog titled "Share Session" opens.
- A QR code image is rendered on a canvas (green-on-dark color scheme).
- A long base64-encoded URL is displayed below the QR code.
- **Copy URL** button is visible.
- **Close** button is visible.

---

### 5.2 — Copy URL Button Feedback

**Precondition:** Share dialog is open.

1. Click **Copy URL**.

**Expected:**
- Button text changes from "Copy URL" to **"Copied!"** immediately.
- After approximately 2 seconds, button text reverts to **"Copy URL"**.
- The URL is written to the clipboard (verify by pasting into a text field if clipboard access is available).

---

### 5.3 — Close Button Dismisses Dialog

**Precondition:** Share dialog is open.

1. Click **Close**.

**Expected:**
- Dialog closes.
- User is returned to the Leaderboard tab view.
- No data is lost.

---

### 5.4 — URL Format is Valid Base64 Hash

**Precondition:** Share dialog open, URL visible.

1. Copy the URL text from the dialog.
2. Inspect the URL structure.

**Expected:**
- URL format: `http://[host]/roundrobin#[base64string]`
- The hash portion is a valid base64 string (only contains A–Z, a–z, 0–9, +, /, = characters).
- Decoding the base64 produces valid JSON representing the session (date, players, rounds fields).

---

### 5.5 — Shared URL Loads Session in Read-Only Mode

**Precondition:** A valid share URL has been copied from the dialog.

1. Open the shared URL in a **new browser tab** (or navigate to it directly).

**Expected:**
- Toolbar shows **"👁 View Only"** label instead of the date dropdown.
- A blue banner appears: "Shared session — read only".
- All 4 tabs are accessible and display the shared session data.
- Players tab: no Add/Remove/Generate controls visible.
- Scores tab: score fields are disabled; no Save/Update buttons.
- Leaderboard tab: no Share QR button; no Reset Session button.

---

### 5.6 — Invalid Hash in URL Gracefully Degrades

**Precondition:** Fresh state.  
`[NEGATIVE]`

1. Navigate to `[base URL]#thisisnotvalidbase64!!!`.

**Expected:**
- The app does **not crash**.
- The invalid hash is ignored.
- App initializes normally in regular (editable) mode with today's date.
- No error message shown to the user.

---

### 5.7 — QR Code Renders for Standard-Length Session

**Precondition:** Share dialog open with an 8-player, 1-round-scored session.

1. Visually inspect the QR canvas element.

**Expected:**
- QR code is visible (green pixels on dark background).
- Canvas has non-zero dimensions (256×256 pixels).

---

### 5.8 — Share Dialog Accessible via Keyboard

**Precondition:** Leaderboard tab active, Share QR button visible.  
`[A11Y]`

1. Tab to the **Share QR** button and press **Enter**.
2. Verify dialog opens.
3. Tab through dialog elements.
4. Press **Escape** or tab to **Close** and press **Enter**.

**Expected:**
- Dialog opens via keyboard.
- Focus is trapped within the dialog.
- Close button is reachable via Tab.
- Dialog closes without losing the leaderboard context.

---

## 6. Date Session Management

### 6.1 — Today's Date Pre-Selected on First Load

**Precondition:** Fresh state.

1. Navigate to the app (no hash).

**Expected:**
- The date dropdown in the toolbar shows today's date (format: YYYY-MM-DD).
- A session for today is automatically initialized in localStorage.

---

### 6.2 — Multiple Sessions via Date Dropdown

**Precondition:** A session exists for today with players added.

1. Click the date dropdown in the toolbar.
2. Observe available date options.
3. If only one date exists, note that only today is listed.

**Expected:**
- Dropdown lists all dates with saved sessions (sorted newest first).
- Today's date is always present (even if no data was added yet).

---

### 6.3 — Switching Date Loads Corresponding Session

**Precondition:** Sessions exist for at least two different dates.

1. Click the date dropdown.
2. Select a different date.

**Expected:**
- Players, schedule, and scores for the selected date are loaded.
- The UI updates to reflect the selected session's state.

---

### 6.4 — Date Dropdown Hidden in Read-Only Mode

**Precondition:** App loaded via shared URL hash.

1. Observe the toolbar area where the date dropdown normally appears.

**Expected:**
- Date dropdown is **replaced** by "👁 View Only" text.
- User cannot switch sessions while in read-only mode.

---

## 7. URL Hash / Read-Only Mode

### 7.1 — Setup: Generate a Valid Share URL

To test read-only mode properly, follow these steps:

1. Start from a fresh state.
2. Add 8 players.
3. Generate a schedule.
4. Score both courts in Round 1.
5. Go to the Leaderboard tab.
6. Click **Share QR**.
7. Note the full URL shown in the dialog (including the `#` hash).
8. Close the dialog.
9. Open the copied URL in a private/incognito window (to avoid localStorage interference).

---

### 7.2 — Read-Only: View Only Banner Visible

**Precondition:** URL from test 7.1 opened in a clean context (no existing localStorage for that session).

1. Navigate to the shared URL.

**Expected:**
- Blue banner: "Shared session — read only" appears below the toolbar.
- Toolbar shows "👁 View Only" instead of the date dropdown.

---

### 7.3 — Read-Only: All Tabs Show Correct Data

**Precondition:** Read-only URL loaded (session has players, schedule, and Round 1 scores).

1. Click each tab in turn: **Players**, **Schedule**, **Scores**, **Leaderboard**.

**Expected:**
- **Players**: All 8 players listed with no edit controls.
- **Schedule**: 7 rounds with Round 1 COMPLETED, Round 2 NOW, others UPCOMING.
- **Scores**: Round 1 shows saved scores; remaining rounds show upcoming text.
- **Leaderboard**: Ranked stats visible; no Share QR or Reset buttons.

---

### 7.4 — Read-Only: Cannot Modify Data

**Precondition:** Read-only URL loaded.  
`[NEGATIVE]`

1. Click the **Players** tab.
2. Attempt to find and use the "Player name" input or Add button.
3. Click the **Scores** tab.
4. Attempt to enter or change a score.
5. Click the **Leaderboard** tab.
6. Attempt to click Reset Session.

**Expected:**
- Add player input/button: **not present**.
- Score inputs: **disabled** (not editable).
- Save/Update buttons: **not present**.
- Reset Session button: **not present**.

---

### 7.5 — Malformed Hash Ignored, Normal Mode Loads

**Precondition:** None.  
`[NEGATIVE]`

1. Navigate to `[base URL]#AAAA` (too short to be a valid session).

**Expected:**
- `decodeSessionFromHash` returns null.
- App falls back to normal mode.
- Today's date session is initialized from localStorage.
- No read-only banner or "View Only" label shown.

---

### 7.6 — Hash with Valid Base64 but Invalid JSON

**Precondition:** None.  
`[NEGATIVE]`

1. Navigate to `[base URL]#` followed by the base64 of a non-JSON string (e.g., base64 of "hello world").

**Expected:**
- The decode attempt fails gracefully.
- App loads in normal mode (no crash, no error displayed).

---

## 8. localStorage Persistence

### 8.1 — Session Persists Across Browser Reload

**Precondition:** 8 players added, schedule generated, Round 1 scored.

1. Note the current state (players, Round 1 scores).
2. Close and reopen the tab (or press F5 to reload).

**Expected:**
- All players are still listed.
- Schedule is intact with all 7 rounds.
- Round 1 scores are preserved and displayed.
- Round 2 is the active round (Round 1 shows as COMPLETED).

---

### 8.2 — Multiple Dates Stored Independently

**Precondition:** Session data exists for today.

1. Use browser DevTools to manually insert a `pickleball-session-2026-04-01` key into localStorage with a valid session JSON payload.
2. Reload the app.
3. Open the date dropdown.

**Expected:**
- Both `2026-05-05` (today) and `2026-04-01` appear in the dropdown.
- Selecting `2026-04-01` loads the injected session data.
- Switching back to today restores today's session.

---

### 8.3 — Reset Clears localStorage Entry for Current Date

**Precondition:** Today's session has players and scores.

1. Go to **Leaderboard** tab.
2. Click **Reset Session** → **OK**.
3. Open browser DevTools → Application → Local Storage.

**Expected:**
- The `pickleball-session-[today]` key still exists in localStorage (reset calls `clearSession` then `initSession`, which re-creates it as an empty session).
- The re-created session has `players: []` and `rounds: []`.

---

## 9. Accessibility (A11Y)

### 9.1 — Remove Player Button Has Accessible Label

**Precondition:** At least one player in the list.  
`[A11Y]`

1. Inspect the × (remove) button for a player named "Alice".

**Expected:**
- Button has `aria-label="Remove Alice"`.
- Screen readers announce "Remove Alice, button".

---

### 9.2 — Score Input Fields Have Accessible Labels

**Precondition:** Scores tab with active round.  
`[A11Y]`

1. Inspect the score input fields for Court 1.

**Expected:**
- Team 1 input has `aria-label="Court 1 team 1 score"`.
- Team 2 input has `aria-label="Court 1 team 2 score"`.

---

### 9.3 — Leaderboard Cards Have Accessible Rank Labels

**Precondition:** Scores entered; leaderboard populated.  
`[A11Y]`

1. Inspect each player card's ARIA attributes.

**Expected:**
- Each card has `role="row"` and `aria-label="Rank X: [Name], Y wins, Z points"`.

---

### 9.4 — Sort Toggle Has ARIA Label

**Precondition:** Leaderboard tab visible.  
`[A11Y]`

1. Inspect the Sort by Wins / Sort by Points button group.

**Expected:**
- Toggle group has `aria-label="Sort leaderboard by"`.
- Each radio option is keyboard-focusable and announces its state (checked/unchecked).

---

### 9.5 — QR Code Canvas Has Alt Text

**Precondition:** Share dialog open.  
`[A11Y]`

1. Inspect the canvas element inside the Share dialog.

**Expected:**
- Canvas has `role="img"` and `aria-label="QR code to share this session"`.

---

### 9.6 — Copy URL Button ARIA Updates on Click

**Precondition:** Share dialog open.  
`[A11Y]`

1. Inspect the **Copy URL** button's `aria-label` before clicking.
2. Click **Copy URL**.
3. Inspect the button's `aria-label` again immediately.

**Expected:**
- Before click: `aria-label="Copy session URL"`.
- After click: `aria-label="URL copied to clipboard"` (updates dynamically with copied state).

---

### 9.7 — Tab Navigation Order is Logical

**Precondition:** App loaded normally.  
`[A11Y]`

1. With keyboard focus on the page, press **Tab** repeatedly to cycle through all interactive elements on the Players tab.

**Expected:**
- Focus order is logical: toolbar → date dropdown → tab list → player name input → Add button → player list items → remove buttons → Generate Schedule button.
- No focus traps outside of dialogs.
- All interactive elements are reachable via Tab.

---

## 10. Cross-Tab Reactivity

### 10.1 — Schedule Tab Reflects Scores Without Manual Refresh

**Precondition:** Schedule tab is visible, Round 1 active.

1. Switch to **Scores** tab.
2. Enter and save both courts for Round 1.
3. Switch back to **Schedule** tab.

**Expected:**
- Round 1 immediately shows **COMPLETED** badge and inline scores.
- Round 2 shows **NOW** badge.
- No page reload required.

---

### 10.2 — Leaderboard Reflects Player Removal

**Precondition:** 8 players, schedule generated, Round 1 scored. Leaderboard shows 8 entries.

1. Switch to **Players** tab.
2. Remove one player (e.g., Hank).

**Expected:**
- **Note:** This is an edge case — removing a player whose ID is referenced by existing rounds may break schedule integrity. The leaderboard should handle this gracefully without crashing (missing player IDs may show the raw UUID or be omitted).
- App should not throw a JavaScript error.

---

### 10.3 — Counter Badge Stays in Sync After Add/Remove

**Precondition:** 5 players in list.

1. Add one player → badge shows 6 / 11.
2. Remove one player → badge shows 5 / 11.
3. Add three players → badge shows 8 / 11.

**Expected:**
- Counter badge updates reactively after every add/remove action without page refresh.

---

## 11. Edge Cases and Boundary Conditions

### 11.1 — Score Entry: Both Fields Must Be Non-Null

**Precondition:** Round 1 active on Scores tab.  
`[BOUNDARY]`

1. Enter a value in Team 1 score only (leave Team 2 blank).
2. Observe Save button.

**Expected:**
- Save button remains **disabled** until Team 2 score is also entered.

---

### 11.2 — Score of Zero is Valid

**Precondition:** Round 1 active.

1. Enter `11` for Team 1 and `0` for Team 2.
2. Click **Save Court 1 Score**.

**Expected:**
- Score saved as **11–0**.
- Leaderboard reflects Team 1's win and 11 points; Team 2's loss and 0 points.

---

### 11.3 — Very Large Score Values

**Precondition:** Round 1 active.  
`[BOUNDARY]`

1. Enter `999` for Team 1 and `998` for Team 2.
2. Click **Save Court 1 Score**.

**Expected:**
- Score saved without error.
- Leaderboard shows 999 pts for winners, 998 pts for losers.

---

### 11.4 — Generate Schedule Minimum Players (8)

**Precondition:** Exactly 8 players.  
`[BOUNDARY]`

1. Click **Generate Schedule**.

**Expected:**
- Schedule generated successfully with 7 rounds.
- No sit-outs per round (all 8 play each round).

---

### 11.5 — Generate Schedule Maximum Players (11)

**Precondition:** Exactly 11 players.  
`[BOUNDARY]`

1. Click **Generate Schedule**.

**Expected:**
- Schedule generated with 11 rounds.
- 3 sit-outs per round.
- All players appear across both courts and sit-out lists.

---

### 11.6 — Player with Special Characters in Name

**Precondition:** Fresh state.

1. Add a player named `O'Brien-Smith` (with apostrophe and hyphen).
2. Add a player named `María José` (with accented characters).
3. Generate a schedule.
4. Go to the Schedule tab.

**Expected:**
- Special character names display correctly in the schedule.
- Share URL encodes them correctly (UTF-8 safe base64).
- Loading the shared URL shows the same names without corruption.

---

### 11.7 — Duplicate Player Names Allowed

**Precondition:** Fresh state.

1. Add two players both named `Alex`.
2. Generate a schedule.
3. Observe the Schedule tab.

**Expected:**
- Both "Alex" entries appear (they have distinct UUIDs).
- The schedule and leaderboard show "Alex" twice — distinguishing them only by position/rank, not name.
- App does not crash or deduplicate.

---

## Appendix A — Test Environment Setup

### Clearing State Between Tests

```
1. Open DevTools (F12).
2. Go to Application > Storage.
3. Click "Clear site data".
4. Reload the page.
```

Or via console:
```javascript
localStorage.clear();
location.reload();
```

### Generating a Valid Share URL for Read-Only Tests

```
1. Clear site data (fresh state).
2. Add 8 players: Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hank.
3. Click "Generate Schedule".
4. Go to Scores tab, enter 11 and 7 for Court 1, click Save.
5. Enter 9 and 11 for Court 2, click Save.
6. Go to Leaderboard tab.
7. Click Share QR.
8. Copy the full URL from the dialog.
9. Use this URL in read-only test scenarios.
```

---

## Appendix B — Test Coverage Matrix

| Area                   | Happy Path | Negative | Boundary | A11Y | Persistence |
|------------------------|:----------:|:--------:|:--------:|:----:|:-----------:|
| Players Tab            | ✓          | ✓        | ✓        | ✓    | ✓           |
| Schedule Tab           | ✓          |          | ✓        |      |             |
| Scores Tab             | ✓          | ✓        | ✓        | ✓    | ✓           |
| Leaderboard Tab        | ✓          |          |          | ✓    |             |
| Share Dialog           | ✓          | ✓        |          | ✓    |             |
| URL Hash / Read-Only   | ✓          | ✓        |          |      |             |
| Date Session Mgmt      | ✓          |          |          |      | ✓           |
| localStorage           | ✓          |          |          |      | ✓           |
| Cross-Tab Reactivity   | ✓          |          | ✓        |      |             |
| Edge Cases             | ✓          | ✓        | ✓        |      |             |

**Total Scenarios: 57**
