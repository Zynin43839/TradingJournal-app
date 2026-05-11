const { query } = require("../db");

module.exports = function registerSessionRoutes(app) {

  app.get("/api/plan_sessions/:id/stats", async (req, res) => {
    try {
      const session = (await query({ sql: "SELECT * FROM plan_sessions WHERE id = ?", args: [req.params.id] })).rows[0];
      if (!session) return res.status(404).json({ error: "Session not found" });

      const planCounts = (await query({
        sql: `SELECT COUNT(*) as total,
          SUM(CASE WHEN type = 'short' THEN 1 ELSE 0 END) as short_count,
          SUM(CASE WHEN type = 'long' THEN 1 ELSE 0 END) as long_count
        FROM trading_plans WHERE session_id = ?`,
        args: [req.params.id]
      })).rows[0];

      const plans = (await query({
        sql: "SELECT * FROM trading_plans WHERE session_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      })).rows;

      res.json({ session, planCounts, plans });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/plan_sessions/:id/plans", async (req, res) => {
    try {
      const plans = (await query({
        sql: "SELECT * FROM trading_plans WHERE session_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      })).rows;
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/plan_sessions/:id/review", async (req, res) => {
    try {
      const { review_notes, lessons_learned } = req.body;
      const now = new Date().toISOString();
      await query({
        sql: "UPDATE plan_sessions SET review_completed = 1, review_notes = ?, lessons_learned = ?, updated_at = ? WHERE id = ?",
        args: [review_notes || '', lessons_learned || '', now, req.params.id]
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backtest_sessions/:id/stats", async (req, res) => {
    try {
      const session = (await query({ sql: "SELECT * FROM backtest_sessions WHERE id = ?", args: [req.params.id] })).rows[0];
      if (!session) return res.status(404).json({ error: "Session not found" });

      const overview = (await query({
        sql: `SELECT COUNT(*) as total,
          SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'Loss' THEN 1 ELSE 0 END) as losses,
          ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as win_rate,
          ROUND(SUM(pnl), 2) as total_pnl,
          ROUND(AVG(pnl), 2) as avg_pnl,
          MAX(pnl) as best_trade,
          MIN(pnl) as worst_trade,
          ROUND(AVG(rr_ratio), 2) as avg_rr
        FROM backtest_journey WHERE session_id = ?`,
        args: [req.params.id]
      })).rows[0];

      const bySymbol = (await query({
        sql: "SELECT symbol, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / COUNT(*), 1) as wr FROM backtest_journey WHERE session_id = ? GROUP BY symbol ORDER BY cnt DESC",
        args: [req.params.id]
      })).rows;

      const byDirection = (await query({
        sql: "SELECT direction, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / COUNT(*), 1) as wr FROM backtest_journey WHERE session_id = ? GROUP BY direction",
        args: [req.params.id]
      })).rows;

      const byRegime = (await query({
        sql: "SELECT market_condition, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM backtest_journey WHERE session_id = ? GROUP BY market_condition ORDER BY cnt DESC",
        args: [req.params.id]
      })).rows;

      const recent = (await query({
        sql: "SELECT * FROM backtest_journey WHERE session_id = ? ORDER BY date DESC, id DESC LIMIT 10",
        args: [req.params.id]
      })).rows;

      res.json({ session, overview, bySymbol, byDirection, byRegime, recent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backtest_sessions/:id/entries", async (req, res) => {
    try {
      const entries = (await query({
        sql: "SELECT * FROM backtest_journey WHERE session_id = ? ORDER BY date DESC, id DESC",
        args: [req.params.id]
      })).rows;
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backtest_sessions/:id/dashboard", async (req, res) => {
    try {
      const session = (await query({ sql: "SELECT * FROM backtest_sessions WHERE id = ?", args: [req.params.id] })).rows[0];
      if (!session) return res.status(404).json({ error: "Session not found" });

      const entries = (await query({
        sql: "SELECT * FROM backtest_journey WHERE session_id = ? ORDER BY date ASC, id ASC",
        args: [req.params.id]
      })).rows;

      const total = entries.length;
      const wins = entries.filter(e => e.result === 'Win').length;
      const losses = entries.filter(e => e.result === 'Loss').length;
      const winRate = total > 0 ? (wins / total * 100).toFixed(1) : 0;
      const totalPnl = entries.reduce((s, e) => s + (e.pnl || 0), 0);
      const avgPnl = total > 0 ? totalPnl / total : 0;
      const bestTrade = total > 0 ? Math.max(...entries.map(e => e.pnl || 0)) : 0;
      const worstTrade = total > 0 ? Math.min(...entries.map(e => e.pnl || 0)) : 0;
      const avgRR = total > 0 ? entries.reduce((s, e) => s + (e.rr_ratio || 0), 0) / total : 0;
      const avgHoldTime = total > 0 ? entries.reduce((s, e) => s + (e.hold_time_minutes || 0), 0) / total : 0;

      const grossProfit = entries.filter(e => e.pnl > 0).reduce((s, e) => s + e.pnl, 0);
      const grossLoss = Math.abs(entries.filter(e => e.pnl < 0).reduce((s, e) => s + e.pnl, 0));
      const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';
      const avgWin = wins > 0 ? grossProfit / wins : 0;
      const avgLoss = losses > 0 ? grossLoss / losses : 0;
      const payoffRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '0.00';
      const expectancy = total > 0 ? ((winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss)).toFixed(2) : 0;

      let maxDD = 0, peak = 0, runningPnl = 0;
      const equityCurve = entries.map(e => {
        runningPnl += (e.pnl || 0);
        if (runningPnl > peak) peak = runningPnl;
        const dd = peak - runningPnl;
        if (dd > maxDD) maxDD = dd;
        return { date: e.date, pnl: e.pnl, cumulative: runningPnl, drawdown: dd };
      });

      let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
      entries.forEach(e => {
        if (e.result === 'Win') { curWin++; curLoss = 0; if (curWin > maxWinStreak) maxWinStreak = curWin; }
        else if (e.result === 'Loss') { curLoss++; curWin = 0; if (curLoss > maxLossStreak) maxLossStreak = curLoss; }
      });

      const bySymbol = (await query({
        sql: "SELECT symbol, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? GROUP BY symbol ORDER BY pnl DESC",
        args: [req.params.id]
      })).rows;

      const byDirection = (await query({
        sql: "SELECT direction, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? GROUP BY direction",
        args: [req.params.id]
      })).rows;

      const bySetup = (await query({
        sql: "SELECT setup_name, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? AND setup_name != '' GROUP BY setup_name ORDER BY pnl DESC",
        args: [req.params.id]
      })).rows;

      const byRegime = (await query({
        sql: "SELECT market_condition, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? GROUP BY market_condition",
        args: [req.params.id]
      })).rows;

      const byTimeframe = (await query({
        sql: "SELECT timeframe, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? AND timeframe != '' GROUP BY timeframe ORDER BY cnt DESC",
        args: [req.params.id]
      })).rows;

      const bySession = (await query({
        sql: "SELECT session, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl, ROUND(100.0 * SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as wr FROM backtest_journey WHERE session_id = ? AND session != '' GROUP BY session ORDER BY cnt DESC",
        args: [req.params.id]
      })).rows;

      const baseDate = new Date(0);
      const byDayOfWeekRaw = (await query({
        sql: "SELECT date, COUNT(*) as cnt, ROUND(SUM(pnl), 2) as pnl FROM backtest_journey WHERE session_id = ? GROUP BY date ORDER BY date",
        args: [req.params.id]
      })).rows;

      const dowMap = {};
      byDayOfWeekRaw.forEach(r => {
        const dow = new Date(r.date + 'T00:00:00').getDay().toString();
        if (!dowMap[dow]) dowMap[dow] = { dow, cnt: 0, pnl: 0 };
        dowMap[dow].cnt += r.cnt;
        dowMap[dow].pnl += r.pnl;
      });
      const byDayOfWeek = Object.values(dowMap).sort((a, b) => a.dow - b.dow);

      const dailyPnl = byDayOfWeekRaw;
      const recent = (await query({
        sql: "SELECT * FROM backtest_journey WHERE session_id = ? ORDER BY date DESC, id DESC LIMIT 15",
        args: [req.params.id]
      })).rows;

      res.json({
        session, overview: { total, wins, losses, win_rate: parseFloat(winRate), total_pnl: parseFloat(totalPnl.toFixed(2)), avg_pnl: parseFloat(avgPnl.toFixed(2)), best_trade: bestTrade, worst_trade: worstTrade, avg_rr: parseFloat(avgRR.toFixed(2)), avg_hold_time: parseFloat(avgHoldTime.toFixed(0)), profit_factor: parseFloat(profitFactor), payoff_ratio: parseFloat(payoffRatio), expectancy: parseFloat(expectancy), max_win_streak: maxWinStreak, max_loss_streak: maxLossStreak, max_drawdown: parseFloat(maxDD.toFixed(2)) },
        equity_curve: equityCurve,
        bySymbol, byDirection, bySetup, byRegime, byTimeframe, bySession, byDayOfWeek, dailyPnl, recent
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backtest_sessions/:sessionId/test_runs", async (req, res) => {
    try {
      const runs = (await query({
        sql: "SELECT * FROM backtest_test_runs WHERE session_id = ? ORDER BY created_at DESC",
        args: [req.params.sessionId]
      })).rows;
      res.json(runs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backtest_sessions/:sessionId/test_runs", async (req, res) => {
    try {
      const r = req.body;
      const id = r.id || `run_${Date.now()}`;
      const now = new Date().toISOString();
      await query({
        sql: `INSERT INTO backtest_test_runs (id, session_id, name, description, setup_name, start_date, end_date, total_candles, completed_candles, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, req.params.sessionId, r.name || 'Test Run', r.description || '', r.setup_name || '', r.start_date || '', r.end_date || '', r.total_candles || 0, r.completed_candles || 0, r.status || 'in_progress', now, now]
      });
      res.json({ id, session_id: req.params.sessionId, ...r, created_at: now, updated_at: now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/backtest_test_runs/:id", async (req, res) => {
    try {
      const r = req.body;
      const now = new Date().toISOString();
      await query({
        sql: "UPDATE backtest_test_runs SET name=?, description=?, setup_name=?, start_date=?, end_date=?, total_candles=?, completed_candles=?, status=?, updated_at=? WHERE id=?",
        args: [r.name, r.description || '', r.setup_name || '', r.start_date || '', r.end_date || '', r.total_candles ?? 0, r.completed_candles ?? 0, r.status || 'in_progress', now, req.params.id]
      });
      res.json({ id: req.params.id, ...r, updated_at: now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/backtest_test_runs/:id", async (req, res) => {
    try {
      await query({ sql: "DELETE FROM backtest_test_runs WHERE id = ?", args: [req.params.id] });
      await query({ sql: "DELETE FROM backtest_journey WHERE test_run_id = ?", args: [req.params.id] });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backtest_sessions/:sessionId/import-csv", async (req, res) => {
    try {
      const { csv, plan_id, test_run_id, setup_name } = req.body;
      if (!csv || typeof csv !== 'string') return res.status(400).json({ error: "CSV data is required" });

      const lines = csv.trim().split('\n').map(l => l.split(',').map(c => c.trim()));
      if (lines.length < 2) return res.status(400).json({ error: "CSV must have header + at least 1 data row" });

      const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
      const colMap = {};
      headers.forEach((h, i) => {
        if (h.includes('date') || h.includes('time')) colMap.date = i;
        else if (h.includes('symbol') || h.includes('pair') || h.includes('instrument')) colMap.symbol = i;
        else if (h.includes('direction') || h.includes('type') || h.includes('side') || h.includes('action')) colMap.direction = i;
        else if (h.includes('entry') && h.includes('price')) colMap.entry = i;
        else if (h.includes('exit') && h.includes('price')) colMap.exit = i;
        else if (h.includes('sl') || h.includes('stop')) colMap.sl = i;
        else if (h.includes('tp') || h.includes('take')) colMap.tp = i;
        else if (h.includes('lot') || h.includes('volume') || h.includes('size')) colMap.lot = i;
        else if (h.includes('pnl') || h.includes('profit') || h.includes('gain')) colMap.pnl = i;
        else if (h.includes('rr') || h.includes('risk')) colMap.rr = i;
        else if (h.includes('result') || h.includes('outcome') || h.includes('status')) colMap.result = i;
        else if (h.includes('setup') || h.includes('strategy')) colMap.setup = i;
        else if (h.includes('note') || h.includes('comment') || h.includes('reason')) colMap.notes = i;
        else if (h.includes('commission') || h.includes('comm')) colMap.commission = i;
        else if (h.includes('swap') || h.includes('swap')) colMap.swap = i;
        else if (h.includes('slippage') || h.includes('slip')) colMap.slippage = i;
      });

      const now = new Date().toISOString();
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 2) continue;
        const getId = () => `bt_csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
        const date = colMap.date !== undefined ? line[colMap.date] || now : now;
        const symbol = colMap.symbol !== undefined ? line[colMap.symbol] || 'XAUUSD' : 'XAUUSD';
        const rawDir = colMap.direction !== undefined ? (line[colMap.direction] || '').toLowerCase() : '';
        const direction = rawDir.includes('buy') || rawDir.includes('long') ? 'Long' : rawDir.includes('sell') || rawDir.includes('short') ? 'Short' : '';
        const entry = colMap.entry !== undefined ? parseFloat(line[colMap.entry]) || 0 : 0;
        const exit = colMap.exit !== undefined ? parseFloat(line[colMap.exit]) || 0 : 0;
        const sl = colMap.sl !== undefined ? parseFloat(line[colMap.sl]) || 0 : 0;
        const tp = colMap.tp !== undefined ? parseFloat(line[colMap.tp]) || 0 : 0;
        const lot = colMap.lot !== undefined ? parseFloat(line[colMap.lot]) || 0 : 0;
        const pnl = colMap.pnl !== undefined ? parseFloat(line[colMap.pnl]) || 0 : 0;
        const rr = colMap.rr !== undefined ? parseFloat(line[colMap.rr]) || 0 : 0;
        const rawResult = colMap.result !== undefined ? (line[colMap.result] || '').toLowerCase() : '';
        const result = rawResult.includes('win') || pnl > 0 ? 'Win' : rawResult.includes('loss') || rawResult.includes('lose') || pnl < 0 ? 'Loss' : pnl === 0 ? 'BE' : '';
        const setup = colMap.setup !== undefined ? line[colMap.setup] || (setup_name || '') : (setup_name || '');
        const notes = colMap.notes !== undefined ? line[colMap.notes] || '' : '';
        const commission = colMap.commission !== undefined ? parseFloat(line[colMap.commission]) || 0 : 0;
        const swap = colMap.swap !== undefined ? parseFloat(line[colMap.swap]) || 0 : 0;
        const slippage = colMap.slippage !== undefined ? parseFloat(line[colMap.slippage]) || 0 : 0;

        rows.push([
          getId(), req.params.sessionId, date, symbol, direction, entry, exit, sl, tp, lot,
          pnl, rr, result, 'closed', setup, notes, plan_id || '', test_run_id || '',
          commission, swap, slippage, now, now
        ]);
      }

      if (rows.length > 0) {
        await query({ sql: "BEGIN" });
        try {
          for (const row of rows) {
            await query({
              sql: `INSERT INTO backtest_journey (id, session_id, date, symbol, direction, entry_price, exit_price, sl_price, tp_price, lot_size, pnl, rr_ratio, result, status, setup_name, notes, plan_id, test_run_id, commission, swap, slippage, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: row
            });
          }
          await query({ sql: "COMMIT" });
        } catch (e) {
          await query({ sql: "ROLLBACK" });
          throw e;
        }
      }

      res.json({ ok: true, imported: rows.length, session_id: req.params.sessionId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
