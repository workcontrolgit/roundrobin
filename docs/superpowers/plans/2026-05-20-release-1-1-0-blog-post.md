# RoundRobin 1.1.0 Blog Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write and commit a Medium-ready blog post spotlighting the four key improvements in RoundRobin 1.1.0 for pickleball organizers.

**Architecture:** The post lives in `docs/content/` as a Markdown file following the same structure as the v0.0.0 post. Four feature sections each lead with an organizer problem, then describe the solution. New screenshots are captured via `openwolf designqc` and saved to `docs/content/screenshots/`.

**Tech Stack:** Markdown, openwolf designqc (screenshot capture), Angular dev server (for screenshot capture), GitHub Pages live app at https://workcontrolgit.github.io/roundrobin

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md` | Final blog post draft |
| Create | `docs/content/screenshots/09-players-copy-previous.png` | Copy players button screenshot |
| Create | `docs/content/screenshots/10-about-language-selector.png` | Language selector screenshot |
| Create | `docs/content/screenshots/11-scores-autosave-active.png` | Scores autosave screenshot |
| Create | `docs/content/screenshots/12-session-reset-guard.png` | Session reset guard screenshot |

---

### Task 1: Capture Screenshots

**Files:**
- Create: `docs/content/screenshots/09-players-copy-previous.png`
- Create: `docs/content/screenshots/10-about-language-selector.png`
- Create: `docs/content/screenshots/11-scores-autosave-active.png`
- Create: `docs/content/screenshots/12-session-reset-guard.png`

- [ ] **Step 1: Start the dev server**

```bash
cd c:/apps/pickleball/roundrobin
npm start
```

Wait until you see `Local: http://localhost:4200/roundrobin`

- [ ] **Step 2: Capture screenshot 09 — Copy players button**

Open http://localhost:4200/roundrobin in a mobile-viewport browser (or use DevTools device emulation at 390×844, iPhone 14 size).

Navigate to the Players tab. Add 2–3 player names so the list is non-empty and the "Copy from previous session" button is visible. Take a portrait screenshot.

Save as: `docs/content/screenshots/09-players-copy-previous.png`

- [ ] **Step 3: Capture screenshot 10 — Language selector**

Open the About sheet (tap the info/About button in the app shell). Ensure the language selector dropdown is visible. Take a portrait screenshot.

Save as: `docs/content/screenshots/10-about-language-selector.png`

- [ ] **Step 4: Capture screenshot 11 — Scores autosave active**

Generate a session with 8 players. Advance to the Scores tab. Enter at least one score for the active round so the tab shows live score data. Take a portrait screenshot.

Save as: `docs/content/screenshots/11-scores-autosave-active.png`

- [ ] **Step 5: Capture screenshot 12 — Session reset guard**

Trigger the session reset action (in the session drawer or app menu). The confirm/guard dialog should appear. Take a portrait screenshot of the dialog.

Save as: `docs/content/screenshots/12-session-reset-guard.png`

- [ ] **Step 6: Commit screenshots**

```bash
git add docs/content/screenshots/09-players-copy-previous.png
git add docs/content/screenshots/10-about-language-selector.png
git add docs/content/screenshots/11-scores-autosave-active.png
git add docs/content/screenshots/12-session-reset-guard.png
git commit -m "docs: add 1.1.0 feature screenshots"
```

---

### Task 2: Write Blog Post — Intro and Feature 1

**Files:**
- Create: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Create the file with the intro and Feature 1 section**

Create `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md` with this content:

```markdown
# RoundRobin 1.1.0: Four Things That Got Better for Pickleball Organizers

RoundRobin is a phone-friendly app that helps you get from "who showed up?" to a running round-robin session in a few taps — no spreadsheet, no whiteboard, no app install. Since the first version, several things that were slightly awkward got fixed. Here's what changed.

---

## 1. Copy Players from Last Session

If you run the same group week after week, you already know the routine: open the app, retype eight or ten names, tap Generate Schedule, and finally get going.

Starting over from a blank list every session adds unnecessary friction. With 1.1.0, there is now a button on the Players tab that pulls in the roster from your previous session with one tap.

Open the app, hit Copy from previous session, review the names, and you are already at the Generate Schedule step. For regular groups, that is the fastest way to start.

![Players tab — Copy from previous session button visible](screenshots/09-players-copy-previous.png)
```

- [ ] **Step 2: Verify the file exists and intro reads naturally**

