# Copy Players, About Sheet & i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "copy players from previous session" (#15), an About bottom sheet with version and language selector (#13), and full ngx-translate i18n across all tabs (en/vi/zh/ja).

**Architecture:** Three independent features wired together: CopyPlayersSheet (standalone bottom sheet opened from PlayersTab), AboutSheet (standalone bottom sheet opened from toolbar with embedded language selector), and ngx-translate wired globally via `importProvidersFrom(TranslateModule.forRoot())` in `app.config.ts`. All tab templates switch from hardcoded strings to `translate` pipe. A new `LanguageService` handles locale detection, storage, and switching.

**Tech Stack:** Angular 20 standalone components, Angular Material (MatBottomSheet, MatSelect), `@ngx-translate/core` v16+, `@ngx-translate/http-loader`, translation JSON files in `public/i18n/`.

---

## File Map

| File | Action |
|------|--------|
| `src/app/services/session.service.ts` | Modify — add `importPlayers(names)` |
| `src/app/services/session.service.spec.ts` | Modify — test `importPlayers()` |
| `src/app/services/language.service.ts` | **Create** |
| `src/app/services/language.service.spec.ts` | **Create** |
| `src/app/copy-players-sheet/copy-players-sheet.ts` | **Create** |
| `src/app/copy-players-sheet/copy-players-sheet.html` | **Create** |
| `src/app/about-sheet/about-sheet.ts` | **Create** |
| `src/app/about-sheet/about-sheet.html` | **Create** |
| `src/app/players-tab/players-tab.ts` | Modify — `hasPreviousSessions`, `openCopySheet()` |
| `src/app/players-tab/players-tab.html` | Modify — copy button + translate pipe |
| `src/app/schedule-tab/schedule-tab.ts` | Modify — `TranslateService.instant()` for dialog |
| `src/app/schedule-tab/schedule-tab.html` | Modify — translate pipe |
| `src/app/scores-tab/scores-tab.html` | Modify — translate pipe |
| `src/app/leaderboard-tab/leaderboard-tab.ts` | Modify — `TranslateService.instant()` for dialogs |
| `src/app/leaderboard-tab/leaderboard-tab.html` | Modify — translate pipe |
| `src/app/session-drawer/session-drawer.ts` | Modify — `TranslateService.instant()` for dialog |
| `src/app/session-drawer/session-drawer.html` | Modify — translate pipe |
| `src/app/confirm-dialog/confirm-dialog.html` | Modify — translate pipe on Cancel button |
| `src/app/app.config.ts` | Modify — `provideHttpClient()`, `importProvidersFrom(TranslateModule.forRoot(...))` |
| `src/app/app.ts` | Modify — `LanguageService.init()`, `openAboutSheet()`, import `AboutSheet` |
| `src/app/app.html` | Modify — ℹ button, session chip `date \| number` |
| `public/i18n/en.json` | **Create** |
| `public/i18n/vi.json` | **Create** |
| `public/i18n/zh.json` | **Create** |
| `public/i18n/ja.json` | **Create** |
| `tsconfig.json` | Modify — add `resolveJsonModule: true` |
| `package.json` | Modify — add ngx-translate deps |

---

## Task 1: Install ngx-translate packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd c:/apps/pickleball/roundrobin
npm install @ngx-translate/core @ngx-translate/http-loader
```

Expected output: added 2 packages (or similar), no peer dependency warnings.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@ngx-translate/core'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install ngx-translate packages"
```

---

## Task 2: Add `importPlayers()` to SessionService

