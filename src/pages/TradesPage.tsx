import { useState, useEffect, useMemo } from "react";
import { Plus, Search, X, TrendingUp, TrendingDown, Edit3, Trash2, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { get, post, put as apiPut, del, Trade, TradeStats } from "../api";

const SYMBOLS = ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "ETHUSD", "NAS100", "US30", "SP500"];
const SIDES = ["Buy", "Sell"];
const EMOTIONS = ["", "Calm", "Confident", "Anxious", "Excited", "Tired", "Frustrated", "Neutral", "Revenge", "FOMO", "Greed", "Fear"];
const RESULTS = ["", "Win", "Loss", "BE"];

const emptyForm = { date: new Date().toISOString().split("T")[0], symbol: "XAUUSD", side: "Buy", entry_price: 0, exit_price: 0, pnl: 0, lot_size: 0.01, result: "", emotion_before: "", setup_name: "", pre_trade_notes: "", post_trade_notes: "", lessons_learned: "" };

function StatsCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-1 ${className || ""}`}>{value}</div>
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterSide, setFilterSide] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [tradeData, statsData] = await Promise.all([
        get<Trade[]>("/trading_logs"),
        get<TradeStats>("/trading_logs/stats"),
      ]);
      setTrades(tradeData);
      setStats(statsData);
    } catch { /* ignore */ }
  }

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (search && !t.setup_name?.toLowerCase().includes(search.toLowerCase()) && !t.pre_trade_notes?.toLowerCase().includes(search.toLowerCase()) && !t.symbol?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSymbol && t.symbol !== filterSymbol) return false;
      if (filterSide && t.side !== filterSide) return false;
      if (filterResult && t.result !== filterResult) return false;
      return true;
    });
  }, [trades, search, filterSymbol, filterSide, filterResult]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = form.pnl > 0 ? "Win" : form.pnl < 0 ? "Loss" : "BE";
    const payload = { ...form, result };

    if (editingTrade) {
      await apiPut(`/trading_logs/${editingTrade.id}`, payload);
    } else {
      await post("/trading_logs", payload);
    }

    setShowForm(false);
    setEditingTrade(null);
    setForm(emptyForm);
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this trade?")) return;
    await del(`/trading_logs/${id}`);
    load();
  }

  function openEdit(t: Trade) {
    setForm({
      date: t.date?.slice(0, 10) || "",
      symbol: t.symbol,
      side: t.side,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      pnl: t.pnl,
      lot_size: t.lot_size,
      result: t.result,
      emotion_before: t.emotion_before || "",
      setup_name: t.setup_name || "",
      pre_trade_notes: t.pre_trade_notes || "",
      post_trade_notes: t.post_trade_notes || "",
      lessons_learned: t.lessons_learned || "",
    });
    setEditingTrade(t);
    setShowForm(true);
  }

  function openNew() {
    setForm(emptyForm);
    setEditingTrade(null);
    setShowForm(true);
  }

  const ov = stats?.overview;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Trading Log</h1>
          <p className="text-zinc-500 text-sm">{filtered.length} of {trades.length} trades</p>
        </div>
        <button className="btn btn-teal flex items-center gap-2" onClick={openNew}>
          <Plus size={16} /> Add Trade
        </button>
      </div>

      {ov && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatsCard label="Total Trades" value={ov.total} />
          <StatsCard label="Win Rate" value={`${ov.win_rate}%`} />
          <StatsCard label="Total PnL" value={`$${ov.total_pnl}`} className={ov.total_pnl >= 0 ? "text-green-400" : "text-red-400"} />
          <StatsCard label="Avg PnL" value={`$${ov.avg_pnl}`} className={ov.avg_pnl >= 0 ? "text-green-400" : "text-red-400"} />
          <StatsCard label="Best" value={`$${ov.best_trade}`} className="text-green-400" />
          <StatsCard label="Worst" value={`$${ov.worst_trade}`} className="text-red-400" />
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by symbol, setup, notes..."
            className="input pl-9"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-ghost text-sm flex items-center gap-1.5 ${showFilters ? "border-purple-500/30 text-purple-400" : ""}`}>
          <SlidersHorizontal size={14} /> Filters
          {(filterSymbol || filterSide || filterResult) && <span className="w-2 h-2 rounded-full bg-purple-400" />}
        </button>
      </div>

      {showFilters && (
        <div className="glass rounded-xl p-3 mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0">Symbol</label>
            <select className="input w-28 text-xs" value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}>
              <option value="">All</option>
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0">Side</label>
            <select className="input w-20 text-xs" value={filterSide} onChange={e => setFilterSide(e.target.value)}>
              <option value="">All</option>
              {SIDES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0">Result</label>
            <select className="input w-20 text-xs" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
              <option value="">All</option>
              {RESULTS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {(filterSymbol || filterSide || filterResult) && (
            <button onClick={() => { setFilterSymbol(""); setFilterSide(""); setFilterResult(""); }} className="btn btn-ghost text-xs py-1 px-2">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Trades table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Exit</th>
                <th className="text-right">PnL</th>
                <th className="text-center">Result</th>
                <th className="text-left">Setup</th>
                <th className="text-left">Emotion</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="group">
                  <td className="text-zinc-400 text-xs">{t.date?.slice(0, 10)}</td>
                  <td><span className="font-medium text-sm">{t.symbol}</span></td>
                  <td>
                    <span className={`badge ${t.side === "Buy" ? "badge-green" : "badge-red"} flex items-center gap-1`}>
                      {t.side === "Buy" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {t.side}
                    </span>
                  </td>
                  <td className="text-right font-mono text-sm">{t.entry_price}</td>
                  <td className="text-right font-mono text-sm">{t.exit_price}</td>
                  <td className={`text-right font-mono text-sm font-medium ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{t.pnl > 0 ? "+" : ""}{t.pnl}</td>
                  <td className="text-center"><span className={`badge ${t.result === "Win" ? "badge-green" : t.result === "Loss" ? "badge-red" : "badge-yellow"}`}>{t.result || "BE"}</span></td>
                  <td className="text-sm text-zinc-300 max-w-24 truncate">{t.setup_name || "-"}</td>
                  <td className="text-sm text-zinc-500">{t.emotion_before || "-"}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center text-zinc-500 py-8">No trades found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Trade Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingTrade ? "Edit Trade" : "New Trade"}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {editingTrade && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 text-xs text-blue-400 flex items-center gap-2">
                <Edit3 size={14} /> Editing trade from {editingTrade.date?.slice(0, 10)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label>Symbol</label>
                  <select className="input" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
                    {SYMBOLS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Side</label>
                  <div className="flex gap-2">
                    {SIDES.map(s => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, side: s })} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.side === s ? (s === "Buy" ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-red-500/20 text-red-400 border border-red-500/40") : "bg-zinc-800/60 text-zinc-500 border border-white/[0.06]"}`}>
                        {s === "Buy" ? <TrendingUp size={14} className="inline" /> : <TrendingDown size={14} className="inline" />} {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label>Lot Size</label>
                  <input className="input" type="number" step="0.01" value={form.lot_size} onChange={e => setForm({ ...form, lot_size: +e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label>Entry Price</label>
                  <input className="input" type="number" step="0.001" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: +e.target.value })} />
                </div>
                <div>
                  <label>Exit Price</label>
                  <input className="input" type="number" step="0.001" value={form.exit_price} onChange={e => setForm({ ...form, exit_price: +e.target.value })} />
                </div>
                <div>
                  <label className="text-amber-400">P&L ($)</label>
                  <input className="input border-amber-500/15" type="number" step="0.01" value={form.pnl} onChange={e => setForm({ ...form, pnl: +e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Setup Name</label>
                  <input className="input" value={form.setup_name} onChange={e => setForm({ ...form, setup_name: e.target.value })} placeholder="e.g., OB Retest" />
                </div>
                <div>
                  <label>Emotion Before Entry</label>
                  <select className="input" value={form.emotion_before} onChange={e => setForm({ ...form, emotion_before: e.target.value })}>
                    {EMOTIONS.map(e => <option key={e || "none"} value={e}>{e || "Select..."}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label>Pre-Trade Notes</label>
                <textarea className="input" rows={2} value={form.pre_trade_notes} onChange={e => setForm({ ...form, pre_trade_notes: e.target.value })} placeholder="Why did I take this trade?" />
              </div>
              <div>
                <label>Post-Trade Notes</label>
                <textarea className="input" rows={2} value={form.post_trade_notes} onChange={e => setForm({ ...form, post_trade_notes: e.target.value })} placeholder="How did it go?" />
              </div>
              <div>
                <label className="text-amber-400">Lesson Learned</label>
                <textarea className="input border-amber-500/15" rows={2} value={form.lessons_learned} onChange={e => setForm({ ...form, lessons_learned: e.target.value })} placeholder="What will I do differently?" />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">{editingTrade ? "Update Trade" : "Save Trade"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