Read the file. Check:
- The opening 2–3 sentences explain what RoundRobin does for a first-time reader
- Feature 1 section leads with the organizer problem (retyping names), not the technical feature
- Screenshot reference path is correct: `screenshots/09-players-copy-previous.png`

---

### Task 3: Write Feature 2 — Language Support

**Files:**
- Modify: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Append Feature 2 section**

Append the following to `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`:

```markdown

---

## 2. Play in Your Language

The first version of RoundRobin was English-only. If your group speaks Spanish, French, or another language, the labels and buttons were still in English regardless.

In 1.1.0 the app ships with multi-language support. A language selector in the About sheet lets you switch the full interface in a few taps — menus, labels, buttons, everything.

It is a small change with a meaningful impact for any group that does not primarily use English.

![About sheet — language selector open](screenshots/10-about-language-selector.png)
```

- [ ] **Step 2: Verify Feature 2**

Read the updated file. Check:
- Problem leads (English-only was a limitation)
- Solution is described in organizer terms (switch the full interface), not technical terms (i18n)
- Screenshot reference is correct: `screenshots/10-about-language-selector.png`

---

### Task 4: Write Feature 3 — Autosave Scores

**Files:**
- Modify: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Append Feature 3 section**

Append the following to `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`:

```markdown

---

## 3. Scores Save Automatically

If you have ever accidentally closed a browser tab mid-session, you know that sinking moment when you open the app again and the scores are gone. In earlier versions, score data was not persisted unless you navigated carefully.

In 1.1.0 scores save automatically as you enter them. Close the tab, switch apps, lock your phone — when you come back, the session is exactly where you left it.

No save button. No lost progress.

![Scores tab — active round with scores entered](screenshots/11-scores-autosave-active.png)
```

- [ ] **Step 2: Verify Feature 3**

Read the updated file. Check:
- Problem leads (closing the tab wiped scores)
- Solution is described in plain terms (scores save automatically)
- No technical jargon (no mention of localStorage or state management)
- Screenshot reference is correct: `screenshots/11-scores-autosave-active.png`

---

### Task 5: Write Feature 4 — Session Reset Guard

**Files:**
- Modify: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Append Feature 4 section**

Append the following to `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`:

```markdown

---

## 4. Start a New Session Without Losing the Old One

When you run back-to-back sessions with different groups, at some point you need to clear the players and scores and start fresh. In the original version, that was a quick action with no confirmation — easy to trigger by accident mid-session.

In 1.1.0, resetting the session requires a deliberate confirmation step. A dialog asks you to confirm before anything is cleared, so accidental taps on a crowded screen do not wipe a session you are still running.

It is the kind of safety net you do not notice until you need it.

![Session reset — confirm dialog before clearing](screenshots/12-session-reset-guard.png)
```

- [ ] **Step 2: Verify Feature 4**

Read the updated file. Check:
- Problem leads (accidental clear, especially on a busy screen)
- Solution is described in plain terms (confirmation step before clearing)
- Screenshot reference is correct: `screenshots/12-session-reset-guard.png`

---

### Task 6: Write Closing and CTA

**Files:**
- Modify: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Append closing section**

Append the following to `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`:

```markdown

---

## Try It at Your Next Session

RoundRobin is still a single URL — no app store, no install, just open it on your phone.

The 1.1.0 update is live now:

https://workcontrolgit.github.io/roundrobin

If this is your first time hearing about it, the [original post](https://medium.com/@workcontrolgit/skip-the-spreadsheet-a-faster-way-to-run-pickleball-round-robin-games-REPLACE_WITH_REAL_SLUG) walks through the full workflow from adding players to sharing the final leaderboard.
```

> **Note:** Replace `REPLACE_WITH_REAL_SLUG` in the Medium link with the actual slug of the v0.0.0 post before publishing.

- [ ] **Step 2: Verify closing**

Read the full post from start to finish. Final check:
- Total word count is in the 900–1,100 range (count manually or paste into a word counter)
- Every screenshot reference uses a relative path starting with `screenshots/`
- The app URL `https://workcontrolgit.github.io/roundrobin` appears in the CTA
- The Medium link placeholder is noted for manual update before publishing
- Tone is consistent throughout — practical, friendly, no jargon

---

### Task 7: Commit the Blog Post Draft

**Files:**
- Modify: `docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

- [ ] **Step 1: Commit the completed draft**

```bash
git add docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md
git commit -m "docs: add Medium blog post draft for release 1.1.0"
```

- [ ] **Step 2: Verify commit**

```bash
git log --oneline -3
```

Expected: the top commit should be `docs: add Medium blog post draft for release 1.1.0`