**Files:**
- Modify: `src/app/services/session.service.ts`
- Modify: `src/app/services/session.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Open `src/app/services/session.service.spec.ts`. Add these tests inside the existing describe block (after the existing tests):

```typescript
describe('importPlayers', () => {
  it('adds each name as a new player with a unique UUID', () => {
    service.initSession('2026-01-01', 1);
    service.importPlayers(['Alice', 'Bob', 'Carol']);
    const players = service.activeSession()!.players;
    expect(players.length).toBe(3);
    expect(players.map(p => p.name)).toEqual(['Alice', 'Bob', 'Carol']);
    const ids = players.map(p => p.id);
    expect(new Set(ids).size).toBe(3); // all unique
  });

  it('skips blank names', () => {
    service.initSession('2026-01-01', 1);
    service.importPlayers(['Alice', '  ', '', 'Bob']);
    const players = service.activeSession()!.players;
    expect(players.length).toBe(2);
    expect(players.map(p => p.name)).toEqual(['Alice', 'Bob']);
  });

  it('trims whitespace from names', () => {
    service.initSession('2026-01-01', 1);
    service.importPlayers(['  Alice  ']);
    expect(service.activeSession()!.players[0].name).toBe('Alice');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd c:/apps/pickleball/roundrobin
npx ng test --include="src/app/services/session.service.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: 3 failures — `importPlayers is not a function`

- [ ] **Step 3: Implement `importPlayers()`**

In `src/app/services/session.service.ts`, add after `renamePlayer()`:

```typescript
importPlayers(names: string[]): void {
  names.forEach(name => {
    const trimmed = name.trim();
    if (trimmed) this.addPlayer(trimmed);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --include="src/app/services/session.service.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all session service tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/session.service.ts src/app/services/session.service.spec.ts
git commit -m "feat(service): add importPlayers() to SessionService"
```

---

## Task 3: Enable `resolveJsonModule` in tsconfig

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Add resolveJsonModule**

In `tsconfig.json`, add `"resolveJsonModule": true` to `compilerOptions`:

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "resolveJsonModule": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "typeCheckHostBindings": true,
    "strictTemplates": true
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

- [ ] **Step 2: Verify compile**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds (no TypeScript errors).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable resolveJsonModule in tsconfig"
```

---

## Task 4: Create translation files

**Files:**
- Create: `public/i18n/en.json`
- Create: `public/i18n/vi.json`
- Create: `public/i18n/zh.json`
- Create: `public/i18n/ja.json`

- [ ] **Step 1: Create `public/i18n/en.json`**

```json
{
  "toolbar": {
    "session_chip": "{{ date }} | {{ number }}"
  },
  "players": {
    "title": "Players",
    "add_placeholder": "Player name",
    "add_button": "Add",
    "copy_button": "Copy from previous session",
    "copy_sheet_title": "Copy players from...",
    "generate_button": "Generate Schedule ({{ count }} players · 2 courts)",
    "need_more": "Add {{ needed }} more player(s) to generate schedule",
    "empty_state": "Add 8–11 players to get started.",
    "roster_locked_snack": "Roster is locked. Regenerate the schedule first."
  },
  "schedule": {
    "title": "Schedule",
    "empty_state": "Add 8–11 players on the Players tab and generate a schedule.",
    "round": "Round {{ number }}",
    "sitting_out": "Sitting out: {{ names }}",
    "regenerate_button": "Regenerate Schedule",
    "regenerate_confirm_title": "Regenerate Schedule?",
    "regenerate_confirm_message": "All rounds and scores will be cleared. Your player list will be kept.",
    "regenerate_action": "Regenerate"
  },
  "scores": {
    "title": "Scores",
    "empty_state": "Generate a schedule first."
  },
  "leaderboard": {
    "title": "Leaderboard",
    "share_button": "Share QR",
    "sort_wins": "Wins",
    "sort_points": "Points",
    "empty_state": "No scores recorded yet.",
    "stat_line": "{{ wins }} wins · {{ points }} pts · {{ games }} games",
    "reset_button": "Reset Session",
    "reset_confirm_title": "Reset Session?",
    "reset_confirm_message": "All players, rounds, and scores will be cleared.",
    "reset_action": "Reset"
  },
  "session_drawer": {
    "title": "Switch Session",
    "new_session": "+ New Session",
    "delete_confirm_title": "Delete Session {{ number }}?",
    "delete_confirm_message": "All players, rounds, and scores will be permanently removed.",
    "delete_action": "Delete",
    "empty_state": "No sessions for this date yet"
  },
  "about": {
    "title": "About",
    "version": "v{{ version }}",
    "built_by": "Built by Fuji Nguyen",
    "github": "View on GitHub",
    "language_label": "Language"
  },
  "common": {
    "cancel": "Cancel",
    "active": "active"
  }
}
```

- [ ] **Step 2: Create `public/i18n/vi.json`**

```json
{
  "toolbar": {
    "session_chip": "{{ date }} | {{ number }}"
  },
  "players": {
    "title": "Người chơi",
    "add_placeholder": "Tên người chơi",
    "add_button": "Thêm",
    "copy_button": "Sao chép từ buổi trước",
    "copy_sheet_title": "Sao chép người chơi từ...",
    "generate_button": "Tạo lịch ({{ count }} người · 2 sân)",
    "need_more": "Thêm {{ needed }} người nữa để tạo lịch",
    "empty_state": "Thêm 8–11 người để bắt đầu.",
    "roster_locked_snack": "Danh sách đã khóa. Hãy tạo lại lịch trước."
  },
  "schedule": {
    "title": "Lịch thi đấu",
    "empty_state": "Thêm 8–11 người ở tab Người chơi và tạo lịch.",
    "round": "Vòng {{ number }}",
    "sitting_out": "Nghỉ: {{ names }}",
    "regenerate_button": "Tạo lại lịch",
    "regenerate_confirm_title": "Tạo lại lịch?",
    "regenerate_confirm_message": "Tất cả vòng đấu và điểm sẽ bị xóa. Danh sách người chơi được giữ lại.",
    "regenerate_action": "Tạo lại"
  },
  "scores": {
    "title": "Điểm số",
    "empty_state": "Hãy tạo lịch trước."
  },
  "leaderboard": {
    "title": "Bảng xếp hạng",
    "share_button": "Chia sẻ QR",
    "sort_wins": "Thắng",
    "sort_points": "Điểm",
    "empty_state": "Chưa có điểm nào.",
    "stat_line": "{{ wins }} thắng · {{ points }} điểm · {{ games }} trận",
    "reset_button": "Đặt lại phiên",
    "reset_confirm_title": "Đặt lại phiên?",
    "reset_confirm_message": "Tất cả người chơi, vòng đấu và điểm sẽ bị xóa.",
    "reset_action": "Đặt lại"
  },
  "session_drawer": {
    "title": "Chuyển phiên",
    "new_session": "+ Phiên mới",
    "delete_confirm_title": "Xóa phiên {{ number }}?",
    "delete_confirm_message": "Tất cả người chơi, vòng đấu và điểm sẽ bị xóa vĩnh viễn.",
    "delete_action": "Xóa",
    "empty_state": "Chưa có phiên nào cho ngày này"
  },
  "about": {
    "title": "Giới thiệu",
    "version": "v{{ version }}",
    "built_by": "Tạo bởi Fuji Nguyen",
    "github": "Xem trên GitHub",
    "language_label": "Ngôn ngữ"
  },
  "common": {
    "cancel": "Hủy",
    "active": "đang chơi"
  }
}
```

- [ ] **Step 3: Create `public/i18n/zh.json`**

```json
{
  "toolbar": {
    "session_chip": "{{ date }} | {{ number }}"
  },
  "players": {
    "title": "球员",
    "add_placeholder": "球员姓名",
    "add_button": "添加",
    "copy_button": "从上次比赛复制球员",
    "copy_sheet_title": "从以下场次复制球员...",
    "generate_button": "生成赛程（{{ count }} 人 · 2 场地）",
    "need_more": "再添加 {{ needed }} 名球员以生成赛程",
    "empty_state": "添加 8–11 名球员以开始。",
    "roster_locked_snack": "名单已锁定，请先重新生成赛程。"
  },
  "schedule": {
    "title": "赛程",
    "empty_state": "请在球员标签页添加 8–11 名球员并生成赛程。",
    "round": "第 {{ number }} 轮",
    "sitting_out": "本轮休息：{{ names }}",
    "regenerate_button": "重新生成赛程",
    "regenerate_confirm_title": "重新生成赛程？",
    "regenerate_confirm_message": "所有轮次和得分将被清除，球员名单将保留。",
    "regenerate_action": "重新生成"
  },
  "scores": {
    "title": "比分",
    "empty_state": "请先生成赛程。"
  },
  "leaderboard": {
    "title": "排行榜",
    "share_button": "分享 QR",
    "sort_wins": "胜场",
    "sort_points": "积分",
    "empty_state": "暂无得分记录。",
    "stat_line": "{{ wins }} 胜 · {{ points }} 分 · {{ games }} 场",
    "reset_button": "重置本次比赛",
    "reset_confirm_title": "重置本次比赛？",
    "reset_confirm_message": "所有球员、轮次和得分将被清除。",
    "reset_action": "重置"
  },
  "session_drawer": {
    "title": "切换场次",
    "new_session": "+ 新场次",
    "delete_confirm_title": "删除场次 {{ number }}？",
    "delete_confirm_message": "所有球员、轮次和得分将被永久删除。",
    "delete_action": "删除",
    "empty_state": "该日期暂无场次"
  },
  "about": {
    "title": "关于",
    "version": "v{{ version }}",
    "built_by": "开发者：Fuji Nguyen",
    "github": "在 GitHub 上查看",
    "language_label": "语言"
  },
  "common": {
    "cancel": "取消",
    "active": "进行中"
  }
}
```

- [ ] **Step 4: Create `public/i18n/ja.json`**

```json
{
  "toolbar": {
    "session_chip": "{{ date }} | {{ number }}"
  },
  "players": {
    "title": "プレイヤー",
    "add_placeholder": "プレイヤー名",
    "add_button": "追加",
    "copy_button": "前のセッションからコピー",
    "copy_sheet_title": "プレイヤーをコピー...",
    "generate_button": "スケジュール生成（{{ count }} 人 · 2 コート）",
    "need_more": "あと {{ needed }} 人追加してください",
    "empty_state": "8〜11人のプレイヤーを追加してください。",
    "roster_locked_snack": "名簿はロックされています。先にスケジュールを再生成してください。"
  },
  "schedule": {
    "title": "スケジュール",
    "empty_state": "プレイヤータブで8〜11人追加してスケジュールを生成してください。",
    "round": "ラウンド {{ number }}",
    "sitting_out": "休憩中：{{ names }}",
    "regenerate_button": "スケジュール再生成",
    "regenerate_confirm_title": "スケジュールを再生成しますか？",
    "regenerate_confirm_message": "全ラウンドとスコアが削除されます。プレイヤーリストは保持されます。",
    "regenerate_action": "再生成"
  },
  "scores": {
    "title": "スコア",
    "empty_state": "先にスケジュールを生成してください。"
  },
  "leaderboard": {
    "title": "リーダーボード",
    "share_button": "QR 共有",
    "sort_wins": "勝利数",
    "sort_points": "ポイント",
    "empty_state": "まだスコアが記録されていません。",
    "stat_line": "{{ wins }} 勝 · {{ points }} pt · {{ games }} 試合",
    "reset_button": "セッションリセット",
    "reset_confirm_title": "セッションをリセットしますか？",
    "reset_confirm_message": "全プレイヤー、ラウンド、スコアが削除されます。",
    "reset_action": "リセット"
  },
  "session_drawer": {
    "title": "セッション切替",
    "new_session": "+ 新しいセッション",
    "delete_confirm_title": "セッション {{ number }} を削除しますか？",
    "delete_confirm_message": "全プレイヤー、ラウンド、スコアが完全に削除されます。",
    "delete_action": "削除",
    "empty_state": "この日のセッションはまだありません"
  },
  "about": {
    "title": "アプリ情報",
    "version": "v{{ version }}",
    "built_by": "開発：Fuji Nguyen",
    "github": "GitHub で見る",
    "language_label": "言語"
  },
  "common": {
    "cancel": "キャンセル",
    "active": "進行中"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add public/i18n/
git commit -m "feat(i18n): add translation files for en, vi, zh, ja"
```

---

## Task 5: Create `LanguageService`

**Files:**
- Create: `src/app/services/language.service.ts`
- Create: `src/app/services/language.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/services/language.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let translate: TranslateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [LanguageService],
    });
    service = TestBed.inject(LanguageService);
    translate = TestBed.inject(TranslateService);
    translate.addLangs(['en', 'vi', 'zh', 'ja']);
    translate.setDefaultLang('en');
  });

  it('falls back to "en" for unsupported browser locale', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('fr-FR');
    service.init();
    expect(translate.currentLang).toBe('en');
  });

  it('detects "vi" from browser locale "vi-VN"', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('vi-VN');
    service.init();
    expect(translate.currentLang).toBe('vi');
  });

  it('detects "zh" from browser locale "zh-TW"', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('zh-TW');
    service.init();
    expect(translate.currentLang).toBe('zh');
  });

  it('uses persisted localStorage value over browser locale', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('vi-VN');
    localStorage.setItem('pickleball-lang', 'ja');
    service.init();
    expect(translate.currentLang).toBe('ja');
  });

  it('setLanguage() saves to localStorage and switches language', () => {
    service.init();
    service.setLanguage('zh');
    expect(localStorage.getItem('pickleball-lang')).toBe('zh');
    expect(translate.currentLang).toBe('zh');
  });

  it('getCurrentLang() returns the active language', () => {
    service.init();
    service.setLanguage('vi');
    expect(service.getCurrentLang()).toBe('vi');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx ng test --include="src/app/services/language.service.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: compilation error — `LanguageService` not found.

- [ ] **Step 3: Create `LanguageService`**

Create `src/app/services/language.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'pickleball-lang';
  private readonly SUPPORTED = ['en', 'vi', 'zh', 'ja'];
  private readonly DEFAULT = 'en';

  init(): void {
    const persisted = localStorage.getItem(this.STORAGE_KEY);
    if (persisted && this.SUPPORTED.includes(persisted)) {
      this.translate.use(persisted);
      return;
    }
    const browserLang = navigator.language.split('-')[0];
    const lang = this.SUPPORTED.includes(browserLang) ? browserLang : this.DEFAULT;
    this.translate.use(lang);
  }

  setLanguage(lang: string): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.translate.use(lang);
  }

  getCurrentLang(): string {
    return this.translate.currentLang;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --include="src/app/services/language.service.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/language.service.ts src/app/services/language.service.spec.ts
git commit -m "feat(i18n): add LanguageService with locale detection and persistence"
```

---

## Task 6: Wire TranslateModule in `app.config.ts`

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Update `app.config.ts`**

Replace the entire file contents:

```typescript
import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, '/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ),
  ],
};
```

- [ ] **Step 2: Verify build compiles**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(i18n): wire TranslateModule and HttpClient in app.config"
```

---

## Task 7: Create `CopyPlayersSheet`

**Files:**
- Create: `src/app/copy-players-sheet/copy-players-sheet.ts`
- Create: `src/app/copy-players-sheet/copy-players-sheet.html`

The sheet receives the current session key (date + sessionNumber) so it can exclude it from the list. It reads all other sessions from `SessionService`, groups by date descending, and presents them as a flat list.

- [ ] **Step 1: Create `copy-players-sheet.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';

export interface CopyPlayersSheetData {
  currentDate: string;
  currentSessionNumber: number;
}

export interface SessionSummary {
  date: string;
  sessionNumber: number;
  playerCount: number;
}

@Component({
  selector: 'app-copy-players-sheet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, TranslateModule],
  templateUrl: './copy-players-sheet.html',
})
export class CopyPlayersSheet {
  private readonly sheetRef = inject(MatBottomSheetRef<CopyPlayersSheet>);
  private readonly sessionService = inject(SessionService);
  readonly data = inject<CopyPlayersSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly grouped: { date: string; sessions: SessionSummary[] }[];

  constructor() {
    const dates = this.sessionService.getSavedDates(); // newest first
    this.grouped = dates.map(date => {
      const numbers = this.sessionService.getSavedSessionsForDate(date);
      const sessions: SessionSummary[] = numbers
        .filter(n => !(date === this.data.currentDate && n === this.data.currentSessionNumber))
        .map(n => {
          const session = this.sessionService.loadSession(date, n);
          return { date, sessionNumber: n, playerCount: session?.players.length ?? 0 };
        });
      return { date, sessions };
    }).filter(g => g.sessions.length > 0);
  }

  select(summary: SessionSummary): void {
    const session = this.sessionService.loadSession(summary.date, summary.sessionNumber);
    if (!session) return;
    const names = session.players.map(p => p.name);
    this.sessionService.importPlayers(names);
    this.sheetRef.dismiss();
  }
}
```

- [ ] **Step 2: Create `copy-players-sheet.html`**

```html
<div style="padding:16px; max-width:400px; margin:0 auto;">
  <h3 style="margin:0 0 16px; color:#52b788; font-size:16px; font-weight:600;">
    {{ 'players.copy_sheet_title' | translate }}
  </h3>

  @for (group of grouped; track group.date) {
    <div style="font-size:11px; color:#aaa; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; margin-top:12px;">
      {{ group.date | date:'MMM d, yyyy' }}
    </div>
    @for (session of group.sessions; track session.sessionNumber) {
      <button
        mat-stroked-button
        (click)="select(session)"
        style="width:100%; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; text-align:left;"
      >
        <span>Session {{ session.sessionNumber }}</span>
        <span style="font-size:12px; color:#aaa;">{{ session.playerCount }} players</span>
      </button>
    }
  }
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/copy-players-sheet/
git commit -m "feat: add CopyPlayersSheet bottom sheet component"
```

---

## Task 8: Update `PlayersTab` with copy button

**Files:**
- Modify: `src/app/players-tab/players-tab.ts`
- Modify: `src/app/players-tab/players-tab.html`

- [ ] **Step 1: Update `players-tab.ts`**

Replace the entire file contents:

```typescript
import { Component, Input, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ScheduleService } from '../services/schedule.service';
import { CopyPlayersSheet, CopyPlayersSheetData } from '../copy-players-sheet/copy-players-sheet';

@Component({
  selector: 'app-players-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './players-tab.html',
})
export class PlayersTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly scheduleService = inject(ScheduleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly translate = inject(TranslateService);

  newName = signal('');
  editingId = signal<string | null>(null);
  editName = signal('');

  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);
  readonly canAdd = computed(() => this.players().length < 11 && this.newName().trim().length > 0);
  readonly canGenerate = computed(() => this.players().length >= 8);
  readonly scheduleGenerated = computed(() =>
    (this.sessionService.activeSession()?.rounds.length ?? 0) > 0
  );
  readonly hasPreviousSessions = computed(() => {
    const active = this.sessionService.activeSession();
    if (!active) return false;
    const dates = this.sessionService.getSavedDates();
    return dates.some(date => {
      const numbers = this.sessionService.getSavedSessionsForDate(date);
      return numbers.some(n => !(date === active.date && n === active.sessionNumber));
    });
  });

  addPlayer(): void {
    if (!this.canAdd()) return;
    this.sessionService.addPlayer(this.newName());
    this.newName.set('');
    this.cdr.detectChanges();
  }

  removePlayer(id: string): void {
    if (this.scheduleGenerated()) {
      this.snackBar.open(
        this.translate.instant('players.roster_locked_snack'),
        this.translate.instant('common.cancel'),
        { duration: 3000 }
      );
      return;
    }
    this.sessionService.removePlayer(id);
  }

  startEdit(player: { id: string; name: string }): void {
    this.editingId.set(player.id);
    this.editName.set(player.name);
  }

  saveEdit(id: string): void {
    if (!this.editName().trim()) return;
    this.sessionService.renamePlayer(id, this.editName());
    this.editingId.set(null);
    this.editName.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName.set('');
  }

  openCopySheet(): void {
    const active = this.sessionService.activeSession();
    if (!active) return;
    this.bottomSheet.open(CopyPlayersSheet, {
      data: {
        currentDate: active.date,
        currentSessionNumber: active.sessionNumber,
      } as CopyPlayersSheetData,
    });
  }

  generateSchedule(): void {
    const session = this.sessionService.activeSession();
    if (!session || !this.canGenerate()) return;
    const hasExisting = session.rounds.length > 0;
    if (hasExisting) {
      const ok = confirm('This will clear the existing schedule and all scores. Continue?');
      if (!ok) return;
    }
    const rounds = this.scheduleService.generateRounds(session.players);
    this.sessionService.setRounds(rounds);
  }

  onKeydown(event: KeyboardEvent, inputEl?: HTMLInputElement): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addPlayer();
      if (inputEl) inputEl.value = '';
    }
  }
}
```

- [ ] **Step 2: Update `players-tab.html`**

Replace the entire file contents:

```html
<div style="max-width:500px; margin:0 auto;">

  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
    <h2 style="margin:0; color:#52b788;">{{ 'players.title' | translate }}</h2>
    <span class="status-badge" [class]="players().length >= 8 ? 'badge-completed' : 'badge-upcoming'">
      {{ players().length }} / 11
    </span>
  </div>

  @if (!readOnly) {
    <div style="display:flex; gap:8px; margin-bottom:16px; align-items:flex-start;">
      <mat-form-field appearance="outline" style="flex:1;">
        <mat-label>{{ 'players.add_placeholder' | translate }}</mat-label>
        <input #nameInput matInput [ngModel]="newName()" (ngModelChange)="newName.set($event)" (keydown)="onKeydown($event, nameInput)" maxlength="30" />
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="addPlayer()" [disabled]="!canAdd()"
              style="margin-top:4px;">
        {{ 'players.add_button' | translate }}
      </button>
    </div>
  }

  @if (players().length === 0) {
    <p class="text-muted" style="text-align:center;">{{ 'players.empty_state' | translate }}</p>
    @if (!readOnly && hasPreviousSessions()) {
      <button
        mat-stroked-button
        (click)="openCopySheet()"
        style="width:100%; border-style:dashed; color:#89b4fa; border-color:#89b4fa; margin-top:8px;"
      >
        📋 {{ 'players.copy_button' | translate }}
      </button>
    }
  }

  <div>
    @for (player of players(); track player.id; let i = $index) {
      <div style="background:#2a2a3e; border-radius:8px; margin-bottom:6px; display:flex; align-items:center; min-height:56px; padding:0 8px 0 16px;">

        @if (editingId() === player.id) {
          <mat-form-field appearance="outline" style="flex:1; margin:4px 0;">
            <input matInput [ngModel]="editName()" (ngModelChange)="editName.set($event)"
                   (keydown.enter)="saveEdit(player.id)"
                   (keydown.escape)="cancelEdit()"
                   maxlength="30"
                   [attr.aria-label]="'Edit name for ' + player.name" />
            @if (!editName().trim()) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>
          <button mat-icon-button color="primary" (click)="saveEdit(player.id)"
                  [disabled]="!editName().trim()"
                  aria-label="Save name">
            <mat-icon>check</mat-icon>
          </button>
          <button mat-icon-button (click)="cancelEdit()" aria-label="Cancel edit">
            <mat-icon>close</mat-icon>
          </button>
        } @else {
          <span style="flex:1; font-size:18px;">{{ i + 1 }}. {{ player.name }}</span>
          @if (!readOnly) {
            <button mat-icon-button color="primary" (click)="startEdit(player)"
                    [attr.aria-label]="'Edit ' + player.name">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="removePlayer(player.id)"
                    [disabled]="scheduleGenerated()"
                    [matTooltip]="scheduleGenerated() ? 'Cannot remove players after the schedule has been generated. Use Regenerate Schedule on the Schedule tab to start over.' : ''"
                    [attr.aria-label]="'Remove ' + player.name">
              <mat-icon>delete</mat-icon>
            </button>
          }
        }

      </div>
    }
  </div>

  @if (!readOnly && canGenerate()) {
    <button mat-raised-button color="primary" style="width:100%; margin-top:16px;"
            (click)="generateSchedule()">
      {{ 'players.generate_button' | translate:{ count: players().length } }}
    </button>
  }

  @if (!readOnly && players().length > 0 && players().length < 8) {
    <p class="text-muted" style="text-align:center; margin-top:8px;">
      {{ 'players.need_more' | translate:{ needed: 8 - players().length } }}
    </p>
  }

