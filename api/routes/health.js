const { getDb } = require("../db");

module.exports = function registerHealthRoutes(app) {
  const db = () => getDb();

  app.get("/api/health", async (_req, res) => {
    try {
      const tables = (await db().execute({ sql: "SELECT name FROM sqlite_master WHERE type='table'" })).rows.map(t => t.name);
      const tradeCount = (await db().execute({ sql: "SELECT COUNT(*) as c FROM trading_logs" })).rows[0].c;
      const goalCount = (await db().execute({ sql: "SELECT COUNT(*) as c FROM goals" })).rows[0].c;
      const habitCount = (await db().execute({ sql: "SELECT COUNT(*) as c FROM habits" })).rows[0].c;
      res.json({
        status: "ok",
        turso: "connected",
        tables: tables.length,
        records: { trades: tradeCount, goals: goalCount, habits: habitCount }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
