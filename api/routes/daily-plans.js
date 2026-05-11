const { getDb } = require("../db");

module.exports = function registerDailyPlanRoutes(app) {
  const db = () => getDb();

  app.get("/api/daily-plans", async (_req, res) => {
    try {
      const rows = (await db().execute({
        sql: "SELECT * FROM daily_plans ORDER BY date DESC LIMIT 90"
      })).rows;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/daily-plans", async (req, res) => {
    try {
      const now = new Date().toISOString();
      const p = req.body;
      const id = p.id || "dp_" + Date.now();
      await db().execute({
        sql: "INSERT OR REPLACE INTO daily_plans (id, date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        args: [id, p.date, p.content || '', now, now]
      });
      res.json({ id, ...p, created_at: now, updated_at: now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/daily-plans/:id", async (req, res) => {
    try {
      const plan = (await db().execute({ sql: "SELECT * FROM daily_plans WHERE id = ?", args: [req.params.id] })).rows[0];
      if (!plan) return res.status(404).json({ error: "Not found" });
      res.json(plan);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reminder_settings", async (_req, res) => {
    try {
      let settings = (await db().execute({ sql: "SELECT * FROM reminder_settings WHERE id = 'daily_plan'" })).rows[0];
      if (!settings) {
        const now = new Date().toISOString();
        await db().execute({ sql: "INSERT OR IGNORE INTO reminder_settings (id, reminder_time, enabled, updated_at) VALUES ('daily_plan', '18:00', 1, ?)", args: [now] });
        settings = (await db().execute({ sql: "SELECT * FROM reminder_settings WHERE id = 'daily_plan'" })).rows[0];
      }
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/reminder_settings", async (req, res) => {
    try {
      const now = new Date().toISOString();
      const { reminder_time, enabled } = req.body;
      await db().execute({
        sql: "UPDATE reminder_settings SET reminder_time = ?, enabled = ?, updated_at = ? WHERE id = 'daily_plan'",
        args: [reminder_time || '18:00', enabled !== undefined ? (enabled ? 1 : 0) : 1, now]
      });
      const updated = (await db().execute({ sql: "SELECT * FROM reminder_settings WHERE id = 'daily_plan'" })).rows[0];
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
