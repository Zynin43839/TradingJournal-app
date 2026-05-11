import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { get, post, del, EconomicEvent } from "../api";

const IMPACTS = ["high", "medium", "low"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];

export default function CalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
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
    await del(`/economic_events/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Economic Calendar</h1>
        <div className="flex gap-3">
          <select className="input w-32" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Currencies</option>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Currency</th>
              <th>Event</th>
              <th>Impact</th>
              <th>Forecast</th>
              <th>Previous</th>
              <th>Actual</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td>{e.date?.slice(0, 10)}</td>
                <td><span className="font-medium">{e.currency}</span></td>
                <td className="max-w-64 truncate">{e.event}</td>
                <td><span className={`badge ${e.impact === "high" ? "badge-red" : e.impact === "medium" ? "badge-yellow" : "badge-blue"}`}>{e.impact}</span></td>
                <td>{e.forecast || "-"}</td>
                <td>{e.previous || "-"}</td>
                <td className={e.actual ? "font-medium" : ""}>{e.actual || "-"}</td>
                <td><button className="text-zinc-500 hover:text-red-400" onClick={() => remove(e.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={8} className="text-center text-zinc-500 py-8">No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
                  <select className="input" value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value as EconomicEvent["impact"] })}>
                    {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>Event Name</label>
                <input className="input" value={form.event} onChange={e => setForm({ ...form, event: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label>Forecast</label><input className="input" value={form.forecast} onChange={e => setForm({ ...form, forecast: e.target.value })} /></div>
                <div><label>Previous</label><input className="input" value={form.previous} onChange={e => setForm({ ...form, previous: e.target.value })} /></div>
                <div><label>Actual</label><input className="input" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} /></div>
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
