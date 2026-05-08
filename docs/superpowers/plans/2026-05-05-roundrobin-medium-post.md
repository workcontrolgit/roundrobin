# RoundRobin Medium Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Medium-compatible blog post that persuades pickleball players and organizers to try the RoundRobin app by emphasizing faster game startup, phone-first use, and no-spreadsheet setup.

**Architecture:** Write the article as plain Markdown with Medium-friendly structure: headline, optional subtitle, short paragraphs, simple bullets, and no tables. Draft the piece in a repo doc file first, using the live app URL `https://workcontrolgit.github.io/roundrobin/` as the primary CTA and keeping the tone practical and non-technical.

**Tech Stack:** Markdown, GitHub Pages URL, existing RoundRobin app context, Medium-compatible formatting constraints

---

## File Structure

- Create: `docs/content/2026-05-05-roundrobin-medium-post.md`
  - Final Medium-ready article draft in Markdown
- Create: `docs/content/2026-05-05-roundrobin-medium-post-checklist.md`
  - Publishing checklist covering Medium formatting, screenshots, final link verification, and publication steps
- Reference: `docs/superpowers/specs/2026-05-05-medium-blog-post-design.md`
  - Approved content/design spec for the article

## Task 1: Create the article draft file with headline, subtitle, and opening hook

**Files:**
- Create: `docs/content/2026-05-05-roundrobin-medium-post.md`
- Reference: `docs/superpowers/specs/2026-05-05-medium-blog-post-design.md`

- [ ] **Step 1: Create the article draft file with the title block and opening paragraphs**

Write this exact content into `docs/content/2026-05-05-roundrobin-medium-post.md`:

```md
# Skip the Spreadsheet: A Faster Way to Organize Pickleball Games

*A simple phone-friendly app for getting impromptu pickleball games started faster.*

If you help organize pickleball games, you know the awkward part often starts before anyone serves.

Everyone is ready to play, but someone still has to figure out who is here, who should rotate in, and how to get games started without standing around too long. That usually means a notes app, a spreadsheet, or a whiteboard and a lot more setup than anyone wants.

I built RoundRobin to make that part easier. It is a simple app you can open on your phone to set up a round-robin session quickly, without juggling a spreadsheet or trying to organize everything by hand at the courts.
```

- [ ] **Step 2: Review the opening for audience fit**

Run this quick check manually against the file:

- The first sentence speaks to pickleball organizers, not developers
- The opening mentions the delay before games start
- The draft does not mention Angular, GitHub Actions, code, or implementation details

Expected: PASS, with the opening clearly focused on organizers trying to start games quickly

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post.md
git commit -m "docs: add Medium post opening for RoundRobin"
```

## Task 2: Add the problem section and explain why spreadsheets are the wrong tool

**Files:**
- Modify: `docs/content/2026-05-05-roundrobin-medium-post.md`

- [ ] **Step 1: Add the problem section after the opening**

Append this exact content:

```md
## The Problem With Impromptu Pickleball Setup

The hard part of casual pickleball is usually not the playing. It is the few minutes before the first game, when one person has to turn a loose group into something organized.

Spreadsheets can work, but they are clumsy on a phone. Whiteboards are fine until the player list changes. Notes apps help you capture names, but they do not really help you turn those names into a smooth round-robin session.

When people are standing around with paddles in hand, too much setup kills momentum. The longer it takes to organize the session, the more energy the group loses before the first point is even played.
```

- [ ] **Step 2: Review the section against the spec**

Manual checklist:

- Mentions faster game starts as the primary pain
- Mentions spreadsheets as a supporting pain
- Keeps the framing practical and non-technical

Expected: PASS, with no feature pitch yet and no table-based formatting

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post.md
git commit -m "docs: add Medium post problem section"
```

## Task 3: Add the solution and explain how the app works

**Files:**
- Modify: `docs/content/2026-05-05-roundrobin-medium-post.md`

- [ ] **Step 1: Add the solution section**

Append this exact content:

```md
## A Simpler Way to Get Games Started

RoundRobin is built for one job: helping you get from "who showed up?" to "let's play" faster.

Instead of trying to manage names and matchups manually, you can open the app on your phone, add the players who are there, generate the round robin, and use the schedule to keep the session moving.

It is not meant to feel like tournament software. It is meant to feel quick, lightweight, and useful when you are standing at the courts and just want to get people playing.
```

- [ ] **Step 2: Add the short how-it-works section**

Append this exact content:

```md
## How to Use It

Using the app is straightforward:

- Open RoundRobin on your phone
- Add the players who showed up
- Generate the round-robin schedule
- Use the schedule to keep games moving

That is the whole point. Less setup, less confusion, and more time actually playing.
```

