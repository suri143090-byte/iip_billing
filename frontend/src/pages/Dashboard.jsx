import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmtCurrency, fmtDate } from "../lib/format";
import {
  TrendingUp, Clock, IndianRupee, Users, FileText, AlertTriangle, Plus, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Button } from "../components/ui/button";

const StatCard = ({ icon: Icon, label, value, accent, testid }) => (
  <div data-testid={testid} className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="mt-2 text-2xl font-heading font-bold text-[#0F172A]">{value}</p>
      </div>
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const statusColor = (s) =>
    s === "paid" ? "bg-green-100 text-green-700" : s === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your business performance</p>
        </div>
        <Button data-testid="dashboard-new-invoice" onClick={() => navigate("/documents/invoice/new")} className="bg-iip-orange hover:bg-[#C2410C]">
          <Plus className="h-4 w-4 mr-1" /> New Invoice
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="stat-total-sales" icon={TrendingUp} label="Total Sales" value={fmtCurrency(stats?.total_sales)} accent="bg-iip-blue/10 text-iip-blue" />
        <StatCard testid="stat-pending" icon={Clock} label="Pending Payments" value={fmtCurrency(stats?.pending_payments)} accent="bg-orange-100 text-iip-orange" />
        <StatCard testid="stat-monthly" icon={IndianRupee} label="This Month" value={fmtCurrency(stats?.this_month_revenue)} accent="bg-green-100 text-green-600" />
        <StatCard testid="stat-customers" icon={Users} label="Customers" value={stats?.customer_count ?? 0} accent="bg-violet-100 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[#0F172A]">Monthly Revenue</h3>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthly_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => fmtCurrency(v)} cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="revenue" fill="#1D4ED8" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-heading font-semibold text-[#0F172A] mb-4">Top Customers</h3>
          <div className="space-y-3">
            {(stats?.top_customers || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {(stats?.top_customers || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-iip-blue/10 text-iip-blue flex items-center justify-center text-sm font-semibold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#0F172A] truncate max-w-[120px]">{c.name}</span>
                </div>
                <span className="text-sm font-semibold">{fmtCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[#0F172A]">Recent Invoices</h3>
            <button onClick={() => navigate("/invoices")} className="text-xs text-iip-blue font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-semibold">Number</th>
                  <th className="text-left py-2 font-semibold">Customer</th>
                  <th className="text-right py-2 font-semibold">Amount</th>
                  <th className="text-right py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_invoices || []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
                {(stats?.recent_invoices || []).map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/documents/${inv.id}`)} className="border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer">
                    <td className="py-3 font-medium text-iip-blue">{inv.number}</td>
                    <td className="py-3">{inv.customer?.name || "Walk-in"}</td>
                    <td className="py-3 text-right font-semibold">{fmtCurrency(inv.total)}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${statusColor(inv.status)}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-iip-orange" />
            <h3 className="font-heading font-semibold text-[#0F172A]">Low Stock Alerts</h3>
          </div>
          <div className="space-y-3">
            {(stats?.low_stock || []).length === 0 && (
              <p className="text-sm text-muted-foreground">All products well stocked.</p>
            )}
            {(stats?.low_stock || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#0F172A] truncate max-w-[140px]">{p.name}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
