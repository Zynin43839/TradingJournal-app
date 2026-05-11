const { getDb } = require("../db");

module.exports = function registerFocusRoutes(app) {
  const db = () => getDb();

  app.get("/api/goals", async (_req, res) => {
    try {
      const r = await db().execute({ sql: "SELECT * FROM goals ORDER BY created_at DESC" });
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const { title, description, target_value, current_value, unit, deadline, category } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
      const id = `goal_${Date.now()}`;
      const now = new Date().toISOString();
      await db().execute({
        sql: "INSERT INTO goals (id, title, description, target_value, current_value, unit, deadline, category, progress, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        args: [id, title, description || "", target_value || 100, current_value || 0, unit || "%", deadline || null, category || "general", 0, "active", now, now]
      });
      res.json({ id, title, progress: 0, status: "active" });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const { title, description, target_value, current_value, unit, deadline, category, status } = req.body;
      const now = new Date().toISOString();
      const progress = target_value ? Math.round(((current_value || 0) / target_value) * 100) : 0;
      await db().execute({
        sql: "UPDATE goals SET title=?, description=?, target_value=?, current_value=?, unit=?, deadline=?, category=?, status=?, progress=?, updated_at=? WHERE id=?",
        args: [title, description, target_value, current_value, unit, deadline, category, status || "active", progress, now, req.params.id]
      });
      res.json({ success: true, progress });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      await db().execute({ sql: "DELETE FROM goals WHERE id = ?", args: [req.params.id] });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/goals/:id/progress", async (req, res) => {
    try {
      const { current_value } = req.body;
      const r = await db().execute({ sql: "SELECT * FROM goals WHERE id = ?", args: [req.params.id] });
      const goal = r.rows[0];
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      const progress = goal.target_value ? Math.round((current_value / goal.target_value) * 100) : 0;
      const status = progress >= 100 ? "completed" : "active";
      const now = new Date().toISOString();
      await db().execute({ sql: "UPDATE goals SET current_value = ?, progress = ?, status = ?, updated_at = ? WHERE id = ?", args: [current_value, progress, status, now, req.params.id] });
      res.json({ success: true, progress, status });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/habits", async (_req, res) => {
    try {
      const r = await db().execute({ sql: "SELECT * FROM habits ORDER BY created_at DESC" });
      const today = new Date().toISOString().split("T")[0];
      const c = await db().execute({ sql: "SELECT habit_id, COUNT(*) as count FROM habit_completions WHERE date = ? GROUP BY habit_id", args: [today] });
      const completionMap = {};
      c.rows.forEach(x => { completionMap[x.habit_id] = x.count > 0; });
      res.json(r.rows.map(h => ({ ...h, completed_today: !!completionMap[h.id] })));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/habits", async (req, res) => {
    try {
      const { name, emoji, category, target_days } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
      const id = `habit_${Date.now()}`;
      const now = new Date().toISOString();
      await db().execute({
        sql: "INSERT INTO habits (id, name, emoji, category, target_days, streak, best_streak, total_completions, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        args: [id, name, emoji || "🐾", category || "general", JSON.stringify(target_days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]), 0, 0, 0, now, now]
      });
      res.json({ id, name, emoji, streak: 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/habits/:id", async (req, res) => {
    try {
      const { name, emoji, category, target_days } = req.body;
      const now = new Date().toISOString();
      await db().execute({ sql: "UPDATE habits SET name=?, emoji=?, category=?, target_days=?, updated_at=? WHERE id=?", args: [name, emoji, category, JSON.stringify(target_days), now, req.params.id] });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/habits/:id", async (req, res) => {
    try {
      await db().execute({ sql: "DELETE FROM habit_completions WHERE habit_id = ?", args: [req.params.id] });
      await db().execute({ sql: "DELETE FROM habits WHERE id = ?", args: [req.params.id] });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/habits/:id/toggle", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await db().execute({ sql: "BEGIN" });
      try {
        const existing = await db().execute({ sql: "SELECT * FROM habit_completions WHERE habit_id = ? AND date = ?", args: [req.params.id, today] });
        if (existing.rows[0]) {
          await db().execute({ sql: "DELETE FROM habit_completions WHERE habit_id = ? AND date = ?", args: [req.params.id, today] });
          const h = await db().execute({ sql: "SELECT * FROM habits WHERE id = ?", args: [req.params.id] });
          const newStreak = Math.max(0, (h.rows[0]?.streak || 1) - 1);
          await db().execute({ sql: "UPDATE habits SET streak = ?, updated_at = ? WHERE id = ?", args: [newStreak, new Date().toISOString(), req.params.id] });
          await db().execute({ sql: "COMMIT" });
          res.json({ completed: false, streak: newStreak });
        } else {
          await db().execute({ sql: "INSERT INTO habit_completions (id, habit_id, date) VALUES (?,?,?)", args: [`hc_${Date.now()}`, req.params.id, today] });
          const h = await db().execute({ sql: "SELECT * FROM habits WHERE id = ?", args: [req.params.id] });
          const newStreak = (h.rows[0]?.streak || 0) + 1;
          const bestStreak = Math.max(newStreak, h.rows[0]?.best_streak || 0);
          await db().execute({ sql: "UPDATE habits SET streak = ?, best_streak = ?, total_completions = total_completions + 1, updated_at = ? WHERE id = ?", args: [newStreak, bestStreak, new Date().toISOString(), req.params.id] });
          await db().execute({ sql: "COMMIT" });
          res.json({ completed: true, streak: newStreak });
        }
      } catch (e) {
        await db().execute({ sql: "ROLLBACK" });
        throw e;
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/habits/:id/history", async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const r = await db().execute({ sql: "SELECT date FROM habit_completions WHERE habit_id = ? AND date >= ? ORDER BY date DESC", args: [req.params.id, cutoff] });
      res.json({ completions: r.rows.map(c => c.date), days });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
