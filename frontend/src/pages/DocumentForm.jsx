import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiErrorDetail } from "../lib/api";
import { fmtCurrency } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Percent, IndianRupee, MapPin } from "lucide-react";
import { toast } from "sonner";

const GST_RATES = [0, 5, 12, 18, 28];
const DOC_LABEL = {
  invoice: "Invoice", quotation: "Quotation", proforma: "Proforma Invoice",
  purchase_order: "Purchase Order", delivery_challan: "Delivery Challan", credit_note: "Credit Note",
};

const emptyItem = () => ({ product_id: null, name: "", description: "", hsn: "", qty: 1, rate: 0, discount: 0, gst_rate: 18 });
const defaultCharges = () => [
  { label: "Freight Charges", amount: 0, gst_rate: 18 },
  { label: "Packing Charges", amount: 0, gst_rate: 18 },
  { label: "Loading Charges", amount: 0, gst_rate: 18 },
  { label: "Other Charges", amount: 0, gst_rate: 0 },
];
const buildCharges = (saved) => {
  const base = defaultCharges();
  if (!saved || !saved.length) return base;
  return base.map((b) => {
    const f = saved.find((s) => s.label === b.label);
    return f ? { label: b.label, amount: f.amount, gst_rate: f.gst_rate } : b;
  });
};

