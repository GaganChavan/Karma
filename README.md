# KARMA APP — COMPLETE PROJECT CONTEXT
# Paste this at the start of any new chat to give full context.
# Last updated: April 2026

---

## WHO I AM

- **Name:** Gagan Chavan (alter ego in app: **Neel**)
- **Born:** February 28, Pisces
- **Location:** Hassan, Karnataka (home) ↔ Bangalore (WFO, 12–15 days/month)
- **Phone:** OnePlus Nord (Android 11/12)
- **Mac:** M4 MacBook Air (low storage — no Android Studio)
- **GitHub:** https://github.com/GaganChavan (repo: `karma`, private)
- **Expo account:** gaganchavan
- **EAS Project ID:** 7036bb25-0702-4c86-8535-f45fb307b30f

## MY GOAL

Break deeply ingrained bad habits (15+ years), build mental resilience, discipline, and achieve holistic transformation by end of 2026 — financially, career, and personally. Inspired by Bhagavad Gita and Atomic Habits.

---

## THE APP

**Name:** Karma ☸
**Tech stack:** React Native + Expo SDK 55, expo-sqlite (offline SQLite), EAS Cloud Build
**Philosophy:** Bhagavad Gita chariot metaphor + Atomic Habits + Neuroscience
**Theme:** True black (#000000) + Gold accents — Apple quality, Zerodha data clarity
**Fully offline** — no internet required, no accounts, no cloud sync

### Chariot Framework (soul of app)
```
The Chariot    = Your body — the vehicle you've been given
The Horses     = Your five senses — powerful, fast, directionless
The Reins      = Your mind — it holds or releases the horses
Arjuna         = Your ego — the one who must act
Krishna        = Your intellect / higher self — the one who knows
The Battlefield= Every single moment of choice

Karma app = Krishna. Shows the path. Does not fight for Neel.
```

---

## PROJECT LOCATION

```
/Users/gagankumarchavan/Gagan/Habits/karma/
```

## FILE STRUCTURE (complete)

```
karma/
├── App.js                          ← Root — ThemeProvider, splash→identity→app flow
├── app.json                        ← Expo config (NO newArchEnabled — causes build fail)
├── eas.json                        ← preview profile, buildType: "apk"
├── package.json                    ← expo install.exclude: ['expo'] to silence warning
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
└── src/
    ├── constants/
    │   ├── colors.js               ← Re-exports from ThemeContext + Typography/Spacing/Radius
    │   ├── ThemeContext.js         ← DARK_PALETTE, LIGHT_PALETTE, useTheme(), ThemeProvider
    │   └── shlokas.js              ← 25+ Gita shlokas, context-aware, triple-layer display
    ├── database/
    │   ├── database.js             ← SQLite init, all tables, Phase D migrations
    │   ├── habitService.js         ← CRUD for habits, checkins, settings, XP
    │   └── moodService.js          ← Mood/energy logs, slip triggers, weekly reflections
    ├── services/
    │   ├── gamificationService.js  ← XP system, levels, karma score, milestones, streak freeze
    │   ├── notificationService.js  ← Local notifications (no push — Expo Go SDK 53+ blocks)
    │   ├── backupService.js        ← Export/import JSON via expo-sharing + expo-document-picker
    │   ├── insightsService.js      ← Pattern analysis after 30 days of data
    │   ├── whatsappService.js      ← Daily + weekly WhatsApp reports via Linking API
    │   └── wfoService.js           ← WFO mode, streak recovery, neural progress, before vs now
    ├── screens/
    │   ├── SplashScreen.js         ← Dawn aesthetic, spinning ☸, Gita shloka, 2.4s auto
    │   ├── IdentityScreen.js       ← Opens EVERY app launch, no auto-dismiss, tap to enter
    │   ├── HomeScreen.js           ← Time-of-day grouped habits, mood prompt, WFO banner
    │   ├── HabitDetailScreen.js    ← Full detail, check-in, trigger journal, neural progress
    │   ├── AddHabitScreen.js       ← Create/edit habit, quantifiable, X/week, NO KeyboardAvoidingView on Android
    │   ├── CelebrationScreen.js    ← "The Rein Held Today" — chariot language, WhatsApp share
    │   ├── StatsScreen.js          ← Overview + Habits + Badges + Insights tabs
    │   ├── HistoryScreen.js        ← Last 30 days, edit past checkins (up to 3 days back)
    │   ├── HabitsScreen.js         ← Full habit list, archive, restore
    │   ├── SettingsScreen.js       ← Identity, theme, notifications, WhatsApp, backup, WFO link
    │   ├── MoodLogScreen.js        ← 1-5 mood + energy, morning/evening
    │   ├── WeeklyReflectionScreen.js ← Sunday 3 questions, saved history
    │   ├── WFOModeScreen.js        ← Hassan↔Bangalore context switch
    │   ├── NeuralProgressScreen.js ← 66-day science visualised per habit
    │   └── BeforeNowScreen.js      ← 90-day transformation — first 30 vs last 30 days
    ├── components/
    │   ├── ShlokaDisplay.js        ← Reusable: card/inline/large variants, 4-layer display
    │   └── ErrorBoundary.js        ← Catches crashes gracefully
    ├── navigation/
    │   └── AppNavigator.js         ← Bottom tabs + full stack, theme-aware tab bar
    └── utils/
        ├── dateUtils.js            ← Date formatting, week dates, today helpers
        ├── validation.js           ← Habit form validation
        └── responsive.js           ← sf() font scaling, rs() spacing, SCREEN size info
```

---

## DATABASE SCHEMA (Phase D Final)

### habits
```sql
id, name, icon, color, type (build/break), frequency (daily/specific_days),
days, time_of_day (morning/afternoon/evening/anytime),
is_quantifiable, daily_target, unit, frequency_type (daily/weekly), weekly_target,
is_wfo_skip, reminder_time, reminder_type (soft/hard/none),
goal_days, punishment_sensitivity (soft/balanced/harsh),
streak_freeze_count, is_active, sort_order, created_at, updated_at
```

### checkins
```sql
id, habit_id, date, status (done/missed/slip/resisted/skipped),
note, slip_count, value (for quantifiable habits), created_at
UNIQUE(habit_id, date)
```

### milestones
```sql
id, habit_id, milestone_days, achieved_at
UNIQUE(habit_id, milestone_days)
```

### xp_log
```sql
id, habit_id, xp, reason, date
```

### settings (key-value)
```
alter_ego, week_starts, total_xp, app_theme, identity_statement,
wa_daily, wa_weekly, last_perfect_day, streak_freeze_count,
wfo_mode, wfo_city, home_city, wfo_non_negotiables, wfo_start_date
```

### mood_logs
```sql
id, date, time_of_day (morning/evening), mood (1-5), energy (1-5), note, created_at
UNIQUE(date, time_of_day)
```

### slip_triggers
```sql
id, habit_id, date, trigger (stress/boredom/social/tired/emotional/automatic/night/hunger), note, created_at
```

### weekly_reflections
```sql
id, week_start, went_well, struggled, commitment, mood_avg, energy_avg, created_at
UNIQUE(week_start)
```

### streak_recovery
```sql
id, habit_id, lost_streak, target_days, done_days, started_at, completed_at, status
```

---

## KEY FEATURES BUILT

### Phase 1 — Foundation
- SQLite database, habit CRUD, navigation, error boundary, splash screen

### Phase 2 — Core Habits
- Add/edit habits, habit detail, home screen with check-ins

### Phase 3 — Notifications
- Local only (push removed — Expo Go SDK 53+ blocks push tokens)
- Full notifications in production APK

### Phase 4 — Gamification
- XP system, 5 levels, Karma Score 0–1000, streak freeze, milestones
- Levels: 🌱 Beginner → 🔥 Consistent → ⭐ Disciplined → ⚡ Unstoppable → 🔱 Legend
- Milestones: 3🌱 7🔥 14⭐ 21🧠 30🏆 48⚡ 60🌊 75⚔️ 90🔱 180🌌 365👑

### Phase 5 — Stats & History
- 90-day heatmap, weekly bar charts, per-habit stats, milestone badges
- History screen: browse 30 days, edit past checkins

### Phase 6 — UI/UX Overhaul
- True black #000000, Apple card #1C1C1E, gold accent
- Apple Typography scale, generous spacing
- Apple Fitness-inspired home, Apple Health-inspired detail

### Phase 7 — Settings, Backup, Habits Management
- Full settings screen, JSON export/import backup
- Habits screen with archive/restore
- Dark/light theme (properly via ThemeContext, live switching)

### Gita Phase A — Soul of App
- 25+ Gita shlokas — Sanskrit + transliteration + meaning + reference
- Context-aware shlokas per situation (not random)
- ShlokaDisplay component — card/inline/large variants
- Identity Declaration Screen — shows EVERY app open, no auto-dismiss
- Krishna voice throughout — punishment, celebration, empty state, check-in
- WhatsApp daily + weekly reports via Linking API (no API key needed)
- Chariot framework in Settings About section

### Gita Phase B — Behaviour Science
- **Trigger journal** — every slip requires trigger category (8 options)
- **Trigger pattern** — after 3+ slips: "Stress triggers 70% of your slips"
- **Time of day grouping** — Morning/Afternoon/Evening/Anytime on home screen
- **Mood + energy log** — 1–5 scale, morning and evening
- **Weekly Sunday reflection** — 3 questions, saved history
- New DB tables: mood_logs, slip_triggers, weekly_reflections

### Gita Phase C — Habit Architecture
- **Quantifiable habits** — track numbers (pages, reps, glasses, minutes)
- **Flexible X/week streaks** — gym 4×/week instead of daily
- **Pattern insights** — Stats → 🧠 tab, Karma speaks after 7+ days
- **Live theme switching** — ThemeContext, no restart needed
- New DB columns: is_quantifiable, daily_target, unit, frequency_type, weekly_target

### Gita Phase D — Deep Transformation (FINAL)
- **WFO / Travel Mode** — Hassan↔Bangalore context switch
  - Mark habits to auto-skip during WFO
  - Break habits always active (Bangalore = high risk)
  - 9 PM rule guide built in
  - Trip stats shown
- **Neural Rewiring Progress** — 66-day science per habit
  - 4 phases: Forming → Strengthening → Deepening → Automatic
  - 66-dot visual grid
- **Before vs Now** — unlocks at 90 days, first 30 vs last 30 comparison
- **Streak Recovery** — miss after 21+ days, redemption challenge offered
- New DB table: streak_recovery

---

## KEY TECHNICAL DECISIONS

| Decision | Why |
|---|---|
| EAS Cloud Build (free tier) | No Android Studio on Mac |
| Local notifications only | Expo Go SDK 53+ blocks push tokens |
| ThemeContext (not Colors mutation) | Live theme switching without restart |
| newArchEnabled: FALSE in app.json | Removed — causes EAS build fail |
| No KeyboardAvoidingView on Android | Breaks ScrollView touch on Android |
| autoFocus removed from AddHabit TextInput | Opens keyboard immediately, locks Android scroll |
| expo added to install.exclude in package.json | Silences patch version warning in EAS |
| WhatsApp via Linking API | No WhatsApp Business API or approval needed |
| responsive.js → sf(), rs() | Scales fonts and spacing across different screen sizes |
| Identity screen every open | User wants Gita declaration every morning |
| No auto-dismiss on Identity screen | User taps "Enter the Battlefield" themselves |

---

## INSTALLED PACKAGES

```json
expo-sqlite
expo-splash-screen
expo-image-picker
expo-file-system
expo-notifications
expo-intent-launcher
expo-sharing
expo-document-picker
@react-navigation/native
@react-navigation/bottom-tabs
@react-navigation/stack
react-native-screens
react-native-safe-area-context
```

---

## EAS BUILD COMMANDS

```bash
# Test for JS errors before building (saves EAS builds)
npx expo export --platform android --dev false 2>&1 | tail -5
# Should show: Exported: dist

# Build
git add .
git commit -m "message"
git push
eas build --platform android --profile preview

# Check build status
https://expo.dev/accounts/gaganchavan/projects/karma/builds/
```

**eas.json:**
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    }
  }
}
```

**Build limits:** Free tier = 15 Android builds/month. ~6 remaining as of April 2026.
**Build queue:** Free tier waits 90–120 min in queue. Actual build takes ~7 min once started.

---

## KNOWN BUGS FIXED

| Bug | Fix |
|---|---|
| Build fail: `newArchEnabled` in app.json | Removed from android block |
| Build fail: duplicate `getSetting` in wfoService.js | Removed local declaration at bottom of file |
| Build fail: wrong import `./database` in insightsService.js | Fixed to `../database/database` |
| Theme needs restart | ThemeContext with useState → live switching |
| AddHabit scroll broken on Android | Removed KeyboardAvoidingView, replaced with plain View |
| Identity screen auto-dismisses | Removed countdown timer |
| Identity screen once per day | Removed date check — shows every open |

---

## SHLOKA SYSTEM

Every shloka has 4 layers:
1. **Sanskrit** (Devanagari) — gold, large
2. **Transliteration** (Roman) — white, italic
3. **Meaning** (English) — muted, italic
4. **Reference** (Chapter.Verse) — dim, small

Context-aware — NOT random:
- `getShloka('splash')` → Yoga is excellence in action (2.50)
- `getShloka('allDone')` → Established in discipline (2.48)
- `getShloka('slipped')` → Turbulent senses carry away the mind (2.60)
- `getShloka('punish1–4')` → Escalating Gita mirror messages
- `getShloka('milestone7')` → The faithful one attains wisdom (4.39)
- `getShloka('milestone21')` → By practice, the mind is steadied (6.35)
- `getShloka('milestone90')` → The fire of knowledge burns all karma (4.37)
- `getShloka('milestone365')` → Surrender fully to your highest self (18.66)

---

## GAMIFICATION SYSTEM

### XP Values
- Complete build habit: +10 XP
- Resist break habit: +15 XP
- Perfect day (all habits): +20 XP bonus
- Miss build habit: -5 XP
- Slip break habit: -10 XP

### Karma Score (0–1000)
Based on 30-day consistency rate.

### Streak Freeze
- Awarded when weekly consistency ≥ 80%
- Protects streak for 1 day
- No freeze: complete habit twice next day (recovery mode)

---

## WHATSAPP REPORT FORMAT

**Daily (9 PM):**
```
☸ Karma — Daily Report
[Day], [Date]
[Name] — X/Y habits complete
BUILD HABITS: ✅/❌ with streaks
BREAK HABITS: ✊/😔 with clean days
Level, XP, Karma Score
Sanskrit shloka + meaning
```

**Weekly (Sunday 8 PM):**
```
☸ Karma — Week X Report
Consistency %, best habit, needs work
Top streaks
Top trigger this week
XP earned, Karma Score change
Sanskrit shloka
"Neel → Dhruv. The Pole Star holds."
```

---

## HASSAN vs BANGALORE (WFO MODE)

**The problem:** 6:30 AM wake, 7:30 leave, 9:30 office, 7 PM leave, 9 PM home — only 60 min morning window.

**The solution:**
- WFO Mode toggle in Settings → Travel Mode screen
- Mark Hassan-only habits as `is_wfo_skip = 1`
- These auto-skip during WFO — don't break streak
- Break habits ALWAYS active — Bangalore is max vulnerability (9 PM, tired, alone, phone)
- Non-negotiables (2–3 habits): always done everywhere

**Commute = Sadhana:** 3hrs/day → reading, no-phone, breathwork

**9 PM Rule:** Eat → Karma check-in (5 min) → Read 10 pages → Sleep → Phone charges in other room

---

## NEURAL REWIRING SCIENCE

Based on Phillippa Lally, UCL 2010:
- **Day 0–21:** Pathway Forming — willpower required
- **Day 21–45:** Strengthening — starts feeling natural
- **Day 45–66:** Deepening — myelin sheath forming, near-automatic
- **Day 66+:** Automatic — new road is built, old one fades

15-year habits = thick neural highways. Cannot demolish. Build parallel road and stop using the old one. Awareness breaks the automatic cue-response loop.

---

## CURRENT STATE (April 2026)

✅ All 4 phases (A, B, C, D) code written
✅ All build errors fixed
✅ Export check passing: `Exported: dist`
✅ AddHabit scroll fix applied (removed KeyboardAvoidingView)
✅ Identity screen — no auto-dismiss, shows every open
✅ Responsive Typography + Spacing via sf() and rs()
⏳ Final build pending (awaiting EAS queue)

### Files recently modified (need to be in next build):
- `src/screens/AddHabitScreen.js` — scroll fix
- `src/screens/IdentityScreen.js` — no countdown, no auto-dismiss
- `App.js` — identity shows every open
- `src/constants/colors.js` — responsive Typography and Spacing
- `src/services/insightsService.js` — fixed import path
- `package.json` — expo install.exclude

---

## TRANSFORMATION BLUEPRINT 2026

### Phase 1 (Jan–Apr): Foundation
- Discipline is the point — not results
- Protect morning. First 90 days are hardest.
- Measure only consistency.

### Phase 2 (May–Aug): Momentum
- Compound effect visible
- Career and financial focus increases
- Weekly reflection becomes most important 20 min

### Phase 3 (Sep–Dec): Identity
- 9 months of neural pathways = unrecognisable transformation
- Financial and career targets set
- Before vs Now screen unlocks

**The Gita instruction above all:**
*"Nimitta matram bhava" — Be merely an instrument.*

The app is the system. The system runs. Neel shows up. Every day. 🔱
