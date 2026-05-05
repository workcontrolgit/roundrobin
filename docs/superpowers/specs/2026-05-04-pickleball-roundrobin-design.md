# Pickleball Round Robin App — Design Spec

**Date:** 2026-05-04  
**Stack:** Angular 17+ (standalone components), localStorage, no backend

---

## Overview

A single-page Angular app for organizing a pickleball round robin session across 2 courts. Supports 8–11 players in a single pool. The schedule generator assigns players to courts each round — 4 players per court (2v2), with remaining players sitting out. Scores are entered per game, and a leaderboard ranks all players by wins and total points. All data persists in localStorage.

---

## Architecture

### App Structure

Single Angular app with four tab views managed by a top-level tab component. No routing — tabs switch via component logic.

```
AppComponent
├── TabBarComponent         (tab navigation header)
├── PlayersTabComponent     (add/remove players, generate schedule)
├── ScheduleTabComponent    (view all rounds)
├── ScoresTabComponent      (enter scores per round)
└── LeaderboardTabComponent (wins + points rankings)
```

### Services

| Service | Responsibility |
|---------|---------------|
| `SessionService` | Owns all session state; reads/writes localStorage |
| `ScheduleService` | Pure function: generates round robin rounds from player list |

### Data Model (localStorage key: `pickleball-session`)

```typescript
interface Session {
  date: string;          // YYYY-MM-DD
  players: Player[];     // single pool, 8–11 players
  rounds: Round[];
}

interface Round {
  roundNumber: number;
  courts: CourtGame[];   // V1: 2 courts; expandable to 3+
  sittingOut: string[];  // player ids
}

interface CourtGame {
  courtName: string;             // "Court 1", "Court 2"
  team1: [string, string];       // player ids
  team2: [string, string];       // player ids
  score?: { team1: number; team2: number };
}

interface Player {
  id: string;        // uuid
  name: string;
}

interface Round {
  roundNumber: number;
  team1: [string, string];   // player ids
  team2: [string, string];   // player ids
  sittingOut: string[];       // player ids
  score?: {
    team1: number;
    team2: number;
  };
}
```

---

## Features

### Players Tab

- Text input + "Add" button to enter player names
- Player count badge: e.g. `8 / 12`
- Numbered list of players, each with a remove (×) button
- Constraints: minimum 8 players, maximum 11
- "Generate Schedule" button — disabled until ≥ 8 players added
- Court label displayed: **Court 1**
- Generating a new schedule clears any existing schedule and scores (confirmation prompt)

### Schedule Tab

- Lists all generated rounds in order
- Each round card shows:
  - Round number
  - Team 1 vs Team 2 (player names)
  - Players sitting out
  - Score if entered (e.g. `11 – 8`)
  - Status badge: `COMPLETED` / `NOW` / upcoming (greyed out)
- "Now" round is highlighted with a colored border
- Read-only view — no editing here

### Scores Tab

- Same round list as Schedule tab
- Completed rounds show scores (editable in case of correction)
- Active round (first without a score) has two number inputs (one per team) and a "Save Score" button
- Saving a score advances the "active" round indicator

### Leaderboard Tab

- Toggle buttons: **By Wins** / **By Points**
- Each row: rank, player name, wins, total points
- Top 3 get medal icons (🥇🥈🥉)
- Ties broken by points (for wins view) or wins (for points view)
- Live — updates as scores are entered
- **Reset Session** button at the bottom — clears all data from localStorage (confirmation prompt)

---

## Schedule Generation Algorithm

Given N players (8–11) and 2 courts, generate rounds where:
- Each round: 8 players are assigned (4 per court, 2v2), remaining N−8 sit out
- With 8 players: 0 sit out per round
- With 9 players: 1 sits out per round
- With 10 players: 2 sit out per round
- With 11 players: 3 sit out per round
- Over all rounds, every player sits out roughly the same number of times
- Partners and opponents vary across rounds (no repeated team pairings on the same court)

**Approach:** Each round, select 8 players to play (rotating sit-outs fairly). Split the 8 into two groups of 4, assign one group to each court, then split each group into two teams of 2. Minimize partner/opponent repeats across rounds.

The generated schedule is deterministic given the same player list.

**Target rounds:** enough that each player partners with every other player at least once — approximately 7–10 rounds depending on player count.

---

## Persistence

- Sessions are stored in localStorage keyed by date: `pickleball-session-YYYY-MM-DD`
- On app load, the current date's session is loaded automatically
- A **session selector** (dropdown or list) lets the user switch to any previously saved date
- `SessionService` auto-saves on every state change to the active date's key
- **New Session** button starts a fresh session for today (or any chosen date)
- **Reset** clears only the active date's session (confirmation prompt)
- Past sessions are read-only once you switch away (no accidental overwrites)

---

## UI / Style

- Dark theme (dark navy background `#1e1e2e`, green accent `#52b788`)
- **Angular Material** for UI components (tabs, inputs, buttons, cards)
- Responsive: works on mobile browsers (used at the court on a phone)
- Tab bar fixed at the top; content scrolls below

### Accessibility (Section 508 / WCAG 2.1 AA)

This app is used by older adults — readability and large touch targets are a priority.

**Text & Contrast:**
- Body text minimum **18px**; player names and scores minimum **20px**
- All text meets WCAG AA contrast ratio: ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Score numbers use **bold 24px** — clearly readable from arm's length
- Never rely on color alone to convey status (use text labels + icons alongside color badges)

**Touch Targets:**
- All buttons and interactive elements minimum **48×48px** touch target (WCAG 2.5.5)
- Remove (×) buttons next to player names must be at least 48×48px
- Score input fields minimum height **48px**, font size **20px**
- Tab bar tabs minimum **48px** height

**Spacing & Layout:**
- Minimum **12px** gap between adjacent interactive elements to prevent mis-taps
- Player list rows minimum **56px** height
- Adequate padding inside cards (minimum **16px**)

**Focus & Navigation:**
- Visible focus rings on all interactive elements (keyboard accessible)
- Angular Material's focus indicators enabled; do not suppress with `outline:none`
- Tab order follows visual reading order

**ARIA:**
- Score input pairs labelled with `aria-label` identifying team and court
- Status badges use `aria-label` for screen reader context (e.g. "Round 1, completed")
- Leaderboard rows use `role="row"` semantics

---

## Sharing

- **Share button** on the Leaderboard tab generates a shareable URL with the session data base64-encoded in the URL hash
- A **QR code** is displayed when sharing — others scan it to open the session on their phone
- Recipients open the app on GitHub Pages and see the session in **read-only view**
- QR code generation uses a lightweight client-side library (e.g. `qrcode` npm package) — no backend needed
- Only the organizer (who has the session in localStorage) can enter scores; everyone else views

## Deployment

- App is deployed to **GitHub Pages**
- Angular build output (`ng build --base-href`) published to `gh-pages` branch
- All phones access the same public URL — QR code sharing works from any device

## Out of Scope (V1)

- 3+ courts (data model supports it; V1 generates schedules for exactly 2 courts)
- User accounts / cloud sync
- Bracket/elimination format
- Game timer
- Player skill ratings
