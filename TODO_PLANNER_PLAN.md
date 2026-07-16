# Karma — Hourly To-Do Planner — Build Plan

> Persisted so work can resume mid-build in any future session. Update the
> Progress checklist below as each phase finishes — that's the source of
> truth for "where we left off," not chat history.

## Progress

- [x] Phase 1 — Plumbing (DB table + `todoService.js` + 6th tab, placeholder screen)
- [x] Phase 2 — Daily view, fully functional
- [x] Phase 3 — Weekly view
- [x] Phase 4 — Monthly view
- [x] Phase 5 — Polish & edge cases (code-complete; on-device pass still needed — see checklist below)

Last updated: 2026-07-16 — All 5 phases code-complete. Summary of what shipped and what
was caught along the way:

- **Phase 1-2**: `todos` table + indexes, `todoService.js` (CRUD + rollups), 6th "Planner"
  tab, full 24-hour Daily view (add/toggle/delete, current-hour highlight + auto-scroll).
- **Phase 3**: Daily/Weekly/Monthly tab switcher + Weekly view (7-cell strip, 4-state
  coloring, task-level % — not an average of daily rates).
- **Phase 4**: Monthly view — calendar grid adapted from `StatsScreen.js`'s
  `OverviewHeatmap` week-chunking logic, paged one month at a time (‹ › nav, capped at
  the current month). *Bug caught in review*: `monthCounts` only refetched when the month
  was paged, so Daily-tab edits never showed up in Monthly until you paged away and back.
  Fixed by extracting a shared `_applyDelta()` that updates `weekCounts` and
  `monthCounts` together on every add/toggle/delete (today always belongs to both "this
  week" and "this month," so one delta keeps both live).
- **Phase 5**: *Bug caught in review*: `useFocusEffect(useCallback(() => { _load(); }, []))`
  freezes that `_load` closure for the screen's whole lifetime — react-navigation only
  re-registers the focus listener when the callback *identity* changes, so every focus
  after the first was still running the render-1 closure, which read the outer
  `date`/`weekDates` consts frozen at that render. Left open across midnight, a focus
  event would have kept fetching *yesterday's* todos. Fixed by having `_load()` call
  `getTodayDate()`/`DateUtils.getWeekDates()` itself at execution time — same root-cause
  family (though a different mechanism) as the IST/`toISOString()` bugs already documented
  in `habitService.js`/`dateUtils.js`. Confirmed by review (no fix needed): typing a task
  at 11:58 PM already tags it correctly, since `_submitAdd`/`_toggle`/`_delete` are plain
  per-render closures, not memoized — only the background reload was ever stale. Also
  confirmed all three rollup views (day/week/month) run exactly one grouped query per
  load, no N+1.

Verified throughout: syntax-checked every file, and rebuilt the Metro bundle after each
phase (final pass confirmed clean on **both iOS and Android** platforms — Android matters
here since Karma is primarily used on Android per the WFO/Bangalore context).

## Full review pass (2026-07-16)

Ran a dedicated multi-angle review (8 finder agents + verification) covering correctness,
reuse, simplification, efficiency, and altitude, plus a specific check that the shared
files (`database.js`, `AppNavigator.js`) hadn't regressed anything in the existing
habit-tracker. Result: **the shared-file changes are clean** — both diffs are purely
additive, and the tab bar / DB init logic are name-keyed rather than position-dependent,
so nothing in habits/checkins/XP/WFO/settings/migrations was affected.

Three real bugs were found and fixed in the new code:

1. **Rapid double-tap on a checkbox could corrupt the week/month rollup counts**
   (`_toggle`, was reading a stale `todo.is_done` snapshot instead of live state — two
   fast taps before a re-render both pushed the delta the same direction instead of
   canceling out). Fixed with a `pendingToggles` ref that blocks a re-tap on the same
   task while its toggle is still in flight — a ref mutates synchronously, so unlike
   state it can't itself be raced by a second tap.
2. **The Monthly tab could get stuck on the wrong month across a midnight/month-boundary
   rollover** (`monthCursor` was set once at mount and never re-derived, unlike every
   other date value on the screen). Fixed by re-syncing `monthCursor` to the real current
   month on every focus event inside `_load()` — but only while the user hasn't manually
   paged away from "current" (tracked via a `hasNavigatedMonth` ref), so browsing a past
   month doesn't get yanked back to today mid-browse.
3. **Deleting a task that fails to save reinserted it at the end of the list instead of
   its original position.** Fixed by capturing the removal index inside the `setTodos`
   updater and splicing it back into that same index on rollback.

Also flagged (not fixed, lower severity / cleanup only): `weekCounts`/`monthCounts` as
two manually-synced copies of overlapping data (the mechanism behind bug #1 and the root
cause of the Phase 4 bug too), `todoService.js` reimplementing `DateUtils`'s local-date
logic as a third independent copy, the Monthly calendar's padding/chunking logic
duplicating `StatsScreen.js`'s `OverviewHeatmap` almost verbatim, unmemoized week/month
grid rebuilds on every keystroke while adding a task, some duplicated fetch-and-map
logic between `_load()` and the month effect, and two unused service exports
(`getDaySummary`/`getRangeSummary`). None of these produce wrong output today — they're
maintainability risk, not correctness bugs — so left as-is unless you want them cleaned
up separately.

Bundle re-verified clean on both iOS and Android after the fixes.

## On-device checklist (nothing below has been run on a real device/simulator yet)

- [ ] App boots, no red-screen/DB errors in console, "Planner" tab appears and navigates
- [ ] Eyeball the gold FAB — does it look off-center with 6 tabs? (cosmetic only, one-line
      fix in `AppNavigator.js`'s `tabs` array if it bothers you)
- [ ] Daily: add tasks to a few hours, toggle done, delete one, background/foreground the
      app and confirm the current-hour highlight is right
- [ ] Daily: confirm an empty day shows "Nothing planned yet," not "0/0 done"
- [ ] Daily: rapidly double-tap a checkbox a few times — confirm the Weekly/Monthly %
      never shows more "done" than "planned" for today (this is the bug #1 fix above)
- [ ] Weekly: plan a few days, leave others untouched, confirm untouched days render
      neutral grey (not red) and don't drag the week % down
- [ ] Monthly: same check as weekly, plus confirm today's cell has the thicker gold border
      and future dates in the current month don't render as "missed"
- [ ] Cross-view sync: add/check a task on Daily, flip to Weekly then Monthly without
      leaving the tab, confirm both reflect it immediately
- [ ] Rapid multi-add: after submitting a task, input stays open for the next one instead
      of closing — flag if that feels annoying rather than fast
- [ ] Auto-scroll-to-current-hour on first opening the Daily tab (best-effort, may
      occasionally no-op — not a crash if it does)

---

## Context

Karma tracks habits but has no view of *when* during the day things happen. Gagan currently keeps an hourly to-do list manually (pen/paper or a separate app) — a planner-style layout (hour rows down the left, checkable tasks against each hour). This folds that into Karma as its own section: a full 24-hour day broken into hourly rows, each row holding any number of manually-typed tasks, plus Daily/Weekly/Monthly completion views.

This is a distinct feature from the standalone to-do app previously scoped in `/Users/gagankumarchavan/Gagan/Habits/todo-app-context.md` (that one is a generic prioritized task backlog with projects, meant as its own app — this is a time-blocked daily planner, tightly coupled to "what am I doing this hour," which is why it lives inside Karma instead).

**Locked decisions (confirmed with Gagan, do not re-litigate):**
- One entry point: a **6th bottom tab** in the existing custom tab bar — no Settings-row burial, no Home-screen card.
- Fixed **hourly buckets** (0–23), each holding N free-typed tasks — not flexible start-time/duration blocks (that model already exists separately for habits in `ScheduleScreen.js` and is unrelated).
- Completion % denominator = **only planned slots**. An hour/day/week with nothing typed into it is neutral ("not planned"), never counted as "missed" and never dragging the rate down — this deliberately avoids the same denominator bug just found in the habit tracker's perfect-day logic (see `checkPerfectDay` in `gamificationService.js`).

## Recommended Approach

Single new flat screen `src/screens/ToDoScreen.js` (no subfolder — this app has never used one, and `StatsScreen.js` already proves a single file comfortably holds a multi-view tab-switcher + custom heatmap grid at 800+ lines). Internal Daily/Weekly/Monthly switching uses the same local-`useState` + tab-pill-row pattern as `StatsScreen.js:392-410` — no nested navigator, consistent with the rest of the app.

New standalone `todos` SQLite table + `src/database/todoService.js`, following the exact conventions of `habitService.js` (try/catch + friendly errors, local date helpers, parameterized queries).

### Data model

```sql
CREATE TABLE IF NOT EXISTS todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL,                                   -- 'YYYY-MM-DD'
  hour         INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
  title        TEXT NOT NULL CHECK(length(trim(title)) > 0),
  is_done      INTEGER NOT NULL DEFAULT 0 CHECK(is_done IN (0,1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_todos_date      ON todos(date);
CREATE INDEX IF NOT EXISTS idx_todos_date_hour ON todos(date, hour);
```
Added inside `_initializeTables` in `database.js` (new table = safe as `CREATE TABLE IF NOT EXISTS`, no `_runMigrations` entry needed).

### Service — `src/database/todoService.js` (new file)

```js
getTodosForDate(dateStr)                 // SELECT * WHERE date=? ORDER BY hour, sort_order, id
addTodo(dateStr, hour, title)            // sort_order = MAX(sort_order)+1 for that (date,hour); INSERT
toggleTodoDone(id)                       // UPDATE is_done = 1 - is_done, updated_at=now
updateTodoTitle(id, title)
deleteTodo(id)
getDaySummary(dateStr)                   // { planned, done, rate } — rate=null if planned===0
getCountsForDateRange(fromDate, toDate)  // single grouped query, see below
getRangeSummary(fromDate, toDate)        // sums into { plannedTotal, doneTotal, rate, trackedDays, emptyDays }
```

Aggregate query (avoids N+1 across a week/month):
```sql
SELECT date, COUNT(*) AS planned, SUM(CASE WHEN is_done=1 THEN 1 ELSE 0 END) AS done
FROM todos WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date ASC
```
Dates with zero todos simply don't appear in this result — the JS caller merges it against the full date range and fills gaps as `{planned:0, done:0}`. This merge is where "empty ≠ missed" gets enforced.

### Completion math (per day)

```
planned = todos.length
done    = count where is_done
level   = planned===0 ? 'empty' : done===0 ? 'missed' : done===planned ? 'all' : 'partial'
rate    = planned===0 ? null : done/planned      // null, not 0 — load-bearing
```
Weekly/Monthly % = **task-level sum** across tracked days (`Σdone / Σplanned`, days with planned=0 excluded entirely), not an average of per-day rates — so a 9/10 day isn't diluted equally with a 1/1 day.

### Navigation — `AppNavigator.js`

- Import `ToDoScreen` from `../screens/ToDoScreen`.
- Insert `{ name: 'ToDo', label: 'Planner' }` into the `tabs` array (currently lines 37-43), between `AddTab` and `Stats`.
- Insert `<Tab.Screen name="ToDo" component={ToDoScreen} />` into `TabNavigator` (lines 89-97).
- No `Stack.Screen` needed — tab-only access per the locked single-entry-point decision.
- **Known cosmetic side effect:** tab items use `flex:1` so no layout code needs to change, but going from 5 items (symmetric around the center FAB) to 6 makes the gold "+" button sit slightly left of true center. Eyeball this on device in Phase 1; reorder the array if it looks off (no functional risk either way).

### Daily view UI

- One `ScrollView` (not `FlatList` — 24 fixed rows, matches this app's convention for bounded lists) with 24 hour-rows.
- Each row: hour label (port `ScheduleScreen.js`'s `_fmtHour` formatter) + its tasks (checkbox, strike-through when done, small "×" delete with `Alert.alert` confirm — the only destructive-confirm pattern in this app, e.g. `HomeScreen.js:234`) + an inline "+ Add task" affordance that swaps in a `TextInput` (`autoFocus`, `onSubmitEditing` → `addTodo` → clear + refocus for rapid multi-add), mirroring the inline-edit pattern already in `SettingsScreen.js` (~line 329) rather than a modal.
- Current hour gets a `colors.goldAlpha15` tint (same token used for focused tab pills elsewhere).
- Auto-scroll to current hour on mount: track each row's `y` via `onLayout` into a ref, `scrollTo` after first load.
- Day header shows `getDaySummary(today)` as "X/Y done", replaced with neutral copy ("Nothing planned yet") when `planned === 0`.

### Weekly / Monthly views

- **Weekly**: a single horizontal row of 7 cells (Mon–Sun) using `DateUtils.getWeekDates()`, each cell colored by `level` with `done/planned` caption underneath — full heatmap grid is overkill at 7 cells.
- **Monthly**: adapt `OverviewHeatmap` (`StatsScreen.js:44-206`) — reuse its week-chunking/padding and month-label logic near-verbatim, but extend `getColor()` with a **4th neutral state** for `level==='empty'` (transparent/no border) distinct from `level==='missed'` (new — needs an actual red-ish tint, since the existing habit heatmap never visually flags "missed" today, only scales gold by rate). Legend row gets a 4th swatch ("Not planned") so grey isn't ambiguous between "missed" and "never planned".

## Phases (each independently testable on device before moving on)

**Phase 1 — Plumbing (DB + service + tab, no real UI)**
`todos` table + indexes in `database.js`; `todoService.js` with full CRUD/rollup functions; wire the 6th tab in `AppNavigator.js` pointing at a placeholder `ToDoScreen.js` (title only).
*Verify:* app boots with no DB errors, new tab navigates, check FAB centering on device.

**Phase 2 — Daily view, fully functional**
24-hour list, inline add/toggle/delete, current-hour highlight + auto-scroll, day header summary.
*Verify:* add/check/delete tasks across several hours; background/foreground to confirm current-hour updates; confirm an empty day shows neutral copy, not "0%".

**Phase 3 — Weekly view**
7-cell strip + the Daily/Weekly/Monthly tab-pill switcher in `ToDoScreen.js` (mirrors `StatsScreen.js:392-410`).
*Verify:* plan some days, leave others empty; confirm empty days render neutral (not red) and don't drag the weekly %.

**Phase 4 — Monthly view**
Month heatmap adapted from `OverviewHeatmap`, 4-state legend, monthly % header. Add a small month-boundary helper to `dateUtils.js` rather than inlining `new Date(y,m,1)` in the screen.
*Verify:* scroll across a couple of months incl. current partial month; today is marked; future dates aren't styled "missed".

**Phase 5 — Polish**
Midnight-rollover check (task added at 11:58 PM for hour 23 must stay on today's date — cross-check against this codebase's known IST timezone bugs in `_localDate`/`toISOString`); empty-state copy; confirm rollup queries are called once per view-load (no N+1); resolve any lingering FAB-centering nit from Phase 1.

## Critical Files
- `src/database/database.js` — add `todos` table + indexes
- `src/database/todoService.js` — new
- `src/screens/ToDoScreen.js` — new
- `src/navigation/AppNavigator.js` — tab entry + registration
- `src/utils/dateUtils.js` — optional `formatHour`/month-boundary helpers (Phase 4-5)

Not in scope for this plan: XP integration for completed to-dos (trivial to bolt on later via `gamificationService.awardXP()` since `xp_log.habit_id` is nullable) and carry-over of unfinished tasks to the next day — both deferred until asked for.
