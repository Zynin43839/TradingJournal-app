import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Link2, FileDown, Trash2, X, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { get, post, put as apiPut, del, BacktestSession, BacktestDashboard, BacktestEntry, TradingPlan } from "../api";

const DIRECTIONS = ["Long", "Short"];
const RESULTS = ["Win", "Loss", "Breakeven", "Pending"];

function StatsCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold mt-1 ${className || ""}`}>{value}</div>
    </div>
  );
}

function EquityCurve({ points }: { points: { date: string; pnl: number; cumulative: number }[] }) {
  if (points.length === 0) return null;
  const vals = points.map(p => p.cumulative);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
        <TrendingUp size={14} className="text-teal-400" /> Equity Curve
      </h3>
      <div className="flex items-end gap-0.5 h-32">
        {points.map((pt, i) => {
          const h = ((pt.cumulative - min) / range) * 100;
          const isPositive = pt.pnl >= 0;
          return (
            <div
              key={i}
              className="flex-1 rounded-t relative group cursor-pointer"
              style={{ height: `${Math.max(h, 2)}%`, background: isPositive ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)" }}
              title={`${pt.date}: $${pt.cumulative}`}
            >
              <div className="absolute inset-x-0 bottom-full mb-1 hidden group-hover:block z-10">
                <div className="bg-zinc-800 text-xs text-white px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {pt.date}: ${pt.cumulative} ({pt.pnl > 0 ? "+" : ""}{pt.pnl})
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>${min}</span>
        <span>${max}</span>
      </div>
    </div>
  );
}

export default function BacktestPage() {
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BacktestDashboard | null>(null);
  const [entries, setEntries] = useState<BacktestEntry[]>([]);
  const [plans, setPlans] = useState<TradingPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLink, setShowLink] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [filterResult, setFilterResult] = useState("");

  useEffect(() => { get<BacktestSession[]>("/backtest_sessions").then(setSessions).catch(() => {}); }, []);

  useEffect(() => {
    if (!selected) { setDashboard(null); setEntries([]); setPlans([]); return; }
    Promise.all([
      get<BacktestDashboard>(`/backtest_sessions/${selected}/dashboard`).then(setDashboard),
      get<BacktestEntry[]>(`/backtest_sessions/${selected}/entries`).then(setEntries),
      get<TradingPlan[]>("/trading_plans").then(setPlans).catch(() => setPlans([])),
    ]).catch(() => {});
  }, [selected]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (search && !e.symbol?.toLowerCase().includes(search.toLowerCase()) && !e.setup_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSymbol && e.symbol !== filterSymbol) return false;
      if (filterDirection && e.direction !== filterDirection) return false;
      if (filterResult && e.result !== filterResult) return false;
      return true;
    });
  }, [entries, search, filterSymbol, filterDirection, filterResult]);

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
    reloadEntries();
  }

  async function reloadEntries() {
    if (!selected) return;
    const [d, ent] = await Promise.all([
      get<BacktestDashboard>(`/backtest_sessions/${selected}/dashboard`),
      get<BacktestEntry[]>(`/backtest_sessions/${selected}/entries`),
    ]);
    setDashboard(d);
    setEntries(ent);
  }

  async function linkPlan(entryId: string, planId: string) {
    await apiPut(`/backtest_entries/${entryId}/link-plan`, { plan_id: planId });
    setShowLink(null);
    reloadEntries();
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    await del(`/backtest_journey/${id}`);
    reloadEntries();
  }

  const symbols = useMemo(() => [...new Set(entries.map(e => e.symbol).filter(Boolean))], [entries]);
  const ov = dashboard?.overview;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Backtest Lab</h1>
          <p className="text-zinc-500 text-sm">Analyze backtest performance with stats and filters</p>
        </div>
        <div className="flex gap-3">
          {selected && <button className="btn btn-ghost flex items-center gap-1.5" onClick={() => setShowImport(true)}><FileDown size={14} /> Import CSV</button>}
          <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Sessions sidebar */}
        <div className="glass rounded-xl p-3 space-y-1">
          <div className="text-xs text-zinc-600 uppercase tracking-wider font-semibold px-3 py-2">Sessions</div>
          {sessions.map(s => (
            <div
              key={s.id}
              className={`p-3 rounded-lg cursor-pointer text-sm transition-colors ${selected === s.id ? "bg-teal-500/10 text-teal-400" : "hover:bg-white/5"}`}
              onClick={() => setSelected(s.id)}
            >
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.start_date?.slice(0, 10) || "-"} → {s.end_date?.slice(0, 10) || "-"}</div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No sessions</p>}
        </div>

        {/* Dashboard */}
        <div>
          {!selected && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <BarChart3 size={40} className="text-zinc-700 mb-3" />
              <p className="text-sm">Select a session to view backtest data</p>
            </div>
          )}

          {selected && ov && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatsCard label="Total Trades" value={ov.total} />
                <StatsCard label="Win Rate" value={`${ov.win_rate}%`} />
                <StatsCard label="Total PnL" value={`$${ov.total_pnl}`} className={ov.total_pnl >= 0 ? "text-green-400" : "text-red-400"} />
                <StatsCard label="Profit Factor" value={ov.profit_factor} />
                <StatsCard label="Max DD" value={`$${ov.max_drawdown}`} className="text-red-400" />
              </div>

              {/* Equity Curve */}
              <EquityCurve points={dashboard!.equity_curve} />

              {/* By Symbol / Direction / Setup */}
              <div className="grid grid-cols-3 gap-4">
                {dashboard!.bySymbol.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Symbol</h3>
                    {dashboard!.bySymbol.slice(0, 8).map(s => (
                      <div key={s.symbol} className="flex justify-between text-xs py-1">
                        <span>{s.symbol}</span>
                        <span className={s.pnl >= 0 ? "text-green-400" : "text-red-400"}>${s.pnl} ({s.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {dashboard!.byDirection.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Direction</h3>
                    {dashboard!.byDirection.map(d => (
                      <div key={d.direction} className="flex justify-between text-xs py-1">
                        <span className="flex items-center gap-1">{d.direction === "Long" ? <TrendingUp size={12} className="text-green-400" /> : <TrendingDown size={12} className="text-red-400" />}{d.direction}</span>
                        <span className={d.pnl >= 0 ? "text-green-400" : "text-red-400"}>${d.pnl} ({d.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {dashboard!.bySetup.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-2">By Setup</h3>
                    {dashboard!.bySetup.slice(0, 8).map(s => (
                      <div key={s.setup_name} className="flex justify-between text-xs py-1">
                        <span className="truncate max-w-24">{s.setup_name || "N/A"}</span>
                        <span className={s.pnl >= 0 ? "text-green-400" : "text-red-400"}>${s.pnl} ({s.wr}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by symbol or setup..." className="input pl-9" />
                </div>
                <select className="input w-28 text-xs" value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}>
                  <option value="">All Symbols</option>
                  {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="input w-24 text-xs" value={filterDirection} onChange={e => setFilterDirection(e.target.value)}>
                  <option value="">All Dir</option>
                  {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="input w-24 text-xs" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                  <option value="">All Results</option>
                  {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Entries table */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th className="text-left">Symbol</th>
                        <th className="text-left">Direction</th>
                        <th className="text-right">Entry</th>
                        <th className="text-right">Exit</th>
                        <th className="text-right">PnL</th>
                        <th className="text-right">R:R</th>
                        <th className="text-center">Result</th>
                        <th className="text-left">Setup</th>
                        <th className="text-center">Plan</th>
                        <th className="text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(e => (
                        <tr key={e.id} className="group">
                          <td className="text-zinc-400 text-xs">{e.date?.slice(0, 10)}</td>
                          <td><span className="font-medium text-sm">{e.symbol}</span></td>
                          <td><span className={`badge ${e.direction === "Long" ? "badge-green" : "badge-red"}`}>{e.direction}</span></td>
                          <td className="text-right font-mono text-sm">{e.entry_price}</td>
                          <td className="text-right font-mono text-sm">{e.exit_price}</td>
                          <td className={`text-right font-mono text-sm font-medium ${e.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{e.pnl > 0 ? "+" : ""}{e.pnl}</td>
                          <td className="text-right text-sm text-zinc-400">{e.rr_ratio || "-"}</td>
                          <td className="text-center"><span className={`badge ${e.result === "Win" ? "badge-green" : e.result === "Loss" ? "badge-red" : "badge-yellow"}`}>{e.result}</span></td>
                          <td className="text-sm text-zinc-300 max-w-20 truncate">{e.setup_name || "-"}</td>
                          <td className="text-center">
                            {e.plan_id ? (
                              <span className="badge badge-purple text-[10px]">Linked</span>
                            ) : (
                              <button onClick={() => setShowLink(e.id)} className="text-zinc-500 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all" title="Link to plan">
                                <Link2 size={13} />
                              </button>
                            )}
                          </td>
                          <td className="text-center">
                            <button onClick={() => deleteEntry(e.id)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={11} className="text-center text-zinc-500 py-8">No entries</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Backtest Session</h2>
            <form onSubmit={createSession} className="flex flex-col gap-3">
              <div><label>Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Feb 2025 Backtest" /></div>
              <div><label>Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Import CSV</h2>
            <p className="text-zinc-500 text-xs mb-3">Format: date,symbol,direction,entry,exit,pnl</p>
            <form onSubmit={importCsv} className="flex flex-col gap-3">
              <textarea className="input font-mono text-xs" rows={8} value={csv} onChange={e => setCsv(e.target.value)} placeholder="date,symbol,direction,entry,exit,pnl&#10;2025-01-01,XAUUSD,Long,2000,2010,50" required />
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Import</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link to Plan Modal */}
      {showLink && (
        <div className="modal-overlay" onClick={() => setShowLink(null)}>
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Link2 size={18} className="text-purple-400" /> Link to Trading Plan
            </h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {plans.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No plans available</p>}
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => linkPlan(showLink, p.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-zinc-500">{p.pairs} • {p.timeframe}</div>
                  </div>
                  <span className={`badge ${p.type === "long" ? "badge-green" : "badge-red"} shrink-0 ml-2`}>{p.type.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button className="btn btn-ghost" onClick={() => setShowLink(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
