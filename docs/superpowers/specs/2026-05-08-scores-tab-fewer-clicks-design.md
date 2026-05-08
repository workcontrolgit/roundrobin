# Scores Tab — Fewer Clicks Redesign

**Date:** 2026-05-08  
**Status:** Approved  
**Approach:** B — Single Save Round button + per-court ready indicators

---

## Problem

The current Scores tab requires **one Save button click per court** per round. With 2 courts per round and N rounds, that's 2N clicks just to record scores. Users want to enter all scores for a round and save once.

---

## Solution

Replace per-court Save buttons in the active round with:

1. A **green checkmark** (`✓`) or empty circle (`○`) next to each court name — shows at a glance which courts have both scores filled.
2. A single **"Save Round N (X/2 courts ready)"** button at the bottom of the active round card — disabled until all courts are ready, enabled and styled prominently once all are filled.

Completed-round rows retain their per-court **Update** button (unchanged behavior).

---

## Affected Files

| File | Change |
|------|--------|
| `src/app/scores-tab/scores-tab.ts` | Add `courtReady()`, `courtsReadyCount()`, `allCourtsReady()`, `saveRound()` |
| `src/app/scores-tab/scores-tab.html` | Remove per-court Save button from active round; add checkmark per court; add Save Round button at card bottom |

No service changes. No model changes.

---

## Logic (`scores-tab.ts`)

### New methods

```
courtReady(roundIndex, courtName): boolean
  → both pending scores for this court are non-null and >= 0

courtsReadyCount(roundIndex): number
  → count of courts in this round where courtReady() === true

allCourtsReady(roundIndex): boolean
  → courtsReadyCount(roundIndex) === round.courts.length

saveRound(roundIndex): void
  → for each court in round, call sessionService.saveScore() if courtReady()
  → pendingScores entries for this round are cleared by the existing effect()
    (effect fires asynchronously after all saves complete)
```

### Existing methods preserved

- `canSave(ri, courtName)` — still used by the per-court **Update** button on completed rounds
- `saveScore(ri, courtName)` — still used by Update button; also called internally by `saveRound()`
- `getPending()`, `entryKey()`, `playerName()` — unchanged

---

## Template (`scores-tab.html`)

### Active round — court row (inside `@for court`)

```
[checkmark] Court Name   [score input] – [score input]   Player A & Player B
```

- Checkmark: `✓` in `#52b788` (green) when `courtReady(ri, court.courtName)`, else `○` in `#888`
- Score inputs: unchanged

### Active round — card footer (outside `@for court`, inside `mat-card-content`)

```
[ Save Round N (X/2 courts ready) ]   ← full-width raised primary button
```

- Label: `Save Round {{ round.roundNumber }} ({{ courtsReadyCount(ri) }}/{{ round.courts.length }} courts ready)`
- Disabled: `!allCourtsReady(ri)`
- Click: `saveRound(ri)`
- Hidden in `readOnly` mode

### Completed rounds — unchanged

Per-court Update button remains.

---

## Edge Cases

- **readOnly mode:** Save Round button not rendered (same `@if (!readOnly)` guard as existing Save buttons).
- **Single court:** Works — `courtsReadyCount` must equal 1 before enabling.
- **Partial fill:** Button stays disabled; checkmarks show exactly which courts still need scores.
- **Save Race:** `saveRound()` calls `saveScore()` synchronously for each court. Angular effect scheduling ensures `pendingScores` is not cleared mid-loop.

---

## Testing

Existing Playwright tests in `tests/scores/scores-tab.spec.ts` should be updated to:
- Verify per-court Save buttons are **gone** from the active round
- Verify court checkmarks appear after both scores are entered
- Verify Save Round button is disabled until all courts ready
- Verify Save Round button saves all courts and advances the round

No unit test changes needed (no new service API).