</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/players-tab/ src/app/copy-players-sheet/
git commit -m "feat(#15): add copy players from previous session"
```

---

## Task 9: Create `AboutSheet`

**Files:**
- Create: `src/app/about-sheet/about-sheet.ts`
- Create: `src/app/about-sheet/about-sheet.html`
- Modify: `tsconfig.json` (already done in Task 3)

- [ ] **Step 1: Create `about-sheet.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { version } from '../../../package.json';

@Component({
  selector: 'app-about-sheet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatSelectModule, MatFormFieldModule, FormsModule, TranslateModule],
  templateUrl: './about-sheet.html',
})
export class AboutSheet {
  private readonly sheetRef = inject(MatBottomSheetRef<AboutSheet>);
  private readonly languageService = inject(LanguageService);

  readonly appVersion = version;
  readonly githubUrl = 'https://github.com/workcontrolgit/roundrobin';

  readonly languages = [
    { code: 'en', label: 'English' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
  ];

  selectedLang = signal(this.languageService.getCurrentLang());

  onLangChange(lang: string): void {
    this.selectedLang.set(lang);
    this.languageService.setLanguage(lang);
  }

  close(): void {
    this.sheetRef.dismiss();
  }
}
```

- [ ] **Step 2: Create `about-sheet.html`**

```html
<div style="padding:16px; max-width:400px; margin:0 auto;">
  <div style="text-align:center; padding-bottom:16px; border-bottom:1px solid #333; margin-bottom:16px;">
    <img src="icon.svg" alt="RB" style="width:48px; height:48px; border-radius:10px; margin-bottom:8px;">
    <div style="color:#52b788; font-weight:700; font-size:17px;">Pickleball Round Robin</div>
    <div style="color:#aaa; font-size:13px;">{{ 'about.version' | translate:{ version: appVersion } }}</div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="color:#e0e0e0; font-size:14px; margin-bottom:8px;">{{ 'about.built_by' | translate }}</div>
    <a [href]="githubUrl" target="_blank" rel="noopener"
       style="color:#89b4fa; font-size:14px; text-decoration:underline;">
      {{ 'about.github' | translate }} ↗
    </a>
  </div>

