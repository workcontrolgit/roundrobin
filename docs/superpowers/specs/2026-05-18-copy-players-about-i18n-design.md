# Copy Players, About Sheet & i18n — Design Spec

**Date:** 2026-05-18
**Issues:** #15 (Copy players), #13 (About info), i18n (full translations)
**Status:** Approved
**Note:** The About component in this spec supersedes `2026-05-18-i18n-design.md` — About is now a `MatBottomSheet`, not a `MatDialog`.

---

## Issue #15 — Copy Players from Previous Session

### Problem

Users must retype the full player list every time they create a new session. Clubs often run the same roster across multiple sessions per day or week.

### Trigger

A `"📋 Copy from previous session"` button appears on the Players tab when:
- `players.length === 0`, AND
- At least one other saved session exists in localStorage (excluding the current session)

The button is hidden if no prior sessions exist.

### New Component: `CopyPlayersSheet`

**File:** `src/app/copy-players-sheet/copy-players-sheet.ts` + `.html`

Type: `MatBottomSheet`

**Sheet layout:**
- Header: `"Copy players from..."`
- Flat scrollable list of all saved sessions, excluding the current session
- Grouped under date headers (e.g., `May 18`, `May 17`), most recent date first
- Within each date, sessions listed ascending (S1, S2…)
- Each row: `Session N · X players` — full-width tappable button
- Tapping a row copies the players and dismisses the sheet

**On copy:**
- Extract player names from source session
- Call `SessionService.importPlayers(names)` — creates a fresh `crypto.randomUUID()` per name
- Rounds and scores are NOT copied

### New Service Method

```ts
// src/app/services/session.service.ts
importPlayers(names: string[]): void
// Iterates names, calls addPlayer() for each (trims blanks)
```

### Players Tab Change

`src/app/players-tab/players-tab.ts`:
- Inject `MatBottomSheet`
- Add `hasPreviousSessions` computed signal: checks all localStorage keys for sessions other than the current one
- Add `openCopySheet()` method: opens `CopyPlayersSheet`

`src/app/players-tab/players-tab.html`:
- Add button below the "add player" input, shown only when `players().length === 0 && hasPreviousSessions()`

---

## Issue #13 — About Info (Bottom Sheet)

### Trigger

A `ℹ` `mat-icon-button` added to the right end of the toolbar, before the session chip. Visible in both normal and read-only modes.

### New Component: `AboutSheet`

**File:** `src/app/about-sheet/about-sheet.ts` + `.html`

Type: `MatBottomSheet`

**Sheet contents:**
- App icon (`icon.svg`) + name: `Pickleball Round Robin`
- Version: `v{{ version }}` — injected via `environment.appVersion` populated from `package.json` at build time
- Credits: `Built by Fuji Nguyen`
- GitHub link: opens in new tab
- **Language selector** (`MatSelect`) — lists supported languages by native name:
  - `en` → English
  - `vi` → Tiếng Việt
  - `zh` → 中文
  - `ja` → 日本語
- On language change: calls `LanguageService.setLanguage(lang)` → saves to localStorage + calls `translateService.use()` → UI re-renders immediately, no page reload

### App Shell Changes

`src/app/app.ts`:
- Inject `MatBottomSheet`
- Add `openAboutSheet()` method

`src/app/app.html`:
- Add `<button mat-icon-button (click)="openAboutSheet()"><mat-icon>info</mat-icon></button>` to toolbar

---

## i18n — Full Translation Support

### Packages

```
@ngx-translate/core
@ngx-translate/http-loader
```

### Translation Files

**Location:** `public/i18n/{lang}.json`
**Languages at launch:** `en`, `vi`, `zh`, `ja`
**Loading:** lazy — only the active language is fetched at runtime

**Key structure:**

```json
{
  "toolbar": { "session_chip": "{{ date }} | {{ number }}" },
  "players": {
    "title": "Players",
    "add_placeholder": "Enter player name",
    "add_button": "Add",
    "copy_button": "Copy from previous session",
    "copy_sheet_title": "Copy players from...",
    "roster_locked_snack": "Roster is locked. Regenerate the schedule first."
  },
  "schedule": {
    "title": "Schedule",
    "generate_button": "Generate Schedule",
    "regenerate_button": "Regenerate Schedule",
    "regenerate_confirm_title": "Regenerate Schedule?",
    "regenerate_confirm_message": "All rounds and scores will be cleared. Your player list will be kept."
  },
  "scores": { "title": "Scores" },
  "leaderboard": {
    "title": "Leaderboard",
    "reset_button": "Reset Session",
    "reset_confirm_title": "Reset Session?",
    "reset_confirm_message": "All players, rounds, and scores will be cleared."
  },
  "session_drawer": {
    "title": "Switch Session",
    "new_session": "+ New Session",
    "delete_confirm_title": "Delete Session {{ number }}?",
    "delete_confirm_message": "All players, rounds, and scores will be permanently removed.",
    "empty_state": "No sessions for this date."
  },
  "about": {
    "title": "About",
    "version": "Version {{ version }}",
    "built_by": "Built by Fuji Nguyen",
    "github": "View on GitHub",
    "language": "Language"
  },
  "confirm_dialog": {
    "cancel": "Cancel",
    "delete": "Delete",
    "reset": "Reset",
    "regenerate": "Regenerate"
  }
}
```