- [ ] **Step 3: Review Medium compatibility**

Manual checklist:

- Bullets are simple and flat
- No tables are used
- Paragraphs are short enough for Medium
- The copy avoids feature overload

Expected: PASS, with the article still easy to scan on mobile

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post.md
git commit -m "docs: add Medium post solution and usage sections"
```

## Task 4: Add the why-try-it section and direct call to action

**Files:**
- Modify: `docs/content/2026-05-05-roundrobin-medium-post.md`

- [ ] **Step 1: Add the why-it-is-useful section**

Append this exact content:

```md
## Why This Works Better for Casual Sessions

What I wanted was something that works well for the kind of pickleball sessions that happen most often: informal, flexible, and a little improvised.

RoundRobin is useful because it helps you:

- Start games faster
- Avoid spreadsheet juggling on your phone
- Reduce confusion when organizing players
- Keep impromptu sessions moving

If you regularly help coordinate open play, even saving a few minutes at the beginning makes the whole session feel smoother.
```

- [ ] **Step 2: Add the direct CTA with the live app URL**

Append this exact content:

```md
## Try It Before Your Next Session

If you organize pickleball games and want a faster way to get people on the court, you can try RoundRobin here:

https://workcontrolgit.github.io/roundrobin/

Open it on your phone, add the players who showed up, and see if it makes your next impromptu session easier to run.
```

- [ ] **Step 3: Read the full article top to bottom**

Manual checklist:

- The audience is clearly pickleball players and organizers
- The main promise is faster game startup
- The supporting promise is no spreadsheet, phone-first use
- The article includes a direct invitation to try the live app

Expected: PASS, with a persuasive flow from pain to immediate action

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post.md
git commit -m "docs: finish Medium post draft for RoundRobin"
```

## Task 5: Create the Medium publishing checklist

**Files:**
- Create: `docs/content/2026-05-05-roundrobin-medium-post-checklist.md`

- [ ] **Step 1: Create the checklist file**

Write this exact content:

```md
# RoundRobin Medium Publishing Checklist

## Content Review

- [ ] Confirm the post targets pickleball players and organizers
- [ ] Confirm the hook emphasizes getting games started faster
- [ ] Confirm the post mentions avoiding spreadsheets on a phone
- [ ] Confirm the tone stays non-technical

## Medium Formatting Review

- [ ] Confirm there are no tables
- [ ] Confirm headings are plain Markdown headings
- [ ] Confirm paragraphs are short and readable on mobile
- [ ] Confirm bullet lists are short and flat
- [ ] Confirm the live URL is visible as plain text

## Asset Review

- [ ] Decide whether to include one mobile screenshot of the app
- [ ] If using a screenshot, place it near the problem or solution section
- [ ] Confirm the screenshot is readable on mobile

## Publish Review

- [ ] Open `https://workcontrolgit.github.io/roundrobin/` and confirm it loads
- [ ] Copy the article into Medium and preview it on desktop
- [ ] Preview it on mobile if available
- [ ] Publish with tags relevant to pickleball, productivity, and sports apps
```

- [ ] **Step 2: Review the checklist for completeness**

Manual checklist:

- Covers content
- Covers Medium formatting
- Covers asset choice
- Covers final live-link verification

Expected: PASS, with no unnecessary technical publishing steps

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post-checklist.md
git commit -m "docs: add Medium publishing checklist for RoundRobin post"
```

## Task 6: Final editorial review of the draft and checklist together

**Files:**
- Modify: `docs/content/2026-05-05-roundrobin-medium-post.md` if needed
- Modify: `docs/content/2026-05-05-roundrobin-medium-post-checklist.md` if needed

- [ ] **Step 1: Run the final editorial review**

Review both files with this checklist:

- The article is persuasive first, explanatory second
- The post is Medium-compatible and uses no tables
- The CTA is direct and includes the live URL
- The wording stays focused on impromptu setup, phone use, and faster starts
- There are no developer-only references or implementation details

Expected: PASS, with no further content changes needed

- [ ] **Step 2: If wording changes are required, make them directly in the files**

Allowed edits:

- Tighten paragraphs that are too long
- Remove repeated phrases about speed or spreadsheets
- Simplify any line that reads like product marketing instead of a practical recommendation

Expected: Only small editorial edits, not structural rewrites

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/content/2026-05-05-roundrobin-medium-post.md docs/content/2026-05-05-roundrobin-medium-post-checklist.md
git commit -m "docs: finalize RoundRobin Medium post package"
```
