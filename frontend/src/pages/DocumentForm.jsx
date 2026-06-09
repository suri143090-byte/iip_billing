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
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const GST_RATES = [0, 5, 12, 18, 28];
const DOC_LABEL = {
  invoice: "Invoice", quotation: "Quotation", proforma: "Proforma Invoice",
  purchase_order: "Purchase Order", delivery_challan: "Delivery Challan", credit_note: "Credit Note",
};

const emptyItem = () => ({ product_id: null, name: "", hsn: "", qty: 1, rate: 0, gst_rate: 18 });

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
    discount: 0,
    notes: "",
    terms: "Goods once sold will not be taken back. Payment due within 15 days.",
    status: "unpaid",
    template: "classic",
    amount_paid: 0,
  });

  useEffect(() => {
    Promise.all([
      api.get("/company"),
      api.get("/customers"),
      api.get("/products"),
    ]).then(([c, cust, prod]) => {
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
          items: data.items.length ? data.items.map((i) => ({ product_id: i.product_id, name: i.name, hsn: i.hsn, qty: i.qty, rate: i.rate, gst_rate: i.gst_rate })) : [emptyItem()],
          discount: data.discount || 0,
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

  const totals = useMemo(() => {
    let subtotal = 0, taxTotal = 0;
    doc.items.forEach((it) => {
      const taxable = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
      const tax = (taxable * (parseFloat(it.gst_rate) || 0)) / 100;
      subtotal += taxable;
      taxTotal += tax;
    });
    const cgst = isIntra ? taxTotal / 2 : 0;
    const sgst = isIntra ? taxTotal / 2 : 0;
    const igst = isIntra ? 0 : taxTotal;
    const total = subtotal - (parseFloat(doc.discount) || 0) + taxTotal;
    return { subtotal, cgst, sgst, igst, taxTotal, total };
  }, [doc.items, doc.discount, isIntra]);

  const updateItem = (idx, key, value) => {
    const items = [...doc.items];
    items[idx] = { ...items[idx], [key]: value };
    setDoc({ ...doc, items });
  };

  const pickProduct = (idx, productId) => {
    const p = products.find((x) => x.id === productId);
    const items = [...doc.items];
    if (p) {
      items[idx] = { product_id: p.id, name: p.name, hsn: p.hsn, qty: items[idx].qty || 1, rate: p.price, gst_rate: p.gst_rate };
    }
    setDoc({ ...doc, items });
  };

  const addItem = () => setDoc({ ...doc, items: [...doc.items, emptyItem()] });
  const removeItem = (idx) => setDoc({ ...doc, items: doc.items.filter((_, i) => i !== idx) });

  const save = async () => {
    if (!doc.items.some((i) => i.name.trim())) return toast.error("Add at least one item");
    setSaving(true);
    const payload = {
      ...doc,
      customer_id: doc.customer_id || null,
      discount: parseFloat(doc.discount) || 0,
      amount_paid: parseFloat(doc.amount_paid) || 0,
      items: doc.items.filter((i) => i.name.trim()).map((i) => ({
        product_id: i.product_id || null, name: i.name, hsn: i.hsn || "",
        qty: parseFloat(i.qty) || 0, rate: parseFloat(i.rate) || 0, gst_rate: parseFloat(i.gst_rate) || 0,
      })),
    };
    try {
      let res;
      if (isEdit) res = await api.put(`/documents/${id}`, payload);
      else res = await api.post("/documents", payload);
      toast.success(`${DOC_LABEL[docType]} saved`);
      navigate(`/documents/${res.data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
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
          <Label>Customer</Label>
          <Select value={doc.customer_id} onValueChange={(v) => setDoc({ ...doc, customer_id: v })}>
            <SelectTrigger data-testid="doc-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {customers.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No customers — add one first</div>}
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
        {selectedCustomer && (
          <div className="sm:col-span-3 text-xs text-muted-foreground bg-slate-50 rounded-lg p-3">
            <span className="font-semibold">{selectedCustomer.name}</span>
            {selectedCustomer.gstin && <> · GSTIN: {selectedCustomer.gstin}</>}
            {selectedCustomer.state && <> · {selectedCustomer.state}</>}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-iip-blue/10 text-iip-blue font-semibold">{isIntra ? "CGST + SGST" : "IGST"}</span>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-[#0F172A]">Items</h3>
          <Button variant="outline" size="sm" data-testid="add-item-btn" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>
        <div className="space-y-3">
          {doc.items.map((it, idx) => (
            <div key={idx} data-testid={`item-row-${idx}`} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-3 last:border-0">
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <Label className="text-xs">Item</Label>
                {products.length > 0 && (
                  <Select value={it.product_id || ""} onValueChange={(v) => pickProduct(idx, v)}>
                    <SelectTrigger className="h-9" data-testid={`item-product-${idx}`}><SelectValue placeholder="Pick product / type below" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Input data-testid={`item-name-${idx}`} className="h-9" placeholder="Item name" value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
              </div>
              <div className="col-span-4 sm:col-span-1 space-y-1">
                <Label className="text-xs">HSN</Label>
                <Input className="h-9" value={it.hsn} onChange={(e) => updateItem(idx, "hsn", e.target.value)} />
              </div>
              <div className="col-span-4 sm:col-span-1 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input className="h-9" type="number" data-testid={`item-qty-${idx}`} value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs">Rate</Label>
                <Input className="h-9" type="number" data-testid={`item-rate-${idx}`} value={it.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
              </div>
              <div className="col-span-5 sm:col-span-2 space-y-1">
                <Label className="text-xs">GST %</Label>
                <Select value={String(it.gst_rate)} onValueChange={(v) => updateItem(idx, "gst_rate", parseFloat(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-5 sm:col-span-1 space-y-1">
                <Label className="text-xs">Amount</Label>
                <p className="h-9 flex items-center text-sm font-semibold">{fmtCurrency((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0) * (1 + (parseFloat(it.gst_rate) || 0) / 100))}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <button data-testid={`remove-item-${idx}`} onClick={() => removeItem(idx)} className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{fmtCurrency(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <Input type="number" data-testid="doc-discount" value={doc.discount} onChange={(e) => setDoc({ ...doc, discount: e.target.value })} className="h-8 w-28 text-right" />
            </div>
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
