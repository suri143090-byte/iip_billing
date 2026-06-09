import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "../lib/api";
import { INDIAN_STATES, TEMPLATES } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Save, Building2, Landmark, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/company").then((r) => setForm(r.data)); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put("/company", form);
      setForm(r.data);
      toast.success("Company settings saved");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-iip-blue" />
        <h3 className="font-heading font-semibold text-[#0F172A]">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F172A]">Settings</h1>
          <p className="text-muted-foreground text-sm">Company profile used on invoices &amp; documents</p>
        </div>
        <Button data-testid="save-settings-btn" onClick={save} disabled={saving} className="bg-iip-orange hover:bg-[#C2410C]">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Section icon={Building2} title="Company Details">
        <div className="space-y-1.5 sm:col-span-2"><Label>Company Name</Label><Input data-testid="company-name" value={form.name} onChange={set("name")} /></div>
        <div className="space-y-1.5"><Label>GSTIN</Label><Input data-testid="company-gstin" value={form.gstin} onChange={set("gstin")} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={set("email")} /></div>
        <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={set("website")} /></div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
            <SelectTrigger data-testid="company-state"><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={set("address")} rows={2} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={set("logo_url")} placeholder="https://..." /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Signature Image URL</Label><Input value={form.signature_url} onChange={set("signature_url")} placeholder="https://..." /></div>
      </Section>

      <Section icon={Landmark} title="Bank & Payment Details">
        <div className="space-y-1.5"><Label>Bank Name</Label><Input value={form.bank_name} onChange={set("bank_name")} /></div>
        <div className="space-y-1.5"><Label>Account Number</Label><Input value={form.account_number} onChange={set("account_number")} /></div>
        <div className="space-y-1.5"><Label>IFSC Code</Label><Input value={form.ifsc} onChange={set("ifsc")} /></div>
        <div className="space-y-1.5"><Label>UPI ID (for QR)</Label><Input data-testid="company-upi" value={form.upi_id} onChange={set("upi_id")} placeholder="name@upi" /></div>
      </Section>

      <Section icon={FileText} title="Invoice Defaults">
        <div className="space-y-1.5">
          <Label>Default Template</Label>
          <Select value={form.default_template} onValueChange={(v) => setForm({ ...form, default_template: v })}>
            <SelectTrigger data-testid="default-template"><SelectValue /></SelectTrigger>
            <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Section>
    </div>
  );
}
