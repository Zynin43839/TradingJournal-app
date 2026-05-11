import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, RefreshCw, Calendar as CalendarIcon, AlertTriangle, Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { get, post, del, EconomicEvent } from "../api";

const IMPACTS = ["high", "medium", "low"] as const;
const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];

type SortKey = "time_bkk" | "symbols" | "event" | "impact";

export default function CalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [fetching, setFetching] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<EconomicEvent[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("time_bkk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({ date: "", currency: "USD", event: "", impact: "medium" as EconomicEvent["impact"], forecast: "", previous: "", actual: "" });

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      const data = await get<EconomicEvent[]>("/economic_events");
      setEvents(data.filter(e => !filter || e.currency === filter));
    } catch { setEvents([]); }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    const list = [...events];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "impact") cmp = (IMPACT_ORDER[a.impact] ?? 2) - (IMPACT_ORDER[b.impact] ?? 2);
      else if (sortKey === "time_bkk") cmp = (a.time_bkk || "").localeCompare(b.time_bkk || "");
      else cmp = ((a as any)[sortKey] || "").localeCompare((b as any)[sortKey] || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [events, sortKey, sortDir]);

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
      const data = await post<{ events: EconomicEvent[]; count: number }>("/fetch-calendar", {});
      setPreviewEvents(data.events);
    } catch (err) {
      console.error("Fetch calendar failed:", err);
    } finally {
      setFetching(false);
    }
  }

  async function handleAddAllPreview() {
    if (!previewEvents) return;
    setFetching(true);
    try {
      for (const ev of previewEvents) {
        await post("/economic_events", ev);
      }
      setPreviewEvents(null);
      await load();
    } catch (err) {
      console.error("Add events failed:", err);
    } finally {
      setFetching(false);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  function Th({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    return (
      <th className={`cursor-pointer select-none hover:text-white transition-colors ${className || ""}`} onClick={() => toggleSort(k)}>
        <div className="flex items-center gap-1">
          {label} <SortIcon k={k} />
        </div>
      </th>
    );
  }

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

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <CalendarIcon size={40} className="text-zinc-700 mb-3" />
          <p className="text-sm">No events yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <Th k="time_bkk" label="Time (ICT)" className="w-24" />
                <Th k="symbols" label="Symbol" className="w-40" />
                <Th k="event" label="Event" />
                <Th k="impact" label="Impact" className="w-24" />
                <th className="w-24 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Forecast</th>
                <th className="w-24 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Previous</th>
                <th className="w-24 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Actual</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(e => (
                <tr key={e.id} className="group">
                  <td className="text-xs text-zinc-500 font-mono">{e.time_bkk || "-"}</td>
                  <td>
                    {e.symbols ? (
                      <div className="flex flex-wrap gap-1">
                        {e.symbols.split(",").map(s => (
                          <span key={s} className="text-[10px] bg-white/[0.04] text-zinc-300 px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">{e.currency}</span>
                    )}
                  </td>
                  <td className="font-medium text-zinc-200 max-w-xs truncate">{e.event}</td>
                  <td>
                    <span className={`badge ${e.impact === "high" ? "badge-red" : e.impact === "medium" ? "badge-yellow" : "badge-blue"} flex items-center gap-1 w-fit`}>
                      {e.impact === "high" ? <AlertTriangle size={10} /> : <Info size={10} />}
                      {e.impact}
                    </span>
                  </td>
                  <td className="text-zinc-400 text-xs">{e.forecast || "-"}</td>
                  <td className="text-zinc-400 text-xs">{e.previous || "-"}</td>
                  <td className={`text-xs font-medium ${e.actual ? (Number(e.actual) > Number(e.forecast || 0) ? "text-green-400" : "text-red-400") : "text-zinc-600"}`}>
                    {e.actual || "-"}
                  </td>
                  <td>
                    <button onClick={() => remove(e.id)} className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {previewEvents && (
        <div className="modal-overlay" onClick={() => setPreviewEvents(null)}>
          <div className="modal max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Preview Events ({previewEvents.length})</h2>
              <span className="text-xs text-zinc-500">Bangkok timezone (ICT)</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.04] mb-4">
              {previewEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-12 text-xs text-zinc-500 font-mono shrink-0">{ev.time_bkk || "-"}</span>
                  <span className={`w-14 text-xs font-medium shrink-0 ${
                    ev.impact === "high" ? "text-red-400" : ev.impact === "medium" ? "text-amber-400" : "text-blue-400"
                  }`}>{ev.impact}</span>
                  <div className="w-40 shrink-0 flex flex-wrap gap-1">
                    {(ev.symbols || ev.currency).split(",").slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] bg-white/[0.04] text-zinc-300 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                    {(ev.symbols || "").split(",").length > 3 && (
                      <span className="text-[10px] text-zinc-500">+{ev.symbols!.split(",").length - 3}</span>
                    )}
                  </div>
                  <span className="text-zinc-200 truncate">{ev.event}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setPreviewEvents(null)}>Cancel</button>
              <button className="btn btn-teal" onClick={handleAddAllPreview} disabled={fetching}>
                {fetching ? "Adding..." : `Add ${previewEvents.length} Events to Calendar`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
