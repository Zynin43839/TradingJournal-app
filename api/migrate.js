const { query } = require("./db");

async function migrate() {

  const tables = [
    `CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY, date TEXT, pair TEXT, direction TEXT,
      session TEXT, lot_size REAL, entry_price REAL, sl_price REAL,
      tp_price REAL, exit_price REAL, pnl REAL, rr_ratio REAL,
      emotion_before TEXT, emotion_during TEXT, emotion_after TEXT,
      strategy TEXT, notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trading_logs (
      id TEXT PRIMARY KEY, date TEXT, symbol TEXT, side TEXT,
      entry_price REAL DEFAULT 0, exit_price REAL DEFAULT 0,
      pnl REAL DEFAULT 0, result TEXT, lot_size REAL DEFAULT 0,
      sl_price REAL DEFAULT 0, tp_price REAL DEFAULT 0,
      session TEXT, emotion_before TEXT, setup_name TEXT,
      confidence INTEGER DEFAULT 5,
      pre_trade_notes TEXT DEFAULT '', post_trade_notes TEXT DEFAULT '',
      lessons_learned TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trading_plans (
      id TEXT PRIMARY KEY, session_id TEXT DEFAULT '',
      type TEXT DEFAULT 'long', title TEXT NOT NULL,
      pairs TEXT DEFAULT '', timeframe TEXT DEFAULT '',
      setup_name TEXT DEFAULT '', direction TEXT DEFAULT '',
      entry_zone_high REAL DEFAULT 0, entry_zone_low REAL DEFAULT 0,
      sl_price REAL DEFAULT 0, tp_price REAL DEFAULT 0,
      tp1 REAL DEFAULT 0, tp2 REAL DEFAULT 0, tp3 REAL DEFAULT 0,
      rr_ratio REAL DEFAULT 0, confidence INTEGER DEFAULT 5,
      confluence_ob INTEGER DEFAULT 0, confluence_fvg INTEGER DEFAULT 0,
      confluence_choch INTEGER DEFAULT 0, confluence_ema INTEGER DEFAULT 0,
      confluence_rsi INTEGER DEFAULT 0, confluence_volume INTEGER DEFAULT 0,
      htf_bias TEXT DEFAULT '', key_sr TEXT DEFAULT '',
      must_see TEXT DEFAULT '', must_avoid TEXT DEFAULT '',
      pre_trade_notes TEXT DEFAULT '',
      plan_status TEXT DEFAULT 'planned',
      invalidation_reason TEXT DEFAULT '', execution_notes TEXT DEFAULT '',
      actual_outcome TEXT DEFAULT '',
      followed_plan INTEGER DEFAULT NULL,
      review_notes TEXT DEFAULT '', lessons_learned TEXT DEFAULT '',
      review_completed INTEGER DEFAULT 0,
      actual_result TEXT DEFAULT '', actual_pnl REAL DEFAULT 0,
      market_moved_as_predicted INTEGER DEFAULT NULL,
      review_completed_at TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_sessions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '',
      session_date TEXT DEFAULT '', session_type TEXT DEFAULT 'daily',
      status TEXT DEFAULT 'active',
      review_completed INTEGER DEFAULT 0,
      review_notes TEXT DEFAULT '', lessons_learned TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_templates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '', setup_name TEXT DEFAULT '',
      trade_style TEXT DEFAULT '',
      default_pairs TEXT DEFAULT '', default_timeframe TEXT DEFAULT '',
      default_risk REAL DEFAULT 1, default_rr REAL DEFAULT 2,
      rules TEXT DEFAULT '', must_see TEXT DEFAULT '',
      must_avoid TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_versions (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL,
      version INTEGER DEFAULT 1, changes TEXT DEFAULT '',
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_journey (
      id TEXT PRIMARY KEY, session_id TEXT DEFAULT '',
      date TEXT, symbol TEXT, direction TEXT,
      entry_price REAL, exit_price REAL, sl_price REAL, tp_price REAL,
      lot_size REAL, pnl REAL, rr_ratio REAL, result TEXT, status TEXT,
      setup_name TEXT, market_condition TEXT,
      timeframe TEXT, session TEXT,
      emotion_before TEXT, notes TEXT, tags TEXT,
      hold_time_minutes INTEGER DEFAULT 0,
      exit_reason TEXT DEFAULT '',
      plan_id TEXT DEFAULT '', test_run_id TEXT DEFAULT '',
      commission REAL DEFAULT 0, swap REAL DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_sessions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_test_runs (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT DEFAULT '',
      setup_name TEXT DEFAULT '',
      total_candles INTEGER DEFAULT 0,
      completed_candles INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS economic_events (
      id TEXT PRIMARY KEY,
      date TEXT, currency TEXT, event TEXT,
      impact TEXT DEFAULT 'medium',
      forecast TEXT DEFAULT '', previous TEXT DEFAULT '',
      actual TEXT DEFAULT '',
      time_bkk TEXT DEFAULT '', datetime_bkk TEXT DEFAULT '',
      symbols TEXT DEFAULT '',
      created_at TEXT
    )`,
  ];

  for (const sql of tables) {
    try { await query({ sql }); } catch (e) { console.error("Migration error:", e.message); }
  }

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(date)",
    "CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON economic_events(currency)",
    "CREATE INDEX IF NOT EXISTS idx_plan_sessions_date ON plan_sessions(session_date)",
    "CREATE INDEX IF NOT EXISTS idx_trading_plans_session ON trading_plans(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_backtest_journey_session ON backtest_journey(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_trading_logs_date ON trading_logs(date)",
  ];
  for (const sql of indexes) {
    try { await query({ sql }); } catch (e) { /* ignore */ }
  }

  const alterTable = [
    "ALTER TABLE economic_events ADD COLUMN time_bkk TEXT DEFAULT ''",
    "ALTER TABLE economic_events ADD COLUMN datetime_bkk TEXT DEFAULT ''",
    "ALTER TABLE economic_events ADD COLUMN symbols TEXT DEFAULT ''",
  ];
  for (const sql of alterTable) {
    try { await query({ sql }); } catch (e) { /* ignore (column may already exist) */ }
  }

  console.log("  Database migrated successfully");
}

module.exports = { migrate };