### `LanguageService`

**File:** `src/app/services/language.service.ts`

```ts
export class LanguageService {
  private readonly STORAGE_KEY = 'pickleball-lang';
  private readonly SUPPORTED = ['en', 'vi', 'zh', 'ja'];
  private readonly DEFAULT = 'en';

  init(): void
  // 1. Check localStorage for persisted preference
  // 2. Detect browser locale (navigator.language, e.g. 'vi-VN' → 'vi')
  // 3. Map to supported language, fall back to 'en'
  // 4. Call translateService.use(lang)

  setLanguage(lang: string): void
  // Save to localStorage, call translateService.use(lang)

  getCurrentLang(): string
  // Returns translateService.currentLang
}
```

Called once in `App` constructor: `languageService.init()`.

### Session Chip Update

Remove hardcoded `S` prefix. Update `app.html`:

```html
📅 {{ selectedDate() | date:'MMM d' }} | {{ selectedSessionNumber() }}
```

This works in all languages without translation (date pipe respects locale automatically).

### Template Updates

All tab templates replace hardcoded strings with the `translate` pipe:

```html
<!-- Before -->
<span>Players</span>
<!-- After -->
<span>{{ 'players.title' | translate }}</span>
```

Dynamic strings in TypeScript use `TranslateService.instant()` with interpolation params where needed:

```ts
this.translate.instant('session_drawer.delete_confirm_title', { number: sessionNumber })
```

### `app.config.ts` Registration

```ts
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useFactory: (http: HttpClient) => new TranslateHttpLoader(http, '/i18n/', '.json'),
    deps: [HttpClient]
  },
  defaultLanguage: 'en'
})
```

---

## Version Injection

This project has no `src/environments/` directory. Version is injected by enabling `resolveJsonModule` in `tsconfig.json` and importing directly in `AboutSheet`:

`tsconfig.json` — add to `compilerOptions`:
```json
"resolveJsonModule": true
```

`src/app/about-sheet/about-sheet.ts`:
```ts
import { version } from '../../../package.json';
// Use `version` directly in the template via a class field: readonly appVersion = version;
```

---

## Files Summary

| File | Change |
|------|--------|
| `public/i18n/en.json` | Create — English strings |
| `public/i18n/vi.json` | Create — Vietnamese strings |
| `public/i18n/zh.json` | Create — Chinese Simplified strings |
| `public/i18n/ja.json` | Create — Japanese strings |
| `src/app/copy-players-sheet/copy-players-sheet.ts` | Create |
| `src/app/copy-players-sheet/copy-players-sheet.html` | Create |
| `src/app/about-sheet/about-sheet.ts` | Create |
| `src/app/about-sheet/about-sheet.html` | Create |
| `src/app/services/language.service.ts` | Create |
| `src/app/services/language.service.spec.ts` | Create |
| `src/app/services/session.service.ts` | Modify — add `importPlayers()` |
| `src/app/services/session.service.spec.ts` | Modify — add `importPlayers()` tests |
| `tsconfig.json` | Modify — add `resolveJsonModule: true` |
| `src/app/app.config.ts` | Modify — register `TranslateModule` |
| `src/app/app.ts` | Modify — `LanguageService.init()`, `openAboutSheet()` |
| `src/app/app.html` | Modify — ℹ button, session chip `date \| number` |
| `src/app/players-tab/players-tab.ts` | Modify — `hasPreviousSessions`, `openCopySheet()` |
| `src/app/players-tab/players-tab.html` | Modify — copy button, translate pipe |
| `src/app/schedule-tab/schedule-tab.html` | Modify — translate pipe |
| `src/app/scores-tab/scores-tab.html` | Modify — translate pipe |
| `src/app/leaderboard-tab/leaderboard-tab.html` | Modify — translate pipe |
| `src/app/session-drawer/session-drawer.ts` | Modify — `TranslateService.instant()` for dialog strings |
| `src/app/session-drawer/session-drawer.html` | Modify — translate pipe |
| `src/app/confirm-dialog/confirm-dialog.html` | Modify — translate pipe |
| `package.json` | Modify — add ngx-translate packages |

---

## Tests

### Unit: `language.service.spec.ts`
- Browser locale `vi-VN` → resolves to `vi`
- Browser locale `zh-TW` → resolves to `zh`
- Unsupported locale → falls back to `en`
- Persisted localStorage value overrides browser locale
- `setLanguage()` updates localStorage and calls `translateService.use()`

### Unit: `session.service.spec.ts` additions
- `importPlayers(['Alice', 'Bob'])` → adds 2 players with unique UUIDs
- Empty/blank names are skipped

### E2E Scenarios

| Scenario | Expected |
|----------|----------|
| Empty player list with prior sessions | Copy button visible |
| Empty player list, no prior sessions | Copy button hidden |
| Copy from Session 1 (8 players) | 8 players added, no rounds copied |
| Browser locale `vi` | App loads in Vietnamese |
| Switch to Japanese in About sheet | UI switches immediately, no reload |
| Language persists across reload | localStorage preference applied |
| Session chip | Shows `May 17 \| 1` — no "S" prefix |
