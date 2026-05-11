const { getDb } = require("../db");

module.exports = function registerTradingRoutes(app) {
  const db = () => getDb();

  app.get("/api/trading_logs/stats", async (_req, res) => {
    try {
      const overview = (await db().execute({
        sql: `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'Loss' THEN 1 ELSE 0 END) as losses,
          ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as win_rate,
          ROUND(SUM(pnl), 2) as total_pnl,
          ROUND(AVG(pnl), 2) as avg_pnl,
          MAX(pnl) as best_trade,
          MIN(pnl) as worst_trade
        FROM trading_logs`
      })).rows[0];

      const bySymbol = (await db().execute({
        sql: "SELECT symbol, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM trading_logs GROUP BY symbol ORDER BY cnt DESC"
      })).rows;

      const bySide = (await db().execute({
        sql: "SELECT side, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / COUNT(*), 1) as wr FROM trading_logs GROUP BY side"
      })).rows;

      const byRegime = (await db().execute({
        sql: "SELECT regime, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / COUNT(*), 1) as wr FROM trading_logs GROUP BY regime ORDER BY cnt DESC"
      })).rows;

      const byEmotion = (await db().execute({
        sql: "SELECT emotion_before, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM trading_logs GROUP BY emotion_before ORDER BY cnt DESC"
      })).rows;

      const byRiskCheck = (await db().execute({
        sql: "SELECT risk_check, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM trading_logs GROUP BY risk_check ORDER BY cnt DESC"
      })).rows;

      const recent = (await db().execute({
        sql: "SELECT * FROM trading_logs ORDER BY date DESC, id DESC LIMIT 5"
      })).rows;

      res.json({ overview, bySymbol, bySide, byRegime, byEmotion, byRiskCheck, recent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/scans", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 50));
      const symbol = req.query.symbol || '';
      let sql, args;
      if (symbol) {
        sql = "SELECT * FROM scan_history WHERE symbol LIKE ? ORDER BY created_at DESC LIMIT ?";
        args = [`%${symbol}%`, limit];
      } else {
        sql = "SELECT * FROM scan_history ORDER BY created_at DESC LIMIT ?";
        args = [limit];
      }
      const scans = (await db().execute({ sql, args })).rows;
      const total = (await db().execute({ sql: "SELECT COUNT(*) as c FROM scan_history" })).rows[0].c;
      res.json({ scans, total, limit });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/scans", async (req, res) => {
    try {
      const { symbol, timeframe, full, skinny, source } = req.body;
      const id = `scan_${Date.now()}`;
      const now = new Date().toISOString();
      const pillars = full?.pillars || {};
      await db().execute({
        sql: `INSERT INTO scan_history (id, symbol, timeframe, price, signal, score, regime, adx, slope, r1, s1, volume_spike, full_data, skinny, source, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id,
          symbol || full?.symbol || '',
          timeframe || full?.timeframe || '',
          full?.price || 0,
          pillars.meow_score?.signal || '',
          pillars.meow_score?.total || 0,
          pillars.regime?.direction || '',
          pillars.regime?.adx || 0,
          pillars.regime?.slope || 0,
          pillars.smc?.r1 || null,
          pillars.smc?.s1 || null,
          pillars.volume?.spike ? 1 : 0,
          JSON.stringify(full || {}),
          skinny || '',
          source || 'manual',
          now
        ]
      });
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/scans/:id", async (req, res) => {
    try {
      await db().execute({ sql: "DELETE FROM scan_history WHERE id = ?", args: [req.params.id] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
