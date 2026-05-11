const { getDb } = require("./db");

async function migrate() {
  const db = getDb();

  const tables = [
    `CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY, date TEXT, pair TEXT, direction TEXT,
      session TEXT, lot_size REAL, entry_price REAL, sl_price REAL,
      tp_price REAL, exit_price REAL, pnl REAL, rr_ratio REAL,
      emotion_before TEXT, emotion_during TEXT, emotion_after TEXT,
      strategy TEXT, notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT, status TEXT, priority TEXT,
      category TEXT DEFAULT 'other', due_date TEXT, due_time TEXT,
      goal_id TEXT DEFAULT '', habit_id TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, title TEXT, progress REAL, target TEXT,
      description TEXT DEFAULT '', target_value REAL DEFAULT 0,
      current_value REAL DEFAULT 0, unit TEXT DEFAULT '%',
      deadline TEXT, category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'active',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY, name TEXT, emoji TEXT,
      streak INTEGER DEFAULT 0, completed INTEGER DEFAULT 0,
      category TEXT DEFAULT 'general',
      target_days TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
      best_streak INTEGER DEFAULT 0, total_completions INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY, habit_id TEXT, date TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trading_logs (
      id TEXT PRIMARY KEY, date TEXT, symbol TEXT, side TEXT,
      entry_price REAL DEFAULT 0, exit_price REAL DEFAULT 0,
      pnl REAL DEFAULT 0, result TEXT, status TEXT, regime TEXT,
      trade_count TEXT, risk_check TEXT, lessons_learned TEXT,
      lot_size REAL DEFAULT 0, sl_price REAL DEFAULT 0,
      tp_price REAL DEFAULT 0, session TEXT, rr_ratio TEXT,
      emotion_before TEXT, emotion_after TEXT, emotion_during TEXT,
      screenshot_link TEXT, setup_name TEXT, confidence INTEGER,
      pre_trade_notes TEXT, post_trade_notes TEXT, notes TEXT, tags TEXT,
      mt5_deal_id TEXT, mt5_position_id TEXT,
      commission REAL DEFAULT 0, swap REAL DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE, content TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trading_plans (
      id TEXT PRIMARY KEY, type TEXT DEFAULT 'long',
      title TEXT NOT NULL, content TEXT, trade_style TEXT,
      pairs TEXT, target TEXT, risk_per_trade TEXT,
      max_daily_loss TEXT, direction TEXT, entry_price REAL,
      sl_price REAL, tp_price REAL, lot_size REAL, rr_ratio REAL,
      session TEXT, market_condition TEXT, strategy TEXT,
      timeframe TEXT, rules TEXT, notes TEXT, tags TEXT,
      status TEXT DEFAULT 'active', session_id TEXT DEFAULT '',
      date TEXT DEFAULT '', setup_name TEXT DEFAULT '',
      emotion_before TEXT DEFAULT '', emotion_during TEXT DEFAULT '',
      emotion_after TEXT DEFAULT '', confidence INTEGER DEFAULT 5,
      pre_trade_notes TEXT DEFAULT '', post_trade_notes TEXT DEFAULT '',
      screenshot_link TEXT DEFAULT '',
      confluence_ob INTEGER DEFAULT 0, confluence_fvg INTEGER DEFAULT 0,
      confluence_choch INTEGER DEFAULT 0, confluence_ema INTEGER DEFAULT 0,
      confluence_rsi INTEGER DEFAULT 0, confluence_volume INTEGER DEFAULT 0,
      must_see TEXT DEFAULT '', must_avoid TEXT DEFAULT '',
      be_rule TEXT DEFAULT '', trailing_sl TEXT DEFAULT '',
      mt5_data TEXT DEFAULT '', ai_analysis TEXT DEFAULT '',
      analyzed_at TEXT DEFAULT '',
      entry_zone_high REAL DEFAULT 0, entry_zone_low REAL DEFAULT 0,
      tp1 REAL DEFAULT 0, tp2 REAL DEFAULT 0, tp3 REAL DEFAULT 0,
      max_positions INTEGER DEFAULT 1,
      htf_bias TEXT DEFAULT '', key_sr TEXT DEFAULT '',
      news_events TEXT DEFAULT '', partial_tp_pct INTEGER DEFAULT 0,
      template_id TEXT DEFAULT '', scenario_number INTEGER DEFAULT 1,
      plan_status TEXT DEFAULT 'planned',
      invalidation_reason TEXT DEFAULT '', execution_notes TEXT DEFAULT '',
      actual_outcome TEXT DEFAULT '',
      followed_plan INTEGER DEFAULT NULL,
      review_notes TEXT DEFAULT '', lessons_learned TEXT DEFAULT '',
      review_completed INTEGER DEFAULT 0,
      actual_result TEXT DEFAULT '', actual_pnl REAL DEFAULT 0,
      market_moved_as_predicted INTEGER DEFAULT NULL,
      invalidation_hit INTEGER DEFAULT NULL,
      review_completed_at TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_journey (
      id TEXT PRIMARY KEY, session_id TEXT DEFAULT '',
      date TEXT, symbol TEXT, direction TEXT, trade_style TEXT,
      entry_price REAL, exit_price REAL, sl_price REAL, tp_price REAL,
      lot_size REAL, pnl REAL, rr_ratio REAL, result TEXT, status TEXT,
      strategy TEXT, setup_name TEXT, market_condition TEXT,
      timeframe TEXT, session TEXT,
      emotion_before TEXT, emotion_after TEXT, emotion_during TEXT DEFAULT '',
      lessons_learned TEXT, notes TEXT, tags TEXT,
      screenshot_link TEXT,
      created_at TEXT, updated_at TEXT,
      plan_used TEXT DEFAULT '', plan_accuracy REAL DEFAULT 0,
      hold_time_minutes INTEGER DEFAULT 0, partial_close REAL DEFAULT 0,
      mae REAL DEFAULT 0, mfe REAL DEFAULT 0,
      exit_reason TEXT DEFAULT '', exit_reason_detailed TEXT DEFAULT '',
      ai_analysis TEXT DEFAULT '', analyzed_at TEXT DEFAULT '',
      planned_entry REAL DEFAULT 0, planned_sl REAL DEFAULT 0,
      planned_tp REAL DEFAULT 0, slippage REAL DEFAULT 0,
      commission REAL DEFAULT 0, swap REAL DEFAULT 0,
      net_pnl REAL DEFAULT 0,
      followed_plan TEXT DEFAULT '', mistakes TEXT DEFAULT '',
      rule_violations TEXT DEFAULT '', max_dd_during_trade REAL DEFAULT 0,
      plan_id TEXT DEFAULT '', test_run_id TEXT DEFAULT '',
      replay_candles TEXT DEFAULT '', decision_log TEXT DEFAULT '',
      entry_trigger TEXT DEFAULT '', exit_trigger TEXT DEFAULT '',
      plan_setup TEXT DEFAULT '', plan_trigger TEXT DEFAULT '',
      plan_risk_rules TEXT DEFAULT '', plan_notes TEXT DEFAULT '',
      plan_status TEXT DEFAULT 'draft', plan_date TEXT DEFAULT '',
      actual_followed TEXT DEFAULT '', deviation_reason TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_sessions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'active',
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_sessions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active', session_date TEXT DEFAULT '',
      session_type TEXT DEFAULT 'daily',
      review_completed INTEGER DEFAULT 0,
      review_notes TEXT DEFAULT '', lessons_learned TEXT DEFAULT '',
      ai_analysis TEXT DEFAULT '', analyzed_at TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_templates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      description TEXT DEFAULT '', setup_name TEXT DEFAULT '',
      trade_style TEXT DEFAULT '',
      default_pairs TEXT DEFAULT '', default_timeframe TEXT DEFAULT '',
      default_risk REAL DEFAULT 1, default_rr REAL DEFAULT 2,
      rules TEXT DEFAULT '', confluence_checklist TEXT DEFAULT '',
      must_see TEXT DEFAULT '', must_avoid TEXT DEFAULT '',
      risk_rules TEXT DEFAULT '', trade_management TEXT DEFAULT '',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS plan_versions (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL,
      version INTEGER DEFAULT 1, changes TEXT DEFAULT '',
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS backtest_test_runs (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT DEFAULT '',
      setup_name TEXT DEFAULT '',
      start_date TEXT, end_date TEXT,
      total_candles INTEGER DEFAULT 0,
      completed_candles INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS signal_logs (
      id TEXT PRIMARY KEY, agent_name TEXT NOT NULL,
      signal_type TEXT, symbol TEXT, entry_price REAL,
      confidence REAL, reasoning TEXT,
      status TEXT DEFAULT 'pending', created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS trade_executions (
      id TEXT PRIMARY KEY, signal_id TEXT,
      order_type TEXT, lot_size REAL,
      executed_price REAL, sl_price REAL, tp_price REAL,
      result TEXT DEFAULT 'pending', pnl_realized REAL,
      executed_at TEXT, closed_at TEXT,
      mae REAL DEFAULT 0, mfe REAL DEFAULT 0,
      outcome_type TEXT DEFAULT '', signal_review TEXT DEFAULT '',
      weight_adjustment REAL DEFAULT 1.0,
      trade_type TEXT DEFAULT 'scalp',
      entry_zone_high REAL DEFAULT 0, entry_zone_low REAL DEFAULT 0,
      tp2_price REAL DEFAULT 0, tp3_price REAL DEFAULT 0,
      time_exit TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS news_logs (
      id TEXT PRIMARY KEY, headline TEXT, currency TEXT,
      impact TEXT, sentiment TEXT, source TEXT,
      event_date TEXT, analyzed_at TEXT, ai_summary TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY, level TEXT, source TEXT,
      message TEXT, details TEXT, created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS strategy_tuner_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT, symbol TEXT, category TEXT,
      parameter TEXT, current_value TEXT, suggested_value TEXT,
      reasoning TEXT, priority TEXT, status TEXT,
      report TEXT, created_at TEXT, reviewed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS reminder_settings (
      id TEXT PRIMARY KEY DEFAULT 'daily_plan',
      reminder_time TEXT DEFAULT '18:00',
      enabled INTEGER DEFAULT 1, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS learning_log (
      id TEXT PRIMARY KEY, date TEXT, topic TEXT,
      source TEXT, duration_minutes INTEGER DEFAULT 0,
      key_takeaways TEXT, confidence_before INTEGER DEFAULT 5,
      confidence_after INTEGER DEFAULT 5, notes TEXT, tags TEXT,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rag_diary (
      id TEXT PRIMARY KEY, date TEXT, entry_type TEXT,
      title TEXT, content TEXT, ai_summary TEXT,
      mood TEXT, tags TEXT, related_entries TEXT,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS studio_notes (
      id TEXT PRIMARY KEY, topic TEXT, notebook_context TEXT,
      processed TEXT, timestamp TEXT,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS notebooklm_notes (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
      source TEXT, ai_summary TEXT, tags TEXT,
      created_at TEXT, updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS vault_files (
      id TEXT PRIMARY KEY, filename TEXT UNIQUE, content TEXT,
      size INTEGER DEFAULT 0, last_modified TEXT,
      created_at TEXT, updated_at TEXT
    )`,
  ];

  for (const sql of tables) {
    try { await db.execute({ sql }); } catch (e) { console.error("Migration error:", e.message); }
  }

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_signal_logs_agent ON signal_logs(agent_name, symbol, signal_type, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_signal_logs_status ON signal_logs(status)",
    "CREATE INDEX IF NOT EXISTS idx_news_logs_lookup ON news_logs(headline, currency, analyzed_at)",
    "CREATE INDEX IF NOT EXISTS idx_habit_completions ON habit_completions(habit_id, date)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date, status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_habit ON tasks(habit_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks(goal_id)",
    "CREATE INDEX IF NOT EXISTS idx_backtest_journey_session ON backtest_journey(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_trading_logs_date ON trading_logs(date)",
    "CREATE INDEX IF NOT EXISTS idx_strategy_tuner_status ON strategy_tuner_log(status)",
    "CREATE INDEX IF NOT EXISTS idx_trade_executions_signal ON trade_executions(signal_id)",
  ];
  for (const sql of indexes) {
    try { await db.execute({ sql }); } catch (e) { /* ignore */ }
  }

  console.log("  Database migrated successfully");
}

module.exports = { migrate };
