const { query } = require("../db");

module.exports = function registerPlanRoutes(app) {

  app.put("/api/plans/:id/status", async (req, res) => {
    try {
      const { status, reason, execution_notes } = req.body;
      const validStatuses = ['planned', 'active', 'executed', 'skipped', 'invalidated'];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      const now = new Date().toISOString();
      const updates = { plan_status: status, updated_at: now };
      if (status === 'invalidated' && reason) updates.invalidation_reason = reason;
      if (status === 'executed' && execution_notes) updates.execution_notes = execution_notes;
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const vals = [...Object.values(updates), req.params.id];
      await query({ sql: `UPDATE trading_plans SET ${setClauses} WHERE id = ?`, args: vals });
      res.json({ ok: true, ...updates });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/plans/:id/review", async (req, res) => {
    try {
      const { actual_outcome, followed_plan, review_notes, lessons_learned, actual_result, actual_pnl, market_moved_as_predicted, invalidation_hit } = req.body;
      const now = new Date().toISOString();
      await query({
        sql: "UPDATE trading_plans SET actual_outcome = ?, followed_plan = ?, review_notes = ?, lessons_learned = ?, review_completed = 1, actual_result = ?, actual_pnl = ?, market_moved_as_predicted = ?, invalidation_hit = ?, review_completed_at = ?, updated_at = ? WHERE id = ?",
        args: [actual_outcome || '', followed_plan !== undefined ? followed_plan : null, review_notes || '', lessons_learned || '', actual_result || '', actual_pnl || 0, market_moved_as_predicted !== undefined ? market_moved_as_predicted : null, invalidation_hit !== undefined ? invalidation_hit : null, now, now, req.params.id]
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/plans/:id/backtest-results", async (req, res) => {
    try {
      const entries = (await query({
        sql: "SELECT * FROM backtest_journey WHERE plan_id = ? ORDER BY date ASC",
        args: [req.params.id]
      })).rows;
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/backtest_entries/:id/link-plan", async (req, res) => {
    try {
      const { plan_id } = req.body;
      await query({ sql: "UPDATE backtest_journey SET plan_id = ? WHERE id = ?", args: [plan_id || '', req.params.id] });
      res.json({ ok: true, plan_id: plan_id || '' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
