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
    <div className="flex min-h-screen">
      <nav className="w-56 glass border-r border-white/[0.04] flex flex-col p-4 gap-1 shrink-0">
        <div className="text-lg font-bold text-teal-400 mb-6 px-3">Trading App</div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
