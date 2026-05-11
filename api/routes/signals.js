const { getDb } = require("../db");

module.exports = function registerSignalRoutes(app) {
  const db = () => getDb();

  app.get("/api/signals", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const rows = (await db().execute({
        sql: "SELECT * FROM signal_logs ORDER BY created_at DESC LIMIT ?",
        args: [limit]
      })).rows;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/signals", async (req, res) => {
    try {
      const { agent_name, signal_type, symbol, entry_price, confidence, reasoning } = req.body;
      const id = `sig_${Date.now()}`;
      const now = new Date().toISOString();
      await db().execute({
        sql: "INSERT INTO signal_logs (id, agent_name, signal_type, symbol, entry_price, confidence, reasoning, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
        args: [id, agent_name || 'unknown', signal_type || '', symbol || '', entry_price || 0, confidence || 0, reasoning || '', now]
      });
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/signals", async (_req, res) => {
    try {
      await db().execute({ sql: "DELETE FROM signal_logs" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/signals/:id", async (req, res) => {
    try {
      const { status } = req.body;
      await db().execute({ sql: "UPDATE signal_logs SET status = ? WHERE id = ?", args: [status, req.params.id] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/signals/pending", async (_req, res) => {
    try {
      const rows = (await db().execute({
        sql: "SELECT * FROM signal_logs WHERE status = 'pending' ORDER BY created_at ASC"
      })).rows;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/trade-executions", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const rows = (await db().execute({
        sql: "SELECT * FROM trade_executions ORDER BY executed_at DESC LIMIT ?",
        args: [limit]
      })).rows;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/trade-executions", async (req, res) => {
    try {
      const { signal_id, order_type, lot_size, executed_price, sl_price, tp_price } = req.body;
      const id = `exec_${Date.now()}`;
      const now = new Date().toISOString();
      await db().execute({
        sql: "INSERT INTO trade_executions (id, signal_id, order_type, lot_size, executed_price, sl_price, tp_price, result, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
        args: [id, signal_id || '', order_type || '', lot_size || 0, executed_price || 0, sl_price || 0, tp_price || 0, now]
      });
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/trade-executions", async (_req, res) => {
    try {
      await db().execute({ sql: "DELETE FROM trade_executions" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
