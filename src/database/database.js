// ─── KARMA APP — DATABASE (PHASE F-1) ────────────────────────────────
// Phase F-1 adds:
// - category column on habits (spiritual/intellectual/physical/conscious)
// - journey_milestones table (overall achievement badges)
// - New settings keys: sip_migration_done, xp_v2_done, notification_configs
// - XP v2 recalculation guard (done in gamificationService)

import * as SQLite from 'expo-sqlite';

let _db = null;

export const getDatabase = async () => {
  if (_db) return _db;
  try {
    _db = await SQLite.openDatabaseAsync('karma.db');
    await _initializeTables(_db);
    await _runMigrations(_db);
    await _seedDefaultSettings(_db);
    await _backfillXPv2(_db);
    console.log('✅ Karma DB ready — Phase F-1');
    return _db;
  } catch (error) {
    _db = null;
    throw new Error(`Database failed: ${error.message}`);
  }
};

const _initializeTables = async (db) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS habits (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT NOT NULL CHECK(length(trim(name)) >= 3),
      icon                 TEXT NOT NULL DEFAULT '⭐',
      color                TEXT NOT NULL DEFAULT '#F5A623',
      type                 TEXT NOT NULL DEFAULT 'build',
      frequency            TEXT NOT NULL DEFAULT 'daily',
      days                 TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
      time_of_day          TEXT NOT NULL DEFAULT 'anytime',
      is_quantifiable      INTEGER NOT NULL DEFAULT 0,
      daily_target         REAL NOT NULL DEFAULT 1,
      unit                 TEXT NOT NULL DEFAULT '',
      frequency_type       TEXT NOT NULL DEFAULT 'daily',
      weekly_target        INTEGER NOT NULL DEFAULT 7,
      is_wfo_skip          INTEGER NOT NULL DEFAULT 0,
      reminder_time        TEXT,
      reminder_type        TEXT NOT NULL DEFAULT 'none',
      goal_days            INTEGER NOT NULL DEFAULT 0,
      punishment_sensitivity TEXT NOT NULL DEFAULT 'balanced',
      streak_freeze_count  INTEGER NOT NULL DEFAULT 0,
      is_active            INTEGER NOT NULL DEFAULT 1,
      is_paused            INTEGER NOT NULL DEFAULT 0,
      category             TEXT DEFAULT NULL,
      sort_order           INTEGER NOT NULL DEFAULT 0,
      created_at           TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL,
      date       TEXT NOT NULL,
      status     TEXT NOT NULL CHECK(status IN ('done','missed','slip','resisted','skipped','auto_skipped')),
      note       TEXT,
      slip_count INTEGER NOT NULL DEFAULT 0,
      value      REAL DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id       INTEGER NOT NULL,
      milestone_days INTEGER NOT NULL,
      achieved_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, milestone_days)
    );

    CREATE TABLE IF NOT EXISTS journey_milestones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_id    TEXT NOT NULL UNIQUE,
      achieved_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      xp       INTEGER NOT NULL DEFAULT 0,
      reason   TEXT,
      date     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      mood        INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
      energy      INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 5),
      note        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(date, time_of_day)
    );

    CREATE TABLE IF NOT EXISTS slip_triggers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL,
      date       TEXT NOT NULL,
      trigger    TEXT NOT NULL,
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weekly_reflections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      went_well  TEXT,
      struggled  TEXT,
      commitment TEXT,
      mood_avg   REAL DEFAULT 0,
      energy_avg REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS streak_recovery (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id     INTEGER NOT NULL,
      lost_streak  INTEGER NOT NULL,
      target_days  INTEGER NOT NULL DEFAULT 2,
      done_days    INTEGER NOT NULL DEFAULT 0,
      started_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      completed_at TEXT,
      status       TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS miss_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL,
      date       TEXT NOT NULL,
      status     TEXT NOT NULL CHECK(status IN ('missed','skipped')),
      reason     TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON checkins(habit_id, date);
    CREATE INDEX IF NOT EXISTS idx_checkins_date       ON checkins(date);
    CREATE INDEX IF NOT EXISTS idx_slip_triggers_habit ON slip_triggers(habit_id);
    CREATE INDEX IF NOT EXISTS idx_mood_logs_date      ON mood_logs(date);
    CREATE INDEX IF NOT EXISTS idx_checkins_status     ON checkins(status);
    CREATE INDEX IF NOT EXISTS idx_miss_logs_habit     ON miss_logs(habit_id);
  `);
};

const _runMigrations = async (db) => {
  try {
    const cols = (await db.getAllAsync("PRAGMA table_info(habits)")).map(c => c.name);

    const addHabitCol = async (col, def) => {
      if (!cols.includes(col)) {
        await db.execAsync(`ALTER TABLE habits ADD COLUMN ${col} ${def}`);
        console.log(`✅ Migration: habits.${col}`);
      }
    };

    // Phase B/C/D
    await addHabitCol('time_of_day',   "TEXT NOT NULL DEFAULT 'anytime'");
    await addHabitCol('is_quantifiable',"INTEGER NOT NULL DEFAULT 0");
    await addHabitCol('daily_target',  "REAL NOT NULL DEFAULT 1");
    await addHabitCol('unit',          "TEXT NOT NULL DEFAULT ''");
    await addHabitCol('frequency_type',"TEXT NOT NULL DEFAULT 'daily'");
    await addHabitCol('weekly_target', "INTEGER NOT NULL DEFAULT 7");
    await addHabitCol('is_wfo_skip',   "INTEGER NOT NULL DEFAULT 0");

    // Phase E
    await addHabitCol('is_paused',     "INTEGER NOT NULL DEFAULT 0");

    // Phase F-1: SIP category
    await addHabitCol('category',      "TEXT DEFAULT NULL");

    // Checkins value column
    const cCols = (await db.getAllAsync("PRAGMA table_info(checkins)")).map(c => c.name);
    if (!cCols.includes('value')) {
      await db.execAsync('ALTER TABLE checkins ADD COLUMN value REAL DEFAULT NULL');
      console.log('✅ Migration: checkins.value');
    }

    // Phase E: Rebuild checkins for auto_skipped
    try {
      const tableInfo = await db.getFirstAsync(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='checkins'`
      );
      if (tableInfo?.sql && !tableInfo.sql.includes('auto_skipped')) {
        console.log('🔧 Rebuilding checkins for auto_skipped...');
        await db.execAsync('PRAGMA foreign_keys = OFF;');
        await db.execAsync(`
          CREATE TABLE checkins_new (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id   INTEGER NOT NULL,
            date       TEXT NOT NULL,
            status     TEXT NOT NULL CHECK(status IN ('done','missed','slip','resisted','skipped','auto_skipped')),
            note       TEXT,
            slip_count INTEGER NOT NULL DEFAULT 0,
            value      REAL DEFAULT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
            UNIQUE(habit_id, date)
          );
          INSERT INTO checkins_new SELECT id, habit_id, date, status, note, slip_count,
            CASE WHEN typeof(value)='real' OR typeof(value)='integer' THEN value ELSE NULL END,
            created_at FROM checkins;
          DROP TABLE checkins;
          ALTER TABLE checkins_new RENAME TO checkins;
          CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON checkins(habit_id, date);
          CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
          CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
        `);
        await db.execAsync('PRAGMA foreign_keys = ON;');
        console.log('✅ checkins rebuilt');
      }
    } catch (e) {
      try { await db.execAsync('PRAGMA foreign_keys = ON;'); } catch {}
      console.warn('checkins rebuild:', e.message);
    }

    // Phase F-1: journey_milestones table (CREATE IF NOT EXISTS in _initializeTables handles this)
    // Additional index for xp_log queries
    try {
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_xp_log_habit ON xp_log(habit_id);'
      );
    } catch {}

    // Phase G-1: deep slip log columns
    const stCols = (await db.getAllAsync('PRAGMA table_info(slip_triggers)')).map(c => c.name);
    const addSTCol = async (col, def) => {
      if (!stCols.includes(col)) {
        await db.execAsync(`ALTER TABLE slip_triggers ADD COLUMN ${col} ${def}`);
        console.log(`✅ Migration: slip_triggers.${col}`);
      }
    };
    await addSTCol('time_of_day',  'TEXT DEFAULT NULL');
    await addSTCol('hours_slept',  'TEXT DEFAULT NULL');
    await addSTCol('missed_alarm', 'INTEGER DEFAULT NULL');
    await addSTCol('mood_before',  'TEXT DEFAULT NULL');

  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
};

