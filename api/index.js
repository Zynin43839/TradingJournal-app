const express = require("express");
const cors = require("cors");
const path = require("path");

const { migrate } = require("./migrate");
const { createCrudRoutes } = require("./routes/crud");
const registerFocusRoutes = require("./routes/focus");
const registerTradingRoutes = require("./routes/trading");
const registerSessionRoutes = require("./routes/sessions");
const registerPlanRoutes = require("./routes/plans");
const registerSignalRoutes = require("./routes/signals");
const registerDailyPlanRoutes = require("./routes/daily-plans");
const registerSettingsRoutes = require("./routes/settings");
const registerHealthRoutes = require("./routes/health");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Auto CRUD for tables ──
const crudTables = [
  "trading_logs", "trades", "tasks", "learning_log",
  "rag_diary", "studio_notes", "notebooklm_notes", "vault_files",
  "backtest_journey", "backtest_sessions", "plan_sessions",
  "plan_templates", "plan_versions", "backtest_test_runs",
  "signal_logs", "trade_executions", "news_logs",
  "system_logs", "strategy_tuner_log"
];

for (const table of crudTables) {
  createCrudRoutes(app, table);
}

// ── Custom routes ──
registerFocusRoutes(app);
registerTradingRoutes(app);
registerSessionRoutes(app);
registerPlanRoutes(app);
registerSignalRoutes(app);
registerDailyPlanRoutes(app);
registerSettingsRoutes(app);
registerHealthRoutes(app);

// ── Serve frontend ──
const frontendPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ── Run migrations on startup ──
migrate().catch(console.error);

// Only listen when running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
