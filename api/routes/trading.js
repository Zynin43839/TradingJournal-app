const { query } = require("../db");

module.exports = function registerTradingRoutes(app) {

  app.get("/api/trading_logs/stats", async (_req, res) => {
    try {
      const overview = (await query({
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

      const bySymbol = (await query({
        sql: "SELECT symbol, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM trading_logs GROUP BY symbol ORDER BY cnt DESC"
      })).rows;

      const bySide = (await query({
        sql: "SELECT side, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / COUNT(*), 1) as wr FROM trading_logs GROUP BY side"
      })).rows;

      const byEmotion = (await query({
        sql: "SELECT emotion_before, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM trading_logs GROUP BY emotion_before ORDER BY cnt DESC"
      })).rows;

      const recent = (await query({
        sql: "SELECT * FROM trading_logs ORDER BY date DESC, id DESC LIMIT 5"
      })).rows;

      res.json({ overview, bySymbol, bySide, byEmotion, recent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
