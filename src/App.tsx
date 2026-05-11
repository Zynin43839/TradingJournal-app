import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import CalendarPage from "./pages/CalendarPage";
import PlansPage from "./pages/PlansPage";
import TradesPage from "./pages/TradesPage";
import BacktestPage from "./pages/BacktestPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/backtest" element={<BacktestPage />} />
      </Routes>
    </Layout>
  );
}
