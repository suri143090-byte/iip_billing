import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtCurrency, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Users, IndianRupee, TrendingUp, CreditCard, Trash2, Shield,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
} from "recharts";
import { toast } from "sonner";

const PLAN_COLORS = { free: "#94A3B8", pro: "#1D4ED8", premium: "#EA580C" };

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get("/admin/payments").then((r) => setPayments(r.data)).catch(() => {});
  };
  useEffect(() => {
    if (user && user.role === "admin") load();
  }, [user]);

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const changePlan = async (uid, plan) => {
    try { await api.patch(`/admin/users/${uid}/plan`, { plan }); toast.success("Plan updated"); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const delUser = async (uid) => {
    if (!window.confirm("Delete this user?")) return;
    try { await api.delete(`/admin/users/${uid}`); toast.success("User deleted"); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const pieData = stats ? Object.entries(stats.plan_distribution).map(([k, v]) => ({ name: k, value: v })) : [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-iip-blue" />
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Users, subscriptions, payments &amp; analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-testid="admin-stat-users" className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground font-semibold">Total Users</p><Users className="h-5 w-5 text-iip-blue" /></div>
          <p className="text-2xl font-heading font-bold mt-2">{stats?.total_users ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground font-semibold">Total Revenue</p><IndianRupee className="h-5 w-5 text-green-600" /></div>
          <p className="text-2xl font-heading font-bold mt-2">{fmtCurrency(stats?.total_revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground font-semibold">MRR</p><TrendingUp className="h-5 w-5 text-iip-orange" /></div>
          <p className="text-2xl font-heading font-bold mt-2">{fmtCurrency(stats?.mrr)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground font-semibold">Payments</p><CreditCard className="h-5 w-5 text-violet-600" /></div>
          <p className="text-2xl font-heading font-bold mt-2">{stats?.total_payments ?? 0}</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Role</th>
                    <th className="text-left py-3 px-4 font-semibold">Plan</th>
                    <th className="text-left py-3 px-4 font-semibold">Joined</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`admin-user-${u.id}`} className="border-t border-border hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{u.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${u.role === "admin" ? "bg-iip-blue/10 text-iip-blue" : "bg-slate-100 text-slate-600"}`}>{u.role}</span></td>
                      <td className="py-3 px-4">
                        <Select value={u.plan} onValueChange={(v) => changePlan(u.id, v)}>
                          <SelectTrigger className="h-8 w-28" data-testid={`plan-select-${u.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{fmtDate(u.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== "admin" && (
                          <button data-testid={`delete-user-${u.id}`} onClick={() => delUser(u.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No payments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">User</th>
                      <th className="text-left py-3 px-4 font-semibold">Plan</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-3 px-4 text-muted-foreground">{fmtDate(p.created_at)}</td>
                        <td className="py-3 px-4">{p.user_email}</td>
                        <td className="py-3 px-4 capitalize">{p.plan}</td>
                        <td className="py-3 px-4 text-right font-semibold">{fmtCurrency(p.amount)}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{p.payment_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="font-heading font-semibold mb-4">Plan Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((e) => <Cell key={e.name} fill={PLAN_COLORS[e.name] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
