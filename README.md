# RoundRobin — Pickleball Round Robin Organizer

A mobile-friendly web app for organizing impromptu pickleball round robin sessions. Skip the spreadsheet — add players, generate a schedule, track scores, and share results in seconds.

**Live app:** https://workcontrolgit.github.io/roundrobin/

---

## Screenshots

| Players | Schedule |
|---------|----------|
| ![Add players and generate schedule](docs/content/screenshots/02-players-ready.png) | ![Full round-robin schedule](docs/content/screenshots/03-schedule.png) |

| Scores | Leaderboard |
|--------|-------------|
| ![Track scores per round](docs/content/screenshots/04-scores-active.png) | ![Live leaderboard with medals](docs/content/screenshots/06-leaderboard.png) |

| Share Session |
|---------------|
| ![Share via QR code or URL](docs/content/screenshots/07-share-dialog.png) |

---

## Features

- **Player management** — Add 8–11 players; the app tracks count and enables scheduling when ready
- **Auto-generated schedule** — Full round-robin matchups across 2 courts, balancing sit-outs for odd player counts
- **Score tracking** — Enter scores per court per round; active round advances automatically when both courts are saved
- **Leaderboard** — Live standings sorted by wins or total points, with medal rankings for the top 3
- **Share via QR / URL** — Generate a shareable link for read-only session viewing; anyone with the link can follow along on their own device
- **Session persistence** — Sessions are saved to localStorage by date; switch between past sessions via the date dropdown
- **Read-only mode** — Shared sessions load in view-only mode with no edit controls

---

## Tech Stack

- [Angular 20](https://angular.dev) with standalone components
- [Angular Material 3](https://material.angular.io) (M3 theme)
- [QRCode](https://www.npmjs.com/package/qrcode) for QR code generation
- Hosted on [GitHub Pages](https://pages.github.com)

---

## Getting Started

### Prerequisites

- Node.js 20+
- Angular CLI 20+

```bash
npm install -g @angular/cli
```

### Install dependencies

```bash
npm install
```

### Run locally

```bash
ng serve
```

Open `http://localhost:4200/roundrobin` in your browser.

### Build for production

```bash
ng build --configuration production
```

Build artifacts are output to `dist/pickleball-roundrobin/browser/`.

---

## Running Tests

### Unit tests

```bash
ng test
```

### End-to-end tests (Playwright)

Requires a running dev server on `http://localhost:4200/roundrobin` before running tests.

```bash
# Start dev server (in a separate terminal)
ng serve

# Run all tests (Chromium, Firefox, WebKit)
npx playwright test

# Run a specific suite
npx playwright test tests/leaderboard

# Run in headed mode (watch the browser)
npx playwright test --headed

# Open the HTML report after a run
npx playwright show-report
```

**Test suites** (`tests/`):

| Folder | Coverage |
|--------|----------|
| `players/` | Empty state, add player, counter, generate button |
| `schedule/` | Schedule generation, round display, all rounds completed |
| `scores/` | Score input, save/update, round advancement, read-only mode |
| `leaderboard/` | Rankings, sort by wins/points, medal display, stats accuracy, reset |
| `share/` | Share dialog, copy URL, QR code, URL format, read-only shared session |
| `date/` | Date session switching, session isolation |
| `readonly/` | Read-only mode behavior, invalid hash handling |
| `persistence/` | localStorage save/restore across reloads |
| `a11y/` | Keyboard navigation, ARIA roles, focus management |
| `cross-tab/` | Data consistency across tab switches |
| `edge-cases/` | Boundary scores, special characters, duplicate names, min/max players |

---

## Deployment

The app is deployed automatically to GitHub Pages on every push to `main` via the `.github/workflows/deploy.yml` workflow.

---

## License

MIT
