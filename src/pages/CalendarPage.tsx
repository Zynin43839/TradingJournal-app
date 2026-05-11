import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, RefreshCw, Calendar as CalendarIcon, AlertTriangle, Info, ChevronDown, ChevronRight } from "lucide-react";
import { get, post, del, EconomicEvent } from "../api";

const IMPACTS = ["high", "medium", "low"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];

const impactColors: Record<string, { border: string; bg: string; dot: string; label: string }> = {
  high: { border: "border-red-500/30", bg: "bg-red-500/5", dot: "bg-red-500", label: "text-red-400" },
  medium: { border: "border-amber-500/30", bg: "bg-amber-500/5", dot: "bg-amber-500", label: "text-amber-400" },
  low: { border: "border-blue-500/30", bg: "bg-blue-500/5", dot: "bg-blue-500", label: "text-blue-400" },
};

function groupByDate(events: EconomicEvent[]): [string, EconomicEvent[]][] {
  const groups = new Map<string, EconomicEvent[]>();
  for (const e of events) {
    const key = e.date?.slice(0, 10) || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function isToday(dateStr: string) {
  const bkk = new Date(Date.now() + 7 * 3600_000);
  return dateStr === bkk.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState({ date: "", currency: "USD", event: "", impact: "medium" as EconomicEvent["impact"], forecast: "", previous: "", actual: "" });

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      const data = await get<EconomicEvent[]>("/economic_events");
      setEvents(data.filter(e => !filter || e.currency === filter));
    } catch { setEvents([]); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await post("/economic_events", {
      date: form.date || new Date().toISOString().split("T")[0],
      currency: form.currency,
      event: form.event,
      impact: form.impact,
      forecast: form.forecast,
      previous: form.previous,
      actual: form.actual,
    });
    setShowForm(false);
    setForm({ date: "", currency: "USD", event: "", impact: "medium", forecast: "", previous: "", actual: "" });
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this event?")) return;
    await del(`/economic_events/${id}`);
    load();
  }

  async function handleFetchCalendar() {
    setFetching(true);
    try {
      await post("/fetch-calendar", {});
      await load();
    } catch (err) {
      console.error("Fetch calendar failed:", err);
    } finally {
      setFetching(false);
    }
  }

  const grouped = useMemo(() => groupByDate(events), [events]);
  const toggleDate = (d: string) => {
    const n = new Set(collapsed);
    if (n.has(d)) n.delete(d); else n.add(d);
    setCollapsed(n);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <CalendarIcon size={24} className="text-teal-400" /> Economic Calendar
          </h1>
          <p className="text-zinc-500 text-sm">Track high-impact events that move the market</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-32" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Currencies</option>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-purple flex items-center gap-2" onClick={handleFetchCalendar} disabled={fetching}>
            <RefreshCw size={16} className={fetching ? "animate-spin" : ""} /> {fetching ? "Fetching..." : "Fetch Calendar"}
          </button>
          <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <CalendarIcon size={40} className="text-zinc-700 mb-3" />
          <p className="text-sm">No events yet. Add one to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(([date, dayEvents]) => {
          const today = isToday(date);
          const isCollapsed = collapsed.has(date);
          const maxImpact = Math.max(...dayEvents.map(e => IMPACTS.indexOf(e.impact)));
          const impactKey = IMPACTS[maxImpact];

          return (
            <div key={date} className={`glass rounded-xl overflow-hidden border ${today ? "border-teal-500/30" : impactColors[impactKey].border}`}>
              {/* Date header */}
              <button
                onClick={() => toggleDate(date)}
                className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${today ? "bg-teal-500/10" : impactColors[impactKey].bg}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${impactColors[impactKey].dot}`} />
                  <div className="text-left">
                    <span className={`font-semibold text-sm ${today ? "text-teal-400" : "text-white"}`}>
                      {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {today && <span className="ml-2 text-[10px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">TODAY</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}</span>
                  {isCollapsed ? <ChevronRight size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </div>
              </button>

              {/* Events */}
              {!isCollapsed && (
                <div className="divide-y divide-white/[0.04]">
                  {dayEvents.map(e => (
                    <div key={e.id} className="flex items-center px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex-1 grid grid-cols-[1fr_56px_80px_80px_80px_80px_80px_30px] gap-3 items-center text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-zinc-200 truncate">{e.event}</span>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {e.time_bkk || "-"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400">{e.currency}</span>
                        </div>
                        <div>
                          <span className={`badge ${e.impact === "high" ? "badge-red" : e.impact === "medium" ? "badge-yellow" : "badge-blue"} flex items-center gap-1`}>
                            {e.impact === "high" ? <AlertTriangle size={10} /> : <Info size={10} />}
                            {e.impact}
                          </span>
                        </div>
                        <div className="text-zinc-400 text-xs">{e.forecast || "-"}</div>
                        <div className="text-zinc-400 text-xs">{e.previous || "-"}</div>
                        <div className={`text-xs font-medium ${e.actual ? (Number(e.actual) > Number(e.forecast || 0) ? "text-green-400" : "text-red-400") : "text-zinc-600"}`}>
                          {e.actual || "-"}
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => remove(e.id)} className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Event Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Add Economic Event</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label>Date</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Currency</label>
                  <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label>Impact</label>
                  <div className="flex gap-2 mt-1">
                    {IMPACTS.map(i => (
                      <button key={i} type="button" onClick={() => setForm({ ...form, impact: i })} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.impact === i ? (i === "high" ? "bg-red-500/20 text-red-400 border border-red-500/40" : i === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-blue-500/20 text-blue-400 border border-blue-500/40") : "bg-zinc-800/60 text-zinc-500 border border-white/[0.06]"}`}>
                        {i === "high" ? <AlertTriangle size={10} className="inline" /> : <Info size={10} className="inline" />} {i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label>Event Name</label>
                <input className="input" value={form.event} onChange={e => setForm({ ...form, event: e.target.value })} required placeholder="e.g., Non-Farm Payrolls" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label>Forecast</label><input className="input" value={form.forecast} onChange={e => setForm({ ...form, forecast: e.target.value })} placeholder="200K" /></div>
                <div><label>Previous</label><input className="input" value={form.previous} onChange={e => setForm({ ...form, previous: e.target.value })} placeholder="150K" /></div>
                <div><label>Actual</label><input className="input" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} placeholder="(after release)" /></div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
