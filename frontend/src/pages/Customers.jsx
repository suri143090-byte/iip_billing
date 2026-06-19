import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { INDIAN_STATES, validateGstin, stateFromGstin } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Plus, Pencil, Trash2, Phone, Mail, Users, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", gstin: "", contact_person: "", phone: "", email: "", billing_address: "", shipping_address: "", state: "", type: "customer" };

export default function Customers() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const load = () => api.get("/customers").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onGstinChange = (e) => {
    const gstin = e.target.value.toUpperCase();
    const next = { ...form, gstin };
    const detected = stateFromGstin(gstin);
    if (detected) next.state = detected; // auto-fill state from GSTIN state code
    setForm(next);
  };
  const gstinValid = form.gstin ? validateGstin(form.gstin) : null;

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (c) => { setForm({ ...empty, ...c }); setEditing(c.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.gstin && !validateGstin(form.gstin)) return toast.error("Invalid GSTIN format (15 chars, e.g. 29ABCDE1234F1Z5)");
    try {
      if (editing) await api.put(`/customers/${editing}`, form);
      else await api.post("/customers", form);
      toast.success(editing ? "Customer updated" : "Customer added");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    await api.delete(`/customers/${id}`);
    toast.success("Deleted");
    load();
  };

  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage your parties &amp; billing details</p>
        </div>
        <Button data-testid="add-customer-btn" onClick={openNew} className="bg-iip-blue hover:bg-[#1E3A8A]">
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="customer-search" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No customers yet. Add your first customer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} data-testid={`customer-card-${c.id}`} className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-iip-blue/10 text-iip-blue flex items-center justify-center font-semibold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">{c.name}</p>
                    {c.gstin && <p className="text-xs text-muted-foreground">GSTIN: {c.gstin}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button data-testid={`edit-customer-${c.id}`} onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button data-testid={`delete-customer-${c.id}`} onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name *</Label>
              <Input data-testid="customer-name" value={form.name} onChange={set("name")} placeholder="Customer / Company name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-2">
                GSTIN
                {gstinValid === true && (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Valid · {stateFromGstin(form.gstin)}</span>
                )}
                {gstinValid === false && (
                  <span className="flex items-center gap-1 text-destructive text-xs font-medium"><AlertCircle className="h-3.5 w-3.5" /> Invalid format</span>
                )}
              </Label>
              <Input data-testid="customer-gstin" value={form.gstin} onChange={onGstinChange} maxLength={15} placeholder="29ABCDE1234F1Z5" className={gstinValid === false ? "border-destructive" : gstinValid === true ? "border-green-500" : ""} />
              {gstinValid === true && <p className="text-xs text-muted-foreground">State auto-detected from GSTIN. CGST+SGST / IGST will be applied automatically on documents.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input data-testid="customer-contact" value={form.contact_person} onChange={set("contact_person")} placeholder="Mr. Ramesh Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile / Phone</Label>
              <Input data-testid="customer-phone" value={form.phone} onChange={set("phone")} placeholder="9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input data-testid="customer-email" value={form.email} onChange={set("email")} placeholder="email@domain.com" />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger data-testid="customer-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Billing Address</Label>
              <Textarea data-testid="customer-billing" value={form.billing_address} onChange={set("billing_address")} rows={2} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Shipping Address</Label>
              <Textarea data-testid="customer-shipping" value={form.shipping_address} onChange={set("shipping_address")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-testid="save-customer-btn" onClick={save} className="bg-iip-blue hover:bg-[#1E3A8A]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
