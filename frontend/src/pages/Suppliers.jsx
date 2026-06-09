import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { INDIAN_STATES } from "../lib/format";
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
import { Plus, Pencil, Trash2, Phone, Mail, Building2, Search } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", gstin: "", phone: "", email: "", billing_address: "", shipping_address: "", state: "", type: "supplier" };

export default function Suppliers() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const load = () => api.get("/customers?type=supplier").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (c) => { setForm({ ...empty, ...c }); setEditing(c.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      const payload = { ...form, type: "supplier" };
      if (editing) await api.put(`/customers/${editing}`, payload);
      else await api.post("/customers", payload);
      toast.success(editing ? "Supplier updated" : "Supplier added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const del = async (id) => { if (!window.confirm("Delete this supplier?")) return; await api.delete(`/customers/${id}`); toast.success("Deleted"); load(); };

  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Manage your vendors &amp; manufacturers</p>
        </div>
        <Button data-testid="add-supplier-btn" onClick={openNew} className="bg-iip-blue hover:bg-[#1E3A8A]"><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="supplier-search" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No suppliers yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-iip-orange/10 text-iip-orange flex items-center justify-center font-semibold">{c.name.charAt(0).toUpperCase()}</div>
                  <div><p className="font-semibold text-[#0F172A]">{c.name}</p>{c.gstin && <p className="text-xs text-muted-foreground">GSTIN: {c.gstin}</p>}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Pencil className="h-4 w-4" /></button>
                  <button data-testid={`delete-supplier-${c.id}`} onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</p>}
                {c.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</p>}
                {c.state && <p className="text-xs">{c.state}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Name *</Label><Input data-testid="supplier-name" value={form.name} onChange={set("name")} placeholder="Supplier / Company name" /></div>
            <div className="space-y-1.5"><Label>GSTIN</Label><Input value={form.gstin} onChange={set("gstin")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input data-testid="supplier-phone" value={form.phone} onChange={set("phone")} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger data-testid="supplier-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Textarea value={form.billing_address} onChange={set("billing_address")} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-testid="save-supplier-btn" onClick={save} className="bg-iip-blue hover:bg-[#1E3A8A]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