  <div>
    <mat-form-field appearance="outline" style="width:100%;">
      <mat-label>{{ 'about.language_label' | translate }}</mat-label>
      <mat-select [value]="selectedLang()" (selectionChange)="onLangChange($event.value)">
        @for (lang of languages; track lang.code) {
          <mat-option [value]="lang.code">{{ lang.label }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  </div>
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/about-sheet/
git commit -m "feat(#13): add AboutSheet with version and language selector"
```

---

## Task 10: Update App shell

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`

- [ ] **Step 1: Update `app.ts`**

Replace the entire file contents:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from './services/session.service';
import { LanguageService } from './services/language.service';
import { PlayersTab } from './players-tab/players-tab';
import { ScheduleTab } from './schedule-tab/schedule-tab';
import { ScoresTab } from './scores-tab/scores-tab';
import { LeaderboardTab } from './leaderboard-tab/leaderboard-tab';
import { SessionDrawer, SessionDrawerData, SessionDrawerResult } from './session-drawer/session-drawer';
import { AboutSheet } from './about-sheet/about-sheet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatBottomSheetModule,
    TranslateModule,
    PlayersTab, ScheduleTab, ScoresTab, LeaderboardTab,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  selectedDate = signal<string>('');
  selectedSessionNumber = signal<number>(1);
  readonly isReadOnly = signal<boolean>(false);

  constructor(
    readonly sessionService: SessionService,
    private readonly bottomSheet: MatBottomSheet,
    private readonly languageService: LanguageService,
  ) {
    this.languageService.init();
  }

  ngOnInit(): void {
    this.loadFromHash();
    window.addEventListener('hashchange', () => this.loadFromHash());
  }

  private loadFromHash(): void {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const shared = this.sessionService.decodeSessionFromHash(hash);
      if (shared) {
        this.sessionService.loadSharedSession(shared);
        this.isReadOnly.set(true);
        return;
      }
    }
    this.sessionService.migrateOldKeys();
    const today = this.sessionService.todayDate();
    this.sessionService.initSession(today, 1);
    this.selectedDate.set(today);
    this.selectedSessionNumber.set(1);
  }

  openSessionDrawer(): void {
    const ref = this.bottomSheet.open(SessionDrawer, {
      data: {
        currentDate: this.selectedDate(),
        currentSessionNumber: this.selectedSessionNumber(),
      } as SessionDrawerData,
    });
    ref.afterDismissed().subscribe((result?: SessionDrawerResult) => {
      if (!result) return;
      if (result.deleted) {
        this.onSessionDeleted(result.date, result.sessionNumber);
      } else {
        this.onSessionChange(result.date, result.sessionNumber);
      }
    });
  }

  openAboutSheet(): void {
    this.bottomSheet.open(AboutSheet);
  }

  onSessionDeleted(date: string, deletedNumber: number): void {
    const remaining = this.sessionService.getSavedSessionsForDate(date);
    const next = remaining.length > 0 ? remaining[0] : 1;
    if (remaining.length === 0) {
      this.sessionService.initSession(date, 1);
    }
    this.onSessionChange(date, next);
  }

  onSessionChange(date: string, sessionNumber: number): void {
    this.selectedDate.set(date);
    this.selectedSessionNumber.set(sessionNumber);
    this.sessionService.initSession(date, sessionNumber);
  }

  isToday(): boolean {
    return this.selectedDate() === this.sessionService.todayDate();
  }
}
```

- [ ] **Step 2: Update `app.html`**

Replace the entire file contents:

```html
<mat-toolbar color="primary" style="background:#1a1a2e; position:sticky; top:0; z-index:10;">
  <img src="icon.svg" alt="RB" style="width:28px; height:28px; margin-right:8px; border-radius:6px; vertical-align:middle;">
  <span style="font-weight:bold; color:#52b788; font-size:18px;">Pickleball Round Robin</span>
  <span style="flex:1"></span>

