import { NavLink } from "react-router-dom";
import { Calendar, FileText, BarChart3, TrendingUp } from "lucide-react";

const nav = [
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/plans", label: "Plans", icon: FileText },
  { to: "/trades", label: "Trades", icon: TrendingUp },
  { to: "/backtest", label: "Backtest", icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <nav className="w-56 shrink-0 flex flex-col p-4 gap-1 border-r" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
          >
            T
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Trading App</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Journal + Analysis</div>
          </div>
        </div>

        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? "nav-active shadow-sm" : "nav-inactive"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="glass p-3">
            <div className="text-xs font-semibold" style={{ color: "var(--accent-teal)" }}>Demo App</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Self-contained trading journal
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