// ── XP v2 Recalculation ──────────────────────────────────────────────
// Wipes old xp_log, recalculates everything at new rates:
// done=+1, resisted=+2, missed=-2, slip=-5, skipped=0, auto_skipped=-2
// milestone XP at new values
// XP can go negative — no floor
const _backfillXPv2 = async (db) => {
  try {
    // Check guard
    const guard = await db.getFirstAsync("SELECT value FROM settings WHERE key='xp_v2_done'");
    if (guard?.value === 'true') return;

    // Also migrate Neel → Gagan if needed
    try {
      const ego = await db.getFirstAsync("SELECT value FROM settings WHERE key='alter_ego'");
      if (ego?.value === 'Neel') {
        await db.runAsync("UPDATE settings SET value='Gagan' WHERE key='alter_ego'");
        await db.runAsync("UPDATE settings SET value='I am Gagan. My mind holds the reins. The horses do not rule me.' WHERE key='identity_statement'");
        console.log('✅ Migrated: Neel → Gagan');
      }
    } catch {}

    console.log('⚡ XP v2 recalculation starting...');

    // Wrap in transaction for safety
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      // Clear old XP log
      await db.execAsync('DELETE FROM xp_log;');

      const NEW_XP = {
        done:         1,
        resisted:     2,
        missed:      -2,
        slip:        -5,
        skipped:      0,  // intentional skip — no penalty
        auto_skipped:-2,
      };

      const MILESTONE_XP = {
        3: 3, 7: 5, 14: 8, 21: 10, 30: 15,
        48: 10, 60: 20, 75: 15, 90: 30, 180: 50, 365: 100,
      };

      // Recalculate from all checkins
      const checkins = await db.getAllAsync(`
        SELECT c.habit_id, c.date, c.status, c.note, h.name as habit_name
        FROM checkins c
        LEFT JOIN habits h ON h.id = c.habit_id
        ORDER BY c.date ASC
      `);

      let totalXP = 0;

      for (const c of checkins) {
        let xp = 0;
        if (c.status === 'skipped') {
          // WFO-managed skips = 0 XP, user-intentional skips = 0 XP
          xp = (c.note && c.note.includes('WFO')) ? 0 : NEW_XP.skipped;
        } else {
          xp = NEW_XP[c.status] || 0;
        }

        if (xp !== 0) {
          await db.runAsync(
            'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)',
            [c.habit_id, xp, `v2: ${c.habit_name || 'habit'} — ${c.status}`, c.date]
          );
          totalXP += xp;
        }
      }

      // Recalculate milestone XP
      const milestones = await db.getAllAsync(
        'SELECT * FROM milestones ORDER BY achieved_at ASC'
      );
      for (const m of milestones) {
        const xp = MILESTONE_XP[m.milestone_days] || 0;
        if (xp > 0) {
          await db.runAsync(
            'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)',
            [m.habit_id, xp, `Milestone: ${m.milestone_days}d`, m.achieved_at]
          );
          totalXP += xp;
        }
      }

      // Save new total_xp
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('total_xp', ?)",
        [String(totalXP)]
      );

      await db.execAsync('COMMIT;');

      // Mark done
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('xp_v2_done', 'true')"
      );

      console.log(`✅ XP v2 done: ${totalXP} XP total`);

    } catch (txErr) {
      await db.execAsync('ROLLBACK;');
      console.warn('XP v2 rollback:', txErr.message);
    }

  } catch (err) {
    console.warn('XP v2 warning:', err.message);
  }
};

