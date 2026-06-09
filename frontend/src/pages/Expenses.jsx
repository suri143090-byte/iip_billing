import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { fmtCurrency, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Plus, Pencil, Trash2, Wallet, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const empty = { date: new Date().toISOString().slice(0, 10), category: "General", vendor: "", amount: 0, gst_amount: 0, payment_mode: "Cash", notes: "" };
const CATEGORIES = ["General", "Transport", "Raw Material", "Salary", "Rent", "Utilities", "Marketing", "Office Supplies", "Maintenance", "Travel", "Other"];
const MODES = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"];

export default function Expenses() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/expenses").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, num) => (e) => setForm({ ...form, [k]: num ? parseFloat(e.target.value || 0) : e.target.value });
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (x) => { setForm({ ...empty, ...x }); setEditing(x.id); setOpen(true); };

  const save = async () => {
    if (!form.amount) return toast.error("Amount is required");
    try {
      if (editing) await api.put(`/expenses/${editing}`, form);
      else await api.post("/expenses", form);
      toast.success(editing ? "Expense updated" : "Expense added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Delete this expense?")) return; await api.delete(`/expenses/${id}`); toast.success("Deleted"); load(); };

  const total = list.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth = list.filter((e) => (e.date || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Expenses</h1>
          <p className="text-muted-foreground text-sm">Track your business spending</p>
        </div>
        <Button data-testid="add-expense-btn" onClick={openNew} className="bg-iip-blue hover:bg-[#1E3A8A]"><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Total Expenses</p>
          <p className="text-2xl font-heading font-bold mt-1 text-iip-orange">{fmtCurrency(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground font-semibold">This Month</p>
          <p className="text-2xl font-heading font-bold mt-1">{fmtCurrency(thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Entries</p>
          <p className="text-2xl font-heading font-bold mt-1">{list.length}</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold">Mode</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} data-testid={`expense-row-${x.id}`} className="border-t border-border hover:bg-slate-50">
                    <td className="py-3 px-4">{fmtDate(x.date)}</td>
                    <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-iip-blue/10 text-iip-blue font-semibold">{x.category}</span></td>
                    <td className="py-3 px-4">{x.vendor || "-"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{x.payment_mode}</td>
                    <td className="py-3 px-4 text-right font-semibold">{fmtCurrency(x.amount)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(x)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`delete-expense-${x.id}`} onClick={() => del(x.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" data-testid="expense-date" value={form.date} onChange={set("date")} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="expense-category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Vendor / Paid To</Label><Input data-testid="expense-vendor" value={form.vendor} onChange={set("vendor")} /></div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" data-testid="expense-amount" value={form.amount} onChange={set("amount", true)} /></div>
            <div className="space-y-1.5"><Label>GST Amount (₹)</Label><Input type="number" value={form.gst_amount} onChange={set("gst_amount", true)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set("notes")} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-testid="save-expense-btn" onClick={save} className="bg-iip-blue hover:bg-[#1E3A8A]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
