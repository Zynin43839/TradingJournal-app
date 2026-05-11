const { getDb } = require("../db");

module.exports = function registerSettingsRoutes(app) {
  const db = () => getDb();

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const row = (await db().execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [req.params.key] })).rows[0];
      res.json(row ? { value: row.value } : { value: null, message: "Key not found" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      await db().execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", args: [req.params.key, req.body.value] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
