import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { fmtCurrency } from "../lib/format";
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
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { UnitCombobox } from "../components/UnitCombobox";

const empty = { name: "", hsn: "", description: "", unit: "NOS", price: 0, gst_rate: 18, stock: 0, low_stock_threshold: 5 };
const GST_RATES = [0, 5, 12, 18, 28];

export default function Products() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const load = () => api.get("/products").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, num) => (e) => setForm({ ...form, [k]: num ? parseFloat(e.target.value || 0) : e.target.value });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (p) => { setForm({ ...empty, ...p }); setEditing(p.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      if (editing) await api.put(`/products/${editing}`, form);
      else await api.post("/products", form);
      toast.success(editing ? "Product updated" : "Product added");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/products/${id}`);
    toast.success("Deleted");
    load();
  };

  const filtered = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Products</h1>
          <p className="text-muted-foreground text-sm">Your catalogue with HSN &amp; GST rates</p>
        </div>
        <Button data-testid="add-product-btn" onClick={openNew} className="bg-iip-blue hover:bg-[#1E3A8A]">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="product-search" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No products yet. Add your first product.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 font-semibold">HSN</th>
                  <th className="text-right py-3 px-4 font-semibold">Price</th>
                  <th className="text-right py-3 px-4 font-semibold">GST</th>
                  <th className="text-right py-3 px-4 font-semibold">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} data-testid={`product-row-${p.id}`} className="border-t border-border hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-[#0F172A]">{p.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.hsn || "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold">{fmtCurrency(p.price)}</td>
                    <td className="py-3 px-4 text-right">{p.gst_rate}%</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`${p.stock <= p.low_stock_threshold ? "text-red-600 font-semibold" : ""}`}>{p.stock} {p.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button data-testid={`edit-product-${p.id}`} onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-iip-blue"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`delete-product-${p.id}`} onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name *</Label>
              <Input data-testid="product-name" value={form.name} onChange={set("name")} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>HSN / SAC Code</Label>
              <Input data-testid="product-hsn" value={form.hsn} onChange={set("hsn")} placeholder="7308" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <UnitCombobox value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} testid="product-unit" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input data-testid="product-price" type="number" value={form.price} onChange={set("price", true)} />
            </div>
            <div className="space-y-1.5">
              <Label>GST Rate (%)</Label>
              <Select value={String(form.gst_rate)} onValueChange={(v) => setForm({ ...form, gst_rate: parseFloat(v) })}>
                <SelectTrigger data-testid="product-gst"><SelectValue /></SelectTrigger>
                <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stock Quantity</Label>
              <Input data-testid="product-stock" type="number" value={form.stock} onChange={set("stock", true)} />
            </div>
            <div className="space-y-1.5">
              <Label>Low Stock Alert</Label>
              <Input data-testid="product-lowstock" type="number" value={form.low_stock_threshold} onChange={set("low_stock_threshold", true)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea data-testid="product-desc" value={form.description} onChange={set("description")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-testid="save-product-btn" onClick={save} className="bg-iip-blue hover:bg-[#1E3A8A]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
