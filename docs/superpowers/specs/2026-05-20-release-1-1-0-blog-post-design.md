# Blog Post Design: RoundRobin 1.1.0 Feature Spotlight

## Objective

Write a Medium blog post that spotlights the four key improvements in RoundRobin 1.1.0. The post should help existing users understand what changed and give new readers enough context to appreciate why each feature matters.

## Article Identity

| Field | Value |
|---|---|
| **Title** | RoundRobin 1.1.0: Four Things That Got Better for Pickleball Organizers |
| **Platform** | Medium |
| **Audience** | Pickleball organizers running casual or open-play sessions |
| **Tone** | Practical, friendly — same voice as the v0.0.0 intro post. No technical jargon. |
| **Target length** | 900–1,100 words |
| **CTA** | Try the updated app (GitHub Pages link) + link to the v0.0.0 intro post |

## Audience

Same primary audience as the v0.0.0 post:
- Players who help coordinate casual pickleball sessions
- Open play and club session organizers
- Non-technical readers — no code, no implementation details

## Article Structure

### Intro (2–3 sentences)
Brief recap of what RoundRobin does for readers who haven't seen the v0.0.0 post. Close with: *"Since the first version, several things that were slightly awkward got fixed. Here's what changed."*

### Feature 1 — Copy Players from Last Session
- **Problem:** Every session you retype the same 8–10 names from scratch
- **Solution:** One button imports the previous session's roster instantly
- **Screenshot:** `09-players-copy-previous.png` — Players tab with the Copy from previous session button visible

### Feature 2 — Play in Your Language
- **Problem:** The app was English-only, limiting use in multilingual groups
- **Solution:** Language selector in the About sheet switches the full UI
- **Screenshot:** `10-about-language-selector.png` — About sheet open with language selector visible

### Feature 3 — Scores Save Automatically
- **Problem:** Accidentally closing the tab or navigating away lost score progress
- **Solution:** Autosave — scores persist without tapping a save button
- **Screenshot:** `11-scores-autosave-active.png` — Scores tab showing an active round with scores entered

### Feature 4 — Session Tools (Reset & Guard)
- **Problem:** Starting a new group mid-day meant clearing everything manually; easy to accidentally wipe a live session
- **Solution:** Explicit session reset with a guard prompt that prevents accidental data loss
- **Screenshot:** `12-session-reset-guard.png` — Confirm/reset dialog

### Closing (2–3 sentences)
The app is still one URL, no install required, open on any phone. Link to try the app + link back to the v0.0.0 intro post.

## Screenshots Plan

All screenshots: portrait mobile viewport, clean state (no test data clutter). Follow the naming convention of existing screenshots in `docs/content/screenshots/`.

| File | Screen | What to show |
|---|---|---|
| `09-players-copy-previous.png` | Players tab | Copy from previous session button visible |
| `10-about-language-selector.png` | About sheet | Language selector open |
| `11-scores-autosave-active.png` | Scores tab | Active round with scores entered |
| `12-session-reset-guard.png` | Confirm dialog | Session reset guard prompt |

Screenshots are captured manually or via `openwolf designqc` before publishing.

## Output File

The drafted blog post content goes to:
`docs/content/2026-05-20-roundrobin-medium-post-v-1-1-0.md`

It should follow the same format as `docs/content/2026-05-05-roundrobin-medium-post-v-0-0-0.md`.

## Success Criteria

- Each feature section leads with the organizer problem, not the technical solution
- No jargon — readers should not need to know what i18n or autosave means; explain the benefit instead
- All four screenshot files are listed with correct paths
- Post ends with a working CTA linking to the live app and the intro post
