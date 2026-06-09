import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { fmtCurrency, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Warehouse, ArrowDownUp, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const [data, setData] = useState(null);
  const [movements, setMovements] = useState([]);
  const [open, setOpen] = useState(false);
  const [adj, setAdj] = useState({ product_id: "", quantity: 1, type: "in", reason: "" });

  const load = () => {
    api.get("/inventory").then((r) => setData(r.data));
    api.get("/inventory/movements").then((r) => setMovements(r.data));
  };
  useEffect(() => { load(); }, []);

  const openAdjust = (productId = "") => { setAdj({ product_id: productId, quantity: 1, type: "in", reason: "" }); setOpen(true); };

  const save = async () => {
    if (!adj.product_id) return toast.error("Select a product");
    try {
      await api.post("/inventory/adjust", { ...adj, quantity: parseFloat(adj.quantity) || 0 });
      toast.success("Stock updated");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Inventory</h1>
          <p className="text-muted-foreground text-sm">Stock levels, valuation &amp; movements</p>
        </div>
        <Button data-testid="adjust-stock-btn" onClick={() => openAdjust()} className="bg-iip-blue hover:bg-[#1E3A8A]"><ArrowDownUp className="h-4 w-4 mr-1" /> Adjust Stock</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground font-semibold">Products</p><p className="text-2xl font-heading font-bold mt-1">{data.product_count}</p></div>
        <div className="bg-white rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground font-semibold">Stock Value</p><p className="text-2xl font-heading font-bold mt-1 text-iip-blue">{fmtCurrency(data.total_value)}</p></div>
        <div className="bg-white rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground font-semibold">Low Stock</p><p className="text-2xl font-heading font-bold mt-1 text-iip-orange">{data.low_stock_count}</p></div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2"><Package className="h-4 w-4 text-iip-blue" /><h3 className="font-heading font-semibold">Stock Levels</h3></div>
        {data.products.length === 0 ? (
          <div className="p-12 text-center"><Warehouse className="h-10 w-10 mx-auto text-muted-foreground/40" /><p className="mt-3 text-muted-foreground">No products. Add products to manage inventory.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-right py-3 px-4 font-semibold">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                  <th className="text-right py-3 px-4 font-semibold">Value</th>
                  <th className="text-right py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => {
                  const low = (p.stock || 0) <= (p.low_stock_threshold || 0);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-[#0F172A]">{p.name}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={low ? "text-red-600 font-semibold" : "font-medium"}>{p.stock} {p.unit}</span>
                        {low && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-iip-orange" />}
                      </td>
                      <td className="py-3 px-4 text-right">{fmtCurrency(p.price)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmtCurrency((p.stock || 0) * (p.price || 0))}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm" data-testid={`adjust-${p.id}`} onClick={() => openAdjust(p.id)}>Adjust</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {movements.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h3 className="font-heading font-semibold">Recent Movements</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-center py-3 px-4 font-semibold">Type</th>
                  <th className="text-right py-3 px-4 font-semibold">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold">Balance</th>
                  <th className="text-left py-3 px-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="py-2.5 px-4 text-muted-foreground">{fmtDate(m.created_at)}</td>
                    <td className="py-2.5 px-4">{m.product_name}</td>
                    <td className="py-2.5 px-4 text-center"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${m.type === "in" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{m.type === "in" ? "Stock In" : "Stock Out"}</span></td>
                    <td className="py-2.5 px-4 text-right">{m.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{m.balance_after}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{m.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Adjust Stock</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={adj.product_id} onValueChange={(v) => setAdj({ ...adj, product_id: v })}>
                <SelectTrigger data-testid="adjust-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{data.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={adj.type} onValueChange={(v) => setAdj({ ...adj, type: v })}>
                  <SelectTrigger data-testid="adjust-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In (+)</SelectItem>
                    <SelectItem value="out">Stock Out (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" data-testid="adjust-qty" value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Reason</Label><Input data-testid="adjust-reason" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="Purchase, damage, correction..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-testid="save-adjust-btn" onClick={save} className="bg-iip-blue hover:bg-[#1E3A8A]">Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