  <button mat-icon-button (click)="openAboutSheet()"
          style="color:#89b4fa;"
          aria-label="About">
    <mat-icon>info</mat-icon>
  </button>

  @if (!isReadOnly()) {
    <button
      mat-button
      (click)="openSessionDrawer()"
      style="color:#89b4fa; font-size:13px; border:1px solid #444; border-radius:16px; padding:4px 14px; line-height:1.5;"
    >
      📅 {{ selectedDate() | date:'MMM d' }} | {{ selectedSessionNumber() }} ▾
    </button>
  } @else {
    <span style="font-size:14px; color:#89b4fa;">👁 View Only</span>
  }
</mat-toolbar>

@if (isReadOnly()) {
  <div style="text-align:center; padding:10px; background:#1a2a3a; color:#89b4fa; font-size:14px;">
    Shared session — read only
  </div>
}

<mat-tab-group mat-stretch-tabs="false" animationDuration="200ms" style="margin-top:4px;">
  <mat-tab label="Players">
    <app-players-tab [readOnly]="isReadOnly()" />
  </mat-tab>
  <mat-tab label="Schedule">
    <app-schedule-tab />
  </mat-tab>
  <mat-tab label="Scores">
    <app-scores-tab [readOnly]="isReadOnly()" />
  </mat-tab>
  <mat-tab label="Leaderboard">
    <app-leaderboard-tab [readOnly]="isReadOnly()" />
  </mat-tab>
</mat-tab-group>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.ts src/app/app.html
git commit -m "feat(#13): wire AboutSheet and LanguageService into app shell"
```

---

## Task 11: Translate `ScheduleTab`

**Files:**
- Modify: `src/app/schedule-tab/schedule-tab.ts`
- Modify: `src/app/schedule-tab/schedule-tab.html`

- [ ] **Step 1: Update `schedule-tab.ts`**

Replace the entire file contents:

```typescript
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatDialogModule, TranslateModule],
  templateUrl: './schedule-tab.html',
})
export class ScheduleTab {
  readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  readonly activeRoundIndex = computed(() => {
    const rounds = this.rounds();
    for (let i = 0; i < rounds.length; i++) {
      const allScored = rounds[i].courts.every(c => c.score != null);
      if (!allScored) return i;
    }
    return rounds.length;
  });

