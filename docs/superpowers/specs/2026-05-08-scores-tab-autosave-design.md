# Scores Tab — Auto-save on Blur Design

**Date:** 2026-05-08  
**Status:** Approved  
**Supersedes:** `2026-05-08-scores-tab-fewer-clicks-design.md`

---

## Problem

The current Scores tab still requires explicit Save/Update button clicks. The "Save Round N" button (from the previous iteration) is one click per round, and the "Update" button on completed courts requires a separate click after editing. Goal: zero clicks to save scores.

---

## Solution

Scores auto-save when the user leaves (blurs) any score input. No buttons on score inputs — not on the active round, not on completed rounds.

Round advancement remains automatic: `activeRoundIndex` is computed as the first round where any court has `score == null`. When the last court in the active round is saved via blur, the round advances naturally.

---

## Behavior

### Active round
- Score inputs shown with border highlight (existing style)
- Per-court checkmarks (✓/○) removed — no longer needed without a Save button
- `(blur)` event on each input triggers `onBlurSave(roundIndex, courtName)`
- Save fires only when both scores for that court are valid (non-null, >= 0)
- When last court in active round saves, `activeRoundIndex` advances — next round opens

### Completed rounds
- Score inputs remain visible and editable (same style as active, slightly muted border)
- Same `(blur)` auto-save handler
- Fallback: if only one field was edited, the other field falls back to the existing saved score
- No "Update" button

### Upcoming rounds
- Team names only — no inputs (unchanged)

---

## Key Method: `onBlurSave`

```typescript
onBlurSave(roundIndex: number, courtName: string): void {
  const court = this.rounds()[roundIndex]?.courts.find(c => c.courtName === courtName);
  const pending = this.getPending(roundIndex, courtName);

  // Fall back to existing saved score for fields the user didn't touch
  const team1 = pending.team1Score ?? court?.score?.team1 ?? null;
  const team2 = pending.team2Score ?? court?.score?.team2 ?? null;

  if (team1 != null && team2 != null && team1 >= 0 && team2 >= 0) {
    this.sessionService.saveScore(roundIndex, courtName, team1, team2);
    delete this.pendingScores[this.entryKey(roundIndex, courtName)];
  }
}
```

The fallback (`?? court?.score?.teamN`) is what enables editing a single field on a completed court without needing both fields in the pending state.

---

## Affected Files

| File | Change |
|------|--------|
| `src/app/scores-tab/scores-tab.ts` | Remove `courtReady`, `courtsReadyCount`, `allCourtsReady`, `saveRound`; add `onBlurSave()` |
| `src/app/scores-tab/scores-tab.html` | Remove Save Round button; remove Update button; remove ✓/○ checkmarks; add `(blur)` to all score inputs; make completed court inputs editable |
| `tests/scores/scores-tab.spec.ts` | Rewrite tests: no button clicks for saving, use blur events; update 3.6 (Update → blur); update 3.2/3.3/3.4/3.5/3.7/3.8/3.11/3.12 |
| `tests/helpers.ts` | Update `saveRound1Scores()` to use blur instead of button clicks |

No model or service changes needed.

---

## Removed

- `courtReady(roundIndex, courtName)` — no longer needed
- `courtsReadyCount(roundIndex)` — no longer needed  
- `allCourtsReady(roundIndex)` — no longer needed
- `saveRound(roundIndex)` — no longer needed
- `canSave(roundIndex, courtName)` — replaced by inline check in `onBlurSave`
- `saveScore(roundIndex, courtName)` — still used internally by `onBlurSave`; remove from template
- Per-court Save buttons (already removed in previous iteration)
- "Save Round N (X/Y courts ready)" button
- Per-court ✓/○ checkmarks
- "Update" button on completed courts

---

## Edge Cases

- **Single field edit on completed court:** `onBlurSave` uses `?? court.score.teamN` fallback — saves correctly
- **Partial entry (only one score filled):** save does not fire — user must fill both fields for that court
- **Negative score:** `>= 0` check in `onBlurSave` prevents save
- **Zero-zero:** valid, saves normally
- **Read-only mode:** inputs remain `[disabled]="readOnly"` — blur handler is present but `readOnly` guard prevents render of active inputs; completed inputs are disabled so blur won't fire in meaningful way
- **Rapid edits:** each blur fires independently; `pendingScores` entry is deleted after save, so next edit starts fresh

---

## Testing

Update `tests/scores/scores-tab.spec.ts` and `tests/helpers.ts`:

- `saveRound1Scores()`: fill inputs and trigger blur (`.blur()` or `.press('Tab')`) instead of clicking a button
- Test 3.2: no Save buttons visible at all; inputs visible
- Test 3.3: blur after filling both courts on Court 1 → round does NOT advance (Court 2 still pending); fill+blur Court 2 → round advances
- Test 3.4: removed (no checkmarks)
- Test 3.5: fill+blur all courts → Round 1 completes, Round 2 activates
- Test 3.6: fill+blur single field on completed court → value updates (tests fallback behavior)
- Test 3.7: 0–0 blurs → saves (valid)
- Test 3.8: -1 blurs → does not save
- Test 3.12: removed (no checkmarks)