export default function DocumentForm() {
  const { docType, id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [doc, setDoc] = useState({
    type: docType,
    customer_id: "",
    date: new Date().toISOString().slice(0, 10),
    due_date: "",
    items: [emptyItem()],
    discount_mode: "percent",
    charges: defaultCharges(),
    notes: "",
    terms: "Goods once sold will not be taken back. Payment due within 15 days.",
    status: "unpaid",
    template: "classic",
    amount_paid: 0,
  });

  useEffect(() => {
    Promise.all([api.get("/company"), api.get("/customers"), api.get("/products")]).then(([c, cust, prod]) => {
      setCompany(c.data);
      setCustomers(cust.data);
      setProducts(prod.data);
      setDoc((d) => ({ ...d, template: c.data.default_template || "classic" }));
    });
    if (isEdit) {
      api.get(`/documents/${id}`).then((r) => {
        const data = r.data;
        setDoc({
          type: data.type,
          customer_id: data.customer_id || "",
          date: data.date,
          due_date: data.due_date || "",
          items: data.items.length
            ? data.items.map((i) => ({ product_id: i.product_id, name: i.name, description: i.description || "", hsn: i.hsn, qty: i.qty, rate: i.rate, discount: i.discount || 0, gst_rate: i.gst_rate }))
            : [emptyItem()],
          discount_mode: data.discount_mode || "percent",
          charges: buildCharges(data.charges),
          notes: data.notes || "",
          terms: data.terms || "",
          status: data.status || "unpaid",
          template: data.template || "classic",
          amount_paid: data.amount_paid || 0,
        });
      });
    }
    // eslint-disable-next-line
  }, [id]);

  const selectedCustomer = customers.find((c) => c.id === doc.customer_id);
  const isIntra = useMemo(() => {
    if (!selectedCustomer?.state || !company?.state) return true;
    return selectedCustomer.state.trim().toLowerCase() === company.state.trim().toLowerCase();
  }, [selectedCustomer, company]);
  const placeOfSupply = selectedCustomer?.state || company?.state || "";

  const lineDiscount = (it) => {
    const base = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
    const d = parseFloat(it.discount) || 0;
    return doc.discount_mode === "amount" ? Math.min(d, base) : (base * d) / 100;
  };

  const totals = useMemo(() => {
    let subtotal = 0, taxTotal = 0, discTotal = 0;
    doc.items.forEach((it) => {
      const base = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
      const disc = lineDiscount(it);
      const taxable = base - disc;
      taxTotal += (taxable * (parseFloat(it.gst_rate) || 0)) / 100;
      subtotal += taxable;
      discTotal += disc;
    });
    let chargesTotal = 0;
    doc.charges.forEach((c) => {
      const amt = parseFloat(c.amount) || 0;
      if (amt > 0) {
        chargesTotal += amt;
        taxTotal += (amt * (parseFloat(c.gst_rate) || 0)) / 100;
      }
    });
    const cgst = isIntra ? taxTotal / 2 : 0;
    const sgst = isIntra ? taxTotal / 2 : 0;
    const igst = isIntra ? 0 : taxTotal;
    const total = subtotal + chargesTotal + taxTotal;
    return { subtotal, chargesTotal, discTotal, cgst, sgst, igst, taxTotal, total };
    // eslint-disable-next-line
  }, [doc.items, doc.charges, doc.discount_mode, isIntra]);

  const updateItem = (idx, key, value) => {
    setDoc((d) => {
      const items = [...d.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...d, items };
    });
  };

  const pickProduct = (idx, productId) => {
    const p = products.find((x) => x.id === productId);
    setDoc((d) => {
      const items = [...d.items];
      if (p) items[idx] = { ...items[idx], product_id: p.id, name: p.name, description: p.description || items[idx].description, hsn: p.hsn, rate: p.price, gst_rate: p.gst_rate };
      return { ...d, items };
    });
  };

  const addItem = () => setDoc((d) => ({ ...d, items: [...d.items, emptyItem()] }));
  const removeItem = (idx) => setDoc((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const updateCharge = (idx, key, value) => {
    setDoc((d) => {
      const charges = [...d.charges];
      charges[idx] = { ...charges[idx], [key]: value };
      return { ...d, charges };
    });
  };

  const save = async () => {
    if (!doc.items.some((i) => i.name.trim())) return toast.error("Add at least one item");
    setSaving(true);
    const payload = {
      ...doc,
      customer_id: doc.customer_id || null,
      amount_paid: parseFloat(doc.amount_paid) || 0,
      items: doc.items.filter((i) => i.name.trim()).map((i) => ({
        product_id: i.product_id || null, name: i.name, description: i.description || "", hsn: i.hsn || "",
        qty: parseFloat(i.qty) || 0, rate: parseFloat(i.rate) || 0, discount: parseFloat(i.discount) || 0, gst_rate: parseFloat(i.gst_rate) || 0,
      })),
      charges: doc.charges.filter((c) => (parseFloat(c.amount) || 0) > 0).map((c) => ({
        label: c.label, amount: parseFloat(c.amount) || 0, gst_rate: parseFloat(c.gst_rate) || 0,
      })),
    };
    try {
      const res = isEdit ? await api.put(`/documents/${id}`, payload) : await api.post("/documents", payload);
      toast.success(`${DOC_LABEL[docType]} saved`);
      navigate(`/documents/${res.data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const discLabel = doc.discount_mode === "amount" ? "Disc (₹)" : "Disc (%)";
  const th = "text-left py-2 px-2 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground";

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0F172A]">{isEdit ? "Edit" : "New"} {DOC_LABEL[docType]}</h1>
          <p className="text-muted-foreground text-sm">Fill the details and save</p>
        </div>
      </div>

      {/* Header info */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 sm:col-span-1">
          <Label>{docType === "purchase_order" ? "Supplier / Party" : "Customer"}</Label>
          <Select value={doc.customer_id} onValueChange={(v) => setDoc({ ...doc, customer_id: v })}>
            <SelectTrigger data-testid="doc-customer"><SelectValue placeholder="Select party" /></SelectTrigger>
            <SelectContent>
              {customers.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No parties — add one first</div>}
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" data-testid="doc-date" value={doc.date} onChange={(e) => setDoc({ ...doc, date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" data-testid="doc-due" value={doc.due_date} onChange={(e) => setDoc({ ...doc, due_date: e.target.value })} />
        </div>
      </div>

      {/* Auto-filled customer details */}
      {selectedCustomer && (
        <div data-testid="customer-autofill" className="bg-iip-blue/5 rounded-xl border border-iip-blue/20 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-iip-blue mb-1">Billing Address</p>
            <p className="font-semibold text-[#0F172A]">{selectedCustomer.name}</p>
            {selectedCustomer.contact_person && <p className="text-muted-foreground">Attn: {selectedCustomer.contact_person}</p>}
            <p className="text-muted-foreground whitespace-pre-line">{selectedCustomer.billing_address || "—"}</p>
            {selectedCustomer.phone && <p className="text-muted-foreground">Ph: {selectedCustomer.phone}</p>}
            {selectedCustomer.gstin && <p className="text-muted-foreground">GSTIN: {selectedCustomer.gstin}</p>}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-iip-blue mb-1">Shipping Address</p>
            <p className="text-muted-foreground whitespace-pre-line">{selectedCustomer.shipping_address || selectedCustomer.billing_address || "—"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-border text-xs"><MapPin className="h-3 w-3 text-iip-blue" /> Place of Supply: <strong>{placeOfSupply || "—"}</strong></span>
              <span className="px-2 py-1 rounded-full bg-iip-blue/10 text-iip-blue text-xs font-semibold">{isIntra ? "CGST + SGST" : "IGST"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Line items - single row table */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-heading font-semibold text-[#0F172A]">Items</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1" data-testid="discount-mode-toggle">
              <button type="button" data-testid="discount-mode-percent" onClick={() => setDoc({ ...doc, discount_mode: "percent" })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${doc.discount_mode === "percent" ? "bg-iip-blue text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <Percent className="h-3 w-3" /> Discount
              </button>
              <button type="button" data-testid="discount-mode-amount" onClick={() => setDoc({ ...doc, discount_mode: "amount" })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${doc.discount_mode === "amount" ? "bg-iip-blue text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <IndianRupee className="h-3 w-3" /> Amount Discount
              </button>
            </div>
            <Button variant="outline" size="sm" data-testid="add-item-btn" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className={`${th} w-10 text-center`}>#</th>
                <th className={`${th} min-w-[180px]`}>Item</th>
                <th className={`${th} min-w-[200px]`}>Description</th>
                <th className={`${th} w-28`}>HSN/SAC</th>
                <th className={`${th} w-20 text-right`}>Qty</th>
                <th className={`${th} w-28 text-right`}>Rate</th>
                <th className={`${th} w-24 text-right`}>{discLabel}</th>
                <th className={`${th} w-24`}>GST%</th>
                <th className={`${th} w-28 text-right`}>Amount</th>
                <th className={`${th} w-10`}></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it, idx) => {
                const base = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
                const taxable = base - lineDiscount(it);
                const amount = taxable * (1 + (parseFloat(it.gst_rate) || 0) / 100);
                return (
                  <tr key={idx} data-testid={`item-row-${idx}`} className="border-b border-border align-top">
                    <td className="py-2 px-2 text-center text-sm text-muted-foreground pt-4">{idx + 1}</td>
                    <td className="py-2 px-2">
                      {products.length > 0 && (
                        <Select value={it.product_id || ""} onValueChange={(v) => pickProduct(idx, v)}>
                          <SelectTrigger className="h-8 mb-1 text-xs" data-testid={`item-product-${idx}`}><SelectValue placeholder="Pick product" /></SelectTrigger>
                          <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      <Input data-testid={`item-name-${idx}`} className="h-9" placeholder="Item name" value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
                    </td>
                    <td className="py-2 px-2">
                      <Textarea data-testid={`item-desc-${idx}`} className="min-h-[38px] text-sm" placeholder="Description (multi-line)" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} rows={2} />
                    </td>
                    <td className="py-2 px-2"><Input className="h-9" data-testid={`item-hsn-${idx}`} value={it.hsn} onChange={(e) => updateItem(idx, "hsn", e.target.value)} /></td>
                    <td className="py-2 px-2"><Input className="h-9 text-right" type="number" data-testid={`item-qty-${idx}`} value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} /></td>
                    <td className="py-2 px-2"><Input className="h-9 text-right" type="number" data-testid={`item-rate-${idx}`} value={it.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} /></td>
                    <td className="py-2 px-2"><Input className="h-9 text-right" type="number" data-testid={`item-discount-${idx}`} value={it.discount} onChange={(e) => updateItem(idx, "discount", e.target.value)} /></td>
                    <td className="py-2 px-2">
                      <Select value={String(it.gst_rate)} onValueChange={(v) => updateItem(idx, "gst_rate", parseFloat(v))}>
                        <SelectTrigger className="h-9" data-testid={`item-gst-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-2 text-right text-sm font-semibold pt-4" data-testid={`item-amount-${idx}`}>{fmtCurrency(amount)}</td>
                    <td className="py-2 px-2 pt-3">
                      <button data-testid={`remove-item-${idx}`} onClick={() => removeItem(idx)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional charges */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h3 className="font-heading font-semibold text-[#0F172A] mb-1">Additional Charges</h3>
        <p className="text-xs text-muted-foreground mb-4">Freight, packing, loading & other charges (each can carry GST)</p>
        <div className="space-y-2">
          {doc.charges.map((c, idx) => (
            <div key={idx} data-testid={`charge-row-${idx}`} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-6 text-sm font-medium text-[#0F172A]">{c.label}</div>
              <div className="col-span-7 sm:col-span-3 space-y-1">
                <Label className="text-xs sm:hidden">Amount (₹)</Label>
                <Input className="h-9" type="number" data-testid={`charge-amount-${idx}`} placeholder="0" value={c.amount} onChange={(e) => updateCharge(idx, "amount", e.target.value)} />
              </div>
              <div className="col-span-5 sm:col-span-3 space-y-1">
                <Label className="text-xs sm:hidden">GST %</Label>
                <Select value={String(c.gst_rate)} onValueChange={(v) => updateCharge(idx, "gst_rate", parseFloat(v))}>
                  <SelectTrigger className="h-9" data-testid={`charge-gst-${idx}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}% GST</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals + extras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea data-testid="doc-notes" rows={2} value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Terms &amp; Conditions</Label>
            <Textarea data-testid="doc-terms" rows={2} value={doc.terms} onChange={(e) => setDoc({ ...doc, terms: e.target.value })} />
          </div>
          {docType === "invoice" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={doc.status} onValueChange={(v) => setDoc({ ...doc, status: v })}>
                  <SelectTrigger data-testid="doc-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount Paid</Label>
                <Input type="number" value={doc.amount_paid} onChange={(e) => setDoc({ ...doc, amount_paid: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-heading font-semibold text-[#0F172A] mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal (Taxable)</span><span className="font-medium">{fmtCurrency(totals.subtotal)}</span></div>
            {totals.discTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Total Discount</span><span className="font-medium text-green-600">- {fmtCurrency(totals.discTotal)}</span></div>}
            {totals.chargesTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Additional Charges</span><span className="font-medium">{fmtCurrency(totals.chargesTotal)}</span></div>}
            {isIntra ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-medium">{fmtCurrency(totals.cgst)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-medium">{fmtCurrency(totals.sgst)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-medium">{fmtCurrency(totals.igst)}</span></div>
            )}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-heading font-bold text-[#0F172A]">Total</span>
              <span data-testid="doc-total" className="font-heading font-bold text-xl text-iip-blue">{fmtCurrency(totals.total)}</span>
            </div>
          </div>
          <Button data-testid="save-document-btn" onClick={save} disabled={saving} className="w-full mt-5 bg-iip-orange hover:bg-[#C2410C] h-11">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : `Save ${DOC_LABEL[docType]}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