const _seedDefaultSettings = async (db) => {
  const defaults = [
    ['alter_ego',            'Gagan'],
    ['week_starts',          'monday'],
    ['total_xp',             '0'],
    ['notification_master',  'true'],
    ['app_theme',            'dark'],
    ['identity_statement',   'I am what I repeatedly do. I am not my intentions. I am my actions.'],
    ['identity_shown_date',  ''],
    ['wa_daily',             'true'],
    ['wa_weekly',            'true'],
    ['last_perfect_day',     ''],
    ['last_freeze_award',    ''],
    ['streak_freeze_count',  '0'],
    ['splash_image_uri',     ''],
    ['splash_image_type',    'default'],
    ['wfo_mode',             'false'],
    ['wfo_city',             'Bangalore'],
    ['home_city',            'Hassan'],
    ['wfo_non_negotiables',  ''],
    ['wfo_start_date',       ''],
    ['wfo_end_date',         ''],
    ['recovery_mode_shown',  ''],
    // Phase F-1 guards
    ['xp_backfill_done',     'true'],  // skip old backfill — v2 handles it
    ['xp_v2_done',           'false'],  // will recalculate on first launch
    ['sip_migration_done',   'true'],
    // Phase F-4: notification configs (JSON array of notification objects)
    ['notification_configs', JSON.stringify([
      {
        id: 'morning_intention',
        name: 'Morning Intention',
        enabled: true,
        time: '06:30',
        message: 'The battlefield is ready, Gagan. Your dharma awaits.',
        days: [2,3,4,5,6,7,1],  // All days (Mon=2...Sun=1 in Expo weekday format)
      },
      {
        id: 'evening_log',
        name: 'Evening Log Reminder',
        enabled: true,
        time: '21:00',
        message: 'Log your habits before midnight. The chariot waits.',
        days: [2,3,4,5,6],  // Mon-Fri default
      },
      {
        id: 'streak_protection',
        name: 'Streak Protection',
        enabled: true,
        time: '21:30',
        message: 'Your streak is at risk tonight. One tap. That is all.',
        days: [2,3,4,5,6,7,1],  // All days
      },
      {
        id: 'sunday_reflection',
        name: 'Sunday Reflection',
        enabled: true,
        time: '20:00',
        message: 'Sunday. Time to reflect, Gagan. How was your week?',
        days: [1],  // Sunday only (1 = Sunday in Expo format)
      },
      {
        id: 'pattern_warning',
        name: 'Evening Pattern Warning',
        enabled: true,
        time: '19:00',
        message: 'Evening. This is when most people give in. You have data on your side. Check your patterns.',
        days: [2,3,4,5,6,7,1],  // All days
      },
    ])],
    ['morning_brief',            ''],
    ['goal_name',                'Jitendriya'],
    ['transformation_sentence',  'Gagan is the open sky. Jitendriya is the sky that he chose.'],
  ];

  for (const [key, value] of defaults) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
};

export const closeDatabase = async () => {
  if (_db) {
    try { await _db.closeAsync(); _db = null; } catch {}
  }
};