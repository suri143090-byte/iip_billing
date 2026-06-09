import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmtCurrency, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search, FileText, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TITLES = {
  invoice: { title: "Invoices", subtitle: "GST invoices & payment tracking" },
  quotation: { title: "Quotations", subtitle: "Estimates & price quotes" },
  proforma: { title: "Proforma Invoices", subtitle: "Proforma documents" },
  purchase_order: { title: "Purchase Orders", subtitle: "Orders sent to suppliers" },
  delivery_challan: { title: "Delivery Challans", subtitle: "Goods delivery notes" },
  credit_note: { title: "Credit Notes", subtitle: "Returns & adjustments" },
};

export default function DocumentsPage({ docType }) {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const meta = TITLES[docType];

  const load = () => api.get(`/documents?type=${docType}`).then((r) => setList(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [docType]);

  const del = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    toast.success("Deleted");
    load();
  };

  const setStatus = async (id, status, e) => {
    e.stopPropagation();
    await api.patch(`/documents/${id}/status`, { status });
    toast.success(`Marked ${status}`);
    load();
  };

  const statusColor = (s) =>
    s === "paid" ? "bg-green-100 text-green-700" : s === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  const filtered = list.filter(
    (d) => (d.number || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.customer?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = list.reduce((s, d) => s + (d.total || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">{meta.title}</h1>
          <p className="text-muted-foreground text-sm">{meta.subtitle}</p>
        </div>
        <Button data-testid="new-document-btn" onClick={() => navigate(`/documents/${docType}/new`)} className="bg-iip-orange hover:bg-[#C2410C]">
          <Plus className="h-4 w-4 mr-1" /> New {meta.title.replace(/s$/, "")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Total {meta.title}</p>
          <p className="text-2xl font-heading font-bold mt-1">{list.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Total Value</p>
          <p className="text-2xl font-heading font-bold mt-1">{fmtCurrency(totalValue)}</p>
        </div>
        {docType === "invoice" && (
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground font-semibold">Unpaid</p>
            <p className="text-2xl font-heading font-bold mt-1 text-iip-orange">{list.filter((d) => d.status !== "paid").length}</p>
          </div>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="document-search" placeholder="Search by number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No {meta.title.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Number</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} data-testid={`document-row-${d.id}`} onClick={() => navigate(`/documents/${d.id}`)} className="border-t border-border hover:bg-slate-50 cursor-pointer">
                    <td className="py-3 px-4 font-medium text-iip-blue">{d.number}</td>
                    <td className="py-3 px-4">{d.customer?.name || "Walk-in"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{fmtDate(d.date)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{fmtCurrency(d.total)}</td>
                    <td className="py-3 px-4 text-center">
                      {docType === "invoice" ? (
                        <button data-testid={`toggle-status-${d.id}`} onClick={(e) => setStatus(d.id, d.status === "paid" ? "unpaid" : "paid", e)} className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${statusColor(d.status)}`}>
                          {d.status}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/documents/${d.id}`); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Eye className="h-4 w-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/documents/${docType}/${d.id}/edit`); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`delete-document-${d.id}`} onClick={(e) => del(d.id, e)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