  roundStatus(index: number): 'completed' | 'active' | 'upcoming' {
    const active = this.activeRoundIndex();
    if (index < active) return 'completed';
    if (index === active) return 'active';
    return 'upcoming';
  }

  playerName(id: string): string {
    return this.players().find(p => p.id === id)?.name ?? id;
  }

  sittingOutNames(ids: string[]): string {
    return ids.map(id => this.playerName(id)).join(', ');
  }

  openRegenerateDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('schedule.regenerate_confirm_title'),
        message: this.translate.instant('schedule.regenerate_confirm_message'),
        actions: [{ label: this.translate.instant('schedule.regenerate_action'), value: 'regenerate', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'regenerate') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetRoundsAndScores(session.date, session.sessionNumber);
    });
  }
}
```

- [ ] **Step 2: Update `schedule-tab.html`**

Replace the entire file contents:

```html
<div style="max-width:500px; margin:0 auto;">
  <h2 style="color:#52b788;">{{ 'schedule.title' | translate }}</h2>

  @if (rounds().length === 0) {
    <p class="text-muted" style="text-align:center;">
      {{ 'schedule.empty_state' | translate }}
    </p>
  }

  @for (round of rounds(); track round.roundNumber; let i = $index) {
    <mat-card class="round-card" [class]="roundStatus(i)"
              [attr.aria-label]="('schedule.round' | translate:{ number: round.roundNumber }) + ', ' + roundStatus(i)">
      <mat-card-header>
        <mat-card-title style="font-size:16px; font-weight:bold;">
          {{ 'schedule.round' | translate:{ number: round.roundNumber } }}
        </mat-card-title>
        <span style="flex:1;"></span>
        <span class="status-badge" [class]="'badge-' + roundStatus(i)">
          {{ roundStatus(i) === 'active' ? ('common.active' | translate | uppercase) : (roundStatus(i) | uppercase) }}
        </span>
      </mat-card-header>

      <mat-card-content style="margin-top:12px;">
        @for (court of round.courts; track court.courtName) {
          <div style="margin-bottom:10px;">
            <div class="text-muted text-small" style="margin-bottom:4px; font-weight:bold;">
              {{ court.courtName }}
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:16px; flex-wrap:wrap;">
              <span>{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
              @if (court.score) {
                <span class="score-display">
                  {{ court.score.team1 }}–{{ court.score.team2 }}
                </span>
              } @else {
                <span class="text-muted">vs</span>
              }
              <span>{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
            </div>
          </div>
        }

        @if (round.sittingOut.length > 0) {
          <div class="text-muted text-small" style="margin-top:6px;">
            {{ 'schedule.sitting_out' | translate:{ names: sittingOutNames(round.sittingOut) } }}
          </div>
        }
      </mat-card-content>
    </mat-card>
  }

  @if (rounds().length > 0) {
    <button mat-stroked-button color="warn" style="width:100%; margin-top:16px;"
            (click)="openRegenerateDialog()">
      {{ 'schedule.regenerate_button' | translate }}
    </button>
  }
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/schedule-tab/
git commit -m "feat(i18n): translate schedule tab"
```

---

## Task 12: Translate `ScoresTab`

**Files:**
- Modify: `src/app/scores-tab/scores-tab.html`
- Modify: `src/app/scores-tab/scores-tab.ts`

- [ ] **Step 1: Add TranslateModule import to `scores-tab.ts`**

Open `src/app/scores-tab/scores-tab.ts`. Add `TranslateModule` to the imports array and `TranslateModule` import at the top.

The existing imports array will have entries like `CommonModule, FormsModule, MatCardModule, ...`. Add `TranslateModule` to the list.

At the top of the file add:
```typescript
import { TranslateModule } from '@ngx-translate/core';
```

In the `@Component` imports array, add `TranslateModule` to the existing list.

- [ ] **Step 2: Update `scores-tab.html`**

Replace only the heading and empty state lines (the score inputs have no translatable static text beyond Round/Court labels, which are data-driven):

```html
<div style="max-width:500px; margin:0 auto;">
  <h2 style="color:#52b788;">{{ 'scores.title' | translate }}</h2>

  @if (rounds().length === 0) {
    <p class="text-muted" style="text-align:center;">{{ 'scores.empty_state' | translate }}</p>
  }

  @for (round of rounds(); track round.roundNumber; let ri = $index) {
    <mat-card class="round-card"
              [class.active]="ri === activeRoundIndex()"
              [class.completed]="ri < activeRoundIndex()"
              [class.upcoming]="ri > activeRoundIndex()">
      <mat-card-header>
        <mat-card-title style="font-size:14px;">{{ 'schedule.round' | translate:{ number: round.roundNumber } }}</mat-card-title>
      </mat-card-header>

      <mat-card-content style="margin-top:12px;">
        @for (court of round.courts; track court.courtName) {
          <div style="margin-bottom:14px;">
            <div class="text-muted text-small" style="margin-bottom:6px;">{{ court.courtName }}</div>

            @if (court.score) {
              <!-- Completed — show editable score -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team1"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#a6e3a1; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team2"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 2 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#f38ba8; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
              </div>
            } @else if (ri === activeRoundIndex() && !readOnly) {
              <!-- Active — score entry with auto-save on blur -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input #activeInput type="number" min="0" placeholder="0"
                       data-active-input
                       [ngModel]="getPending(ri, court.courtName).team1Score"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0" placeholder="0"
                       [ngModel]="getPending(ri, court.courtName).team2Score"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [attr.aria-label]="court.courtName + ' team 2 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
              </div>
            } @else {
              <!-- Upcoming -->
              <div class="text-muted" style="font-size:13px;">
                {{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}
                vs
                {{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}
              </div>
            }
          </div>
        }
      </mat-card-content>
    </mat-card>
  }
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/scores-tab/
git commit -m "feat(i18n): translate scores tab"
```

---

## Task 13: Translate `LeaderboardTab`

**Files:**
- Modify: `src/app/leaderboard-tab/leaderboard-tab.ts`
- Modify: `src/app/leaderboard-tab/leaderboard-tab.html`

- [ ] **Step 1: Update `leaderboard-tab.ts`**

Replace the entire file contents:

```typescript
import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ShareDialog } from '../share-dialog/share-dialog';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-leaderboard-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatDialogModule, TranslateModule],
  templateUrl: './leaderboard-tab.html',
})
export class LeaderboardTab {
  @Input() readOnly = false;

  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  sortBy = signal<'wins' | 'points'>('wins');

