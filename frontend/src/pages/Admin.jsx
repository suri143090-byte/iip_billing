import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import api, { formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtCurrency, fmtDate } from "../lib/format";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  Users, IndianRupee, TrendingUp, CreditCard, Trash2, Shield, FileText,
  Search, Eye, Download, Printer, Building2, Package, Loader2,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { toast } from "sonner";

const PLAN_COLORS = { free: "#94A3B8", pro: "#1D4ED8", premium: "#EA580C" };
const DOC_TYPES = [
  { v: "all", l: "All Documents" }, { v: "invoice", l: "Invoices" }, { v: "quotation", l: "Quotations" },
  { v: "proforma", l: "Proforma" }, { v: "purchase_order", l: "Purchase Orders" },
  { v: "delivery_challan", l: "Delivery Challans" }, { v: "credit_note", l: "Credit Notes" },
];
const TYPE_LABEL = {
  invoice: "Invoice", quotation: "Quotation", proforma: "Proforma", purchase_order: "Purchase Order",
  delivery_challan: "Delivery Challan", credit_note: "Credit Note",
};

const StatCard = ({ icon: Icon, label, value, accent, testid }) => (
  <div data-testid={testid} className="bg-white rounded-xl border border-border p-5">
    <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p><Icon className={`h-5 w-5 ${accent}`} /></div>
    <p className="text-2xl font-heading font-bold mt-2">{value}</p>
  </div>
);

