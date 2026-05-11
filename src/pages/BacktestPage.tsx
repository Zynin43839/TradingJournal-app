import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { get, post, del, BacktestSession, BacktestDashboard, BacktestEntry } from "../api";

export default function BacktestPage() {
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BacktestDashboard | null>(null);
  const [entries, setEntries] = useState<BacktestEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => { get<BacktestSession[]>("/backtest_sessions").then(setSessions).catch(() => {}); }, []);

  useEffect(() => {
    if (!selected) { setDashboard(null); setEntries([]); return; }
    Promise.all([
      get<BacktestDashboard>(`/backtest_sessions/${selected}/dashboard`).then(setDashboard),
      get<BacktestEntry[]>(`/backtest_sessions/${selected}/entries`).then(setEntries),
    ]).catch(() => {});
  }, [selected]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    const s = await post<BacktestSession>("/backtest_sessions", form);
    setSessions(prev => [s, ...prev]);
    setShowForm(false);
    setForm({ name: "", description: "" });
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    await post(`/backtest_sessions/${selected}/import-csv`, { csv });
    setShowImport(false);
    setCsv("");
    if (selected) {
      const [d, ent] = await Promise.all([
        get<BacktestDashboard>(`/backtest_sessions/${selected}/dashboard`),
        get<BacktestEntry[]>(`/backtest_sessions/${selected}/entries`),
      ]);
      setDashboard(d);
      setEntries(ent);
    }
  }

  const ov = dashboard?.overview;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Backtest Journey</h1>
        <div className="flex gap-3">
          {selected && <button className="btn btn-ghost" onClick={() => setShowImport(true)}>Import CSV</button>}
          <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        <div className="glass rounded-xl p-3">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`p-3 rounded-lg cursor-pointer text-sm transition-colors ${
                selected === s.id ? "bg-teal-500/10 text-teal-400" : "hover:bg-white/5"
              }`}
              onClick={() => setSelected(s.id)}
            >
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-zinc-500">{s.start_date?.slice(0, 10) || "-"} → {s.end_date?.slice(0, 10) || "-"}</div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No sessions</p>}
        </div>

        <div>
          {!selected && <p className="text-zinc-500 text-center py-12">Select a session to view backtest data</p>}

          {selected && ov && (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Total", value: ov.total },
                  { label: "Win Rate", value: `${ov.win_rate}%` },
                  { label: "Total PnL", value: `$${ov.total_pnl}`, className: ov.total_pnl >= 0 ? "text-green-400" : "text-red-400" },
                  { label: "Profit Factor", value: ov.profit_factor },
                  { label: "Max DD", value: `$${ov.max_drawdown}`, className: "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3">
                    <div className="text-xs text-zinc-500 uppercase">{s.label}</div>
                    <div className={`text-xl font-bold mt-1 ${s.className || ""}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {dashboard.equity_curve.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Equity Curve</h3>
                  <div className="flex items-end gap-0.5 h-32">
                    {dashboard.equity_curve.map((pt, i) => {
                      const allPnl = dashboard!.equity_curve.map(p => p.cumulative);
                      const min = Math.min(...allPnl);
                      const max = Math.max(...allPnl);
                      const range = max - min || 1;
                      const h = ((pt.cumulative - min) / range) * 100;
                      return <div key={i} className="flex-1 bg-teal-500/30 rounded-t relative" style={{ height: `${Math.max(h, 2)}%` }} title={`${pt.date}: $${pt.cumulative}`} />;
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {dashboard.bySymbol.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Symbol</h3>
                    {dashboard.bySymbol.slice(0, 5).map(s => (
                      <div key={s.symbol} className="flex justify-between text-sm py-1">
                        <span>{s.symbol}</span>
                        <span className={s.pnl >= 0 ? "text-green-400" : "text-red-400"}>${s.pnl} ({s.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {dashboard.byDirection.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Direction</h3>
                    {dashboard.byDirection.map(d => (
                      <div key={d.direction} className="flex justify-between text-sm py-1">
                        <span>{d.direction}</span>
                        <span className={d.pnl >= 0 ? "text-green-400" : "text-red-400"}>${d.pnl} ({d.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {dashboard.bySetup.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Setup</h3>
                    {dashboard.bySetup.slice(0, 5).map(s => (
                      <div key={s.setup_name} className="flex justify-between text-sm py-1">
                        <span className="truncate">{s.setup_name}</span>
                        <span className={s.pnl >= 0 ? "text-green-400" : "text-red-400"}>${s.pnl} ({s.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Direction</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>PnL</th>
                      <th>R:R</th>
                      <th>Result</th>
                      <th>Setup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id}>
                        <td>{e.date?.slice(0, 10)}</td>
                        <td><span className="font-medium">{e.symbol}</span></td>
                        <td><span className={`badge ${e.direction === "Long" ? "badge-green" : "badge-red"}`}>{e.direction}</span></td>
                        <td>{e.entry_price}</td>
                        <td>{e.exit_price}</td>
                        <td className={e.pnl >= 0 ? "text-green-400" : "text-red-400"}>{e.pnl}</td>
                        <td>{e.rr_ratio || "-"}</td>
                        <td><span className={`badge ${e.result === "Win" ? "badge-green" : e.result === "Loss" ? "badge-red" : "badge-yellow"}`}>{e.result}</span></td>
                        <td>{e.setup_name || "-"}</td>
                      </tr>
                    ))}
                    {entries.length === 0 && <tr><td colSpan={9} className="text-center text-zinc-500 py-8">No entries</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Backtest Session</h2>
            <form onSubmit={createSession} className="flex flex-col gap-3">
              <div><label>Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label>Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Import CSV</h2>
            <form onSubmit={importCsv} className="flex flex-col gap-3">
              <div><label>CSV Data</label><textarea className="input font-mono text-xs" rows={8} value={csv} onChange={e => setCsv(e.target.value)} placeholder="date,symbol,direction,entry,exit,pnl&#10;2025-01-01,XAUUSD,Long,2000,2010,50" required /></div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