  readonly stats = computed(() => {
    const raw = this.sessionService.getPlayerStats();
    const by = this.sortBy();
    return [...raw].sort((a, b) =>
      by === 'wins'
        ? b.wins !== a.wins ? b.wins - a.wins : b.totalPoints - a.totalPoints
        : b.totalPoints !== a.totalPoints ? b.totalPoints - a.totalPoints : b.wins - a.wins
    );
  });

  readonly hasScores = computed(() =>
    this.sessionService.getPlayerStats().some(s => s.gamesPlayed > 0)
  );

  medal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? '';
  }

  openResetDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('leaderboard.reset_confirm_title'),
        message: this.translate.instant('leaderboard.reset_confirm_message'),
        actions: [{ label: this.translate.instant('leaderboard.reset_action'), value: 'all', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'all') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetEverything(session.date, session.sessionNumber);
    });
  }

  openShare(): void {
    const session = this.sessionService.activeSession();
    if (!session) return;
    const encoded = this.sessionService.encodeSessionToHash(session);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    this.dialog.open(ShareDialog, { data: { url }, width: '320px' });
  }
}
```

- [ ] **Step 2: Update `leaderboard-tab.html`**

Replace the entire file contents:

```html
<div style="max-width:500px; margin:0 auto;">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
    <h2 style="margin:0; color:#52b788;">{{ 'leaderboard.title' | translate }}</h2>
    @if (!readOnly) {
      <button mat-stroked-button color="primary" (click)="openShare()">
        {{ 'leaderboard.share_button' | translate }}
      </button>
    }
  </div>

  <mat-button-toggle-group [value]="sortBy()" (change)="sortBy.set($event.value)"
                           aria-label="Sort leaderboard by"
                           style="margin-bottom:16px; width:100%;">
    <mat-button-toggle value="wins" style="flex:1;">{{ 'leaderboard.sort_wins' | translate }}</mat-button-toggle>
    <mat-button-toggle value="points" style="flex:1;">{{ 'leaderboard.sort_points' | translate }}</mat-button-toggle>
  </mat-button-toggle-group>

  @if (!hasScores()) {
    <p class="text-muted" style="text-align:center;">{{ 'leaderboard.empty_state' | translate }}</p>
  } @else {
    @for (entry of stats(); track entry.player.id; let i = $index) {
      <mat-card class="round-card" style="margin-bottom:8px;" role="row"
                [attr.aria-label]="'Rank ' + (i+1) + ': ' + entry.player.name + ', ' + entry.wins + ' wins, ' + entry.totalPoints + ' points'">
        <mat-card-content style="padding:12px !important;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:22px; width:32px; text-align:center;" aria-hidden="true">
              {{ medal(i) || (i + 1) }}
            </span>
            <div style="flex:1;">
              <div class="player-name">{{ entry.player.name }}</div>
              <div class="player-stat text-muted">
                {{ 'leaderboard.stat_line' | translate:{ wins: entry.wins, points: entry.totalPoints, games: entry.gamesPlayed } }}
              </div>
            </div>
            <span class="status-badge badge-completed">
              {{ sortBy() === 'wins' ? entry.wins + 'W' : entry.totalPoints + 'pts' }}
            </span>
          </div>
        </mat-card-content>
      </mat-card>
    }
  }

  @if (!readOnly) {
    <button mat-stroked-button color="warn" style="width:100%; margin-top:24px;" (click)="openResetDialog()">
      {{ 'leaderboard.reset_button' | translate }}
    </button>
  }
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/leaderboard-tab/
git commit -m "feat(i18n): translate leaderboard tab"
```

---

## Task 14: Translate `SessionDrawer` and `ConfirmDialog`

**Files:**
- Modify: `src/app/session-drawer/session-drawer.ts`
- Modify: `src/app/session-drawer/session-drawer.html`
- Modify: `src/app/confirm-dialog/confirm-dialog.html`
- Modify: `src/app/confirm-dialog/confirm-dialog.ts`

- [ ] **Step 1: Update `session-drawer.ts`**

Replace the entire file contents:

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

export interface SessionDrawerData {
  currentDate: string;
  currentSessionNumber: number;
}

export interface SessionDrawerResult {
  date: string;
  sessionNumber: number;
  deleted?: boolean;
}

@Component({
  selector: 'app-session-drawer',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule, TranslateModule],
  templateUrl: './session-drawer.html',
})
export class SessionDrawer {
  private readonly sheetRef = inject(MatBottomSheetRef<SessionDrawer, SessionDrawerResult>);
  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  readonly data = inject<SessionDrawerData>(MAT_BOTTOM_SHEET_DATA);

  selectedDate = signal<string>(this.data.currentDate);
  sessions = signal<number[]>([]);

  constructor() {
    this.refreshSessions();
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.refreshSessions();
  }

  private refreshSessions(): void {
    this.sessions.set(this.sessionService.getSavedSessionsForDate(this.selectedDate()));
  }

  selectSession(sessionNumber: number): void {
    this.sheetRef.dismiss({ date: this.selectedDate(), sessionNumber });
  }

  addNewSession(): void {
    const date = this.selectedDate();
    const sessionNumber = this.sessionService.getNextSessionNumber(date);
    this.sheetRef.dismiss({ date, sessionNumber });
  }

  isCurrentSession(n: number): boolean {
    return n === this.data.currentSessionNumber && this.selectedDate() === this.data.currentDate;
  }

  openDeleteDialog(sessionNumber: number): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('session_drawer.delete_confirm_title', { number: sessionNumber }),
        message: this.translate.instant('session_drawer.delete_confirm_message'),
        actions: [{ label: this.translate.instant('session_drawer.delete_action'), value: 'delete', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'delete') return;
      this.sessionService.clearSession(this.selectedDate(), sessionNumber);
      this.sheetRef.dismiss({
        date: this.selectedDate(),
        sessionNumber,
        deleted: true,
      });
    });
  }
}
```