function AdminDocViewer({ id, onClose }) {
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { api.get(`/admin/documents/${id}`).then((r) => setData(r.data)); }, [id]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const el = document.getElementById("printable-invoice");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = 210, h = (canvas.height * w) / canvas.width;
      let left = h, pos = 0;
      pdf.addImage(img, "PNG", 0, pos, w, h); left -= 297;
      while (left > 0) { pos -= 297; pdf.addPage(); pdf.addImage(img, "PNG", 0, pos, w, h); left -= 297; }
      pdf.save(`${data.document.number.replace(/\//g, "-")}.pdf`);
    } catch { toast.error("PDF failed, use Print"); } finally { setDownloading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{data?.document?.number} · {data?.owner?.email}</DialogTitle></DialogHeader>
        {!data ? <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-iip-blue" /></div> : (
          <>
            <div className="flex gap-2 mb-3 no-print">
              <Button variant="outline" size="sm" data-testid="admin-download-pdf" onClick={downloadPdf} disabled={downloading}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} Download PDF</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            </div>
            <div className="bg-slate-100 rounded-lg p-2 overflow-x-auto flex justify-center">
              <InvoiceDocument doc={data.document} company={data.company} template={data.document.template || "classic"} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ type: "all", user_id: "all", q: "", date_from: "", date_to: "" });
  const [viewId, setViewId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [dataView, setDataView] = useState("products");

  const loadCore = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get("/admin/payments").then((r) => setPayments(r.data)).catch(() => {});
  };
  const loadDocs = () => {
    const p = new URLSearchParams();
    if (filters.type !== "all") p.set("type", filters.type);
    if (filters.user_id !== "all") p.set("user_id", filters.user_id);
    if (filters.q) p.set("q", filters.q);
    if (filters.date_from) p.set("date_from", filters.date_from);
    if (filters.date_to) p.set("date_to", filters.date_to);
    api.get(`/admin/documents?${p.toString()}`).then((r) => setDocs(r.data)).catch(() => {});
  };

  useEffect(() => { if (user?.role === "admin") { loadCore(); loadDocs(); api.get("/admin/products").then((r) => setProducts(r.data)); api.get("/admin/customers").then((r) => setCustomers(r.data)); } /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (user?.role === "admin") loadDocs(); /* eslint-disable-next-line */ }, [filters]);

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const changePlan = async (uid, plan) => {
    try { await api.patch(`/admin/users/${uid}/plan`, { plan }); toast.success("Plan updated"); loadCore(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const delUser = async (uid) => {
    if (!window.confirm("Delete this user?")) return;
    try { await api.delete(`/admin/users/${uid}`); toast.success("User deleted"); loadCore(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const openUser = (uid) => api.get(`/admin/users/${uid}`).then((r) => setUserDetail(r.data));

  const pieData = stats ? Object.entries(stats.plan_distribution).map(([k, v]) => ({ name: k, value: v })) : [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-iip-blue" />
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Full oversight across all users, companies &amp; documents</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard testid="admin-stat-users" icon={Users} label="Total Users" value={stats?.total_users ?? 0} accent="text-iip-blue" />
        <StatCard testid="admin-stat-docs" icon={FileText} label="Total Documents" value={stats?.total_documents ?? 0} accent="text-violet-600" />
        <StatCard testid="admin-stat-sales" icon={TrendingUp} label="Sales Value" value={fmtCurrency(stats?.total_sales)} accent="text-green-600" />
        <StatCard testid="admin-stat-revenue" icon={IndianRupee} label="Subscription Rev." value={fmtCurrency(stats?.subscription_revenue)} accent="text-iip-orange" />
        <StatCard testid="admin-stat-mrr" icon={CreditCard} label="MRR" value={fmtCurrency(stats?.mrr)} accent="text-iip-blue" />
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Products &amp; Customers</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <div className="bg-white rounded-xl border border-border p-4 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger data-testid="filter-type"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.user_id} onValueChange={(v) => setFilters({ ...filters, user_id: v })}>
              <SelectTrigger data-testid="filter-user"><SelectValue placeholder="All Users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input data-testid="filter-search" className="pl-9" placeholder="No / Company / GSTIN" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            </div>
            <Input type="date" data-testid="filter-from" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            <Input type="date" data-testid="filter-to" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Number</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Company / User</th>
                    <th className="text-left py-3 px-4 font-semibold">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No documents found.</td></tr>}
                  {docs.map((d) => (
                    <tr key={d.id} data-testid={`admin-doc-${d.id}`} className="border-t border-border hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-iip-blue">{d.number}</td>
                      <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{TYPE_LABEL[d.type]}</span></td>
                      <td className="py-3 px-4"><div className="font-medium">{d.company_name || "—"}</div><div className="text-xs text-muted-foreground">{d.owner_email}</div></td>
                      <td className="py-3 px-4">{d.customer?.name || "Walk-in"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{fmtDate(d.date)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmtCurrency(d.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <button data-testid={`view-doc-${d.id}`} onClick={() => setViewId(d.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Eye className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* USERS */}
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
                        <div className="flex justify-end gap-1">
                          <button data-testid={`view-user-${u.id}`} onClick={() => openUser(u.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Eye className="h-4 w-4" /></button>
                          {u.role !== "admin" && <button data-testid={`delete-user-${u.id}`} onClick={() => delUser(u.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* DATA: products & customers */}
        <TabsContent value="data">
          <div className="flex gap-2 mb-4">
            <Button variant={dataView === "products" ? "default" : "outline"} size="sm" data-testid="data-products" onClick={() => setDataView("products")} className={dataView === "products" ? "bg-iip-blue" : ""}><Package className="h-4 w-4 mr-1" /> Products ({products.length})</Button>
            <Button variant={dataView === "customers" ? "default" : "outline"} size="sm" data-testid="data-customers" onClick={() => setDataView("customers")} className={dataView === "customers" ? "bg-iip-blue" : ""}><Building2 className="h-4 w-4 mr-1" /> Customers ({customers.length})</Button>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {dataView === "products" ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Product</th><th className="text-left py-3 px-4 font-semibold">Company</th>
                    <th className="text-left py-3 px-4 font-semibold">HSN</th><th className="text-right py-3 px-4 font-semibold">Price</th>
                    <th className="text-right py-3 px-4 font-semibold">GST</th><th className="text-right py-3 px-4 font-semibold">Stock</th>
                  </tr></thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-t border-border"><td className="py-3 px-4 font-medium">{p.name}</td><td className="py-3 px-4 text-muted-foreground">{p.company_name}</td><td className="py-3 px-4">{p.hsn || "-"}</td><td className="py-3 px-4 text-right">{fmtCurrency(p.price)}</td><td className="py-3 px-4 text-right">{p.gst_rate}%</td><td className="py-3 px-4 text-right">{p.stock} {p.unit}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Name</th><th className="text-left py-3 px-4 font-semibold">Company</th>
                    <th className="text-left py-3 px-4 font-semibold">GSTIN</th><th className="text-left py-3 px-4 font-semibold">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold">State</th><th className="text-left py-3 px-4 font-semibold">Type</th>
                  </tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-t border-border"><td className="py-3 px-4 font-medium">{c.name}</td><td className="py-3 px-4 text-muted-foreground">{c.company_name}</td><td className="py-3 px-4">{c.gstin || "-"}</td><td className="py-3 px-4">{c.phone || "-"}</td><td className="py-3 px-4">{c.state || "-"}</td><td className="py-3 px-4 capitalize">{c.type}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {payments.length === 0 ? <div className="p-12 text-center text-muted-foreground">No payments yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Date</th><th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-left py-3 px-4 font-semibold">Plan</th><th className="text-right py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                  </tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-border"><td className="py-3 px-4 text-muted-foreground">{fmtDate(p.created_at)}</td><td className="py-3 px-4">{p.user_email}</td><td className="py-3 px-4 capitalize">{p.plan}</td><td className="py-3 px-4 text-right font-semibold">{fmtCurrency(p.amount)}</td><td className="py-3 px-4 text-xs text-muted-foreground">{p.payment_id}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="font-heading font-semibold mb-4">Plan Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((e) => <Cell key={e.name} fill={PLAN_COLORS[e.name] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {viewId && <AdminDocViewer id={viewId} onClose={() => setViewId(null)} />}

      {userDetail && (
        <Dialog open onOpenChange={() => setUserDetail(null)}>
          <DialogContent className="max-w-lg" data-testid="user-detail-modal">
            <DialogHeader><DialogTitle className="font-heading">{userDetail.user.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground uppercase">Email</p><p className="font-medium">{userDetail.user.email}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Plan</p><p className="font-medium capitalize">{userDetail.user.plan}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Role</p><p className="font-medium">{userDetail.user.role}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Joined</p><p className="font-medium">{fmtDate(userDetail.user.created_at)}</p></div>
              </div>
              {userDetail.company && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Company</p>
                  <p className="font-semibold">{userDetail.company.name}</p>
                  {userDetail.company.gstin && <p className="text-muted-foreground">GSTIN: {userDetail.company.gstin}</p>}
                  {userDetail.company.state && <p className="text-muted-foreground">{userDetail.company.state}</p>}
                  {userDetail.company.phone && <p className="text-muted-foreground">{userDetail.company.phone}</p>}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
                <div><p className="text-lg font-bold text-iip-blue">{userDetail.counts.invoices}</p><p className="text-xs text-muted-foreground">Invoices</p></div>
                <div><p className="text-lg font-bold text-iip-blue">{userDetail.counts.documents}</p><p className="text-xs text-muted-foreground">Documents</p></div>
                <div><p className="text-lg font-bold text-iip-blue">{userDetail.counts.customers}</p><p className="text-xs text-muted-foreground">Customers</p></div>
                <div><p className="text-lg font-bold text-iip-blue">{userDetail.counts.products}</p><p className="text-xs text-muted-foreground">Products</p></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