- [ ] **Step 2: Update `session-drawer.html`**

Replace the entire file contents:

```html
<div style="padding:16px; max-width:400px; margin:0 auto;">
  <h3 style="margin:0 0 16px; color:#52b788; font-size:16px; font-weight:600;">
    {{ 'session_drawer.title' | translate }}
  </h3>

  <div style="margin-bottom:16px;">
    <label style="display:block; font-size:12px; color:#aaa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Date</label>
    <input
      type="date"
      [ngModel]="selectedDate()"
      (ngModelChange)="onDateChange($event)"
      style="width:100%; background:#2a2a4e; color:#e0e0e0; border:1px solid #52b788; border-radius:4px; padding:8px 10px; font-size:14px; box-sizing:border-box;"
    />
  </div>

  <div style="margin-bottom:12px;">
    @for (n of sessions(); track n) {
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <button
          mat-stroked-button
          (click)="selectSession(n)"
          style="flex:1;"
          [style.background]="isCurrentSession(n) ? '#52b788' : 'transparent'"
          [style.color]="isCurrentSession(n) ? '#1a1a2e' : '#e0e0e0'"
          [style.border-color]="isCurrentSession(n) ? '#52b788' : '#444'"
        >
          Session {{ n }}
          @if (isCurrentSession(n)) {
            <span style="margin-left:8px; font-size:11px; opacity:0.8;">✓ {{ 'common.active' | translate }}</span>
          }
        </button>
        <button mat-icon-button color="warn" (click)="openDeleteDialog(n)"
                [attr.aria-label]="'Delete session ' + n">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    }
    @if (sessions().length === 0) {
      <p style="color:#aaa; font-size:13px; text-align:center; margin:12px 0;">
        {{ 'session_drawer.empty_state' | translate }}
      </p>
    }
  </div>

  <button
    mat-stroked-button
    (click)="addNewSession()"
    style="width:100%; border-style:dashed; color:#52b788; border-color:#52b788;"
  >
    {{ 'session_drawer.new_session' | translate }}
  </button>
</div>
```

- [ ] **Step 3: Update `confirm-dialog.html`**

Replace with:

```html
<h2 mat-dialog-title>{{ data.title }}</h2>
<mat-dialog-content>
  <p class="text-muted" style="margin:0;">{{ data.message }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end" style="gap:8px; padding:16px;">
  <button mat-stroked-button (click)="cancel()">{{ 'common.cancel' | translate }}</button>
  @for (action of data.actions; track action.value) {
    <button mat-raised-button [color]="action.color ?? 'primary'" (click)="confirm(action.value)">
      {{ action.label }}
    </button>
  }
</mat-dialog-actions>
```

- [ ] **Step 4: Add `TranslateModule` to `confirm-dialog.ts` imports**

Open `src/app/confirm-dialog/confirm-dialog.ts`. Add `TranslateModule` to the `imports` array in `@Component` and the corresponding import at the top:

```typescript
import { TranslateModule } from '@ngx-translate/core';
```

In `@Component`, add `TranslateModule` to the `imports` array alongside the existing Material imports.

- [ ] **Step 5: Verify full build**

```bash
npx ng build --configuration=development 2>&1 | tail -10
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/session-drawer/ src/app/confirm-dialog/
git commit -m "feat(i18n): translate session drawer and confirm dialog"
```

---

## Task 15: Smoke test and final verification

- [ ] **Step 1: Run all unit tests**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: all tests pass (no regressions).

- [ ] **Step 2: Start dev server and manual smoke test**

```bash
npx ng serve --open
```

Verify in browser:
- Players tab loads in English with "Players" heading
- ℹ button in toolbar opens About sheet with version number and language dropdown
- Switch language to Vietnamese → UI text changes immediately, no reload
- Refresh page → Vietnamese persists
- Create a second session, go back to session 1 (empty player list) → "Copy from previous session" button appears
- Tap copy → sheet shows session 2 → tap → players copied instantly
- Schedule tab: "Regenerate Schedule?" dialog uses translated strings
- Leaderboard tab: "Reset Session?" dialog uses translated strings

- [ ] **Step 3: Close dev server and commit if needed**

If any minor fixes were made during smoke test, commit them:

```bash
git add -p
git commit -m "fix(i18n): smoke test corrections"
```

- [ ] **Step 4: Close visual companion server**

```bash
"C:\Users\Fuji Nguyen\.claude\plugins\cache\claude-plugins-official\superpowers\5.1.0\skills\brainstorming\scripts\stop-server.sh" c:/apps/pickleball/roundrobin/.superpowers/brainstorm/840-1779127438
```
