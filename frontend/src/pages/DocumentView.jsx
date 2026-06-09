import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmtCurrency, TEMPLATES } from "../lib/format";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import { Button } from "../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Printer, MessageCircle, Mail, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [template, setTemplate] = useState("classic");

  useEffect(() => {
    Promise.all([api.get(`/documents/${id}`), api.get("/company")]).then(([d, c]) => {
      setDoc(d.data);
      setCompany(c.data);
      setTemplate(d.data.template || "classic");
    });
  }, [id]);

  if (!doc || !company) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-iip-blue" /></div>;
  }

  const shareText = () => {
    const dt = { invoice: "Invoice", quotation: "Quotation", proforma: "Proforma Invoice" }[doc.type];
    return `${dt} ${doc.number} from ${company.name}\nAmount: ${fmtCurrency(doc.total)}\nDate: ${doc.date}\n${doc.customer?.name ? "For: " + doc.customer.name : ""}\n\nThank you for your business!\n${company.website || ""}`;
  };

  const whatsappShare = () => {
    const phone = (doc.customer?.phone || "").replace(/\D/g, "");
    const wa = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(shareText())}`
      : `https://wa.me/?text=${encodeURIComponent(shareText())}`;
    window.open(wa, "_blank");
  };

  const emailShare = () => {
    const subject = `${company.name} - ${doc.number}`;
    const to = doc.customer?.email || "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText())}`;
  };

  const docTypeLabel = { invoice: "invoice", quotation: "quotation", proforma: "proforma" }[doc.type];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4">
      {/* Action bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/${docTypeLabel === "invoice" ? "invoices" : docTypeLabel === "quotation" ? "quotations" : "proforma"}`)} data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="font-heading text-xl font-bold text-[#0F172A]">{doc.number}</h1>
            <p className="text-sm text-muted-foreground">{doc.customer?.name || "Walk-in"} · {fmtCurrency(doc.total)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-44" data-testid="template-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="edit-doc-btn" onClick={() => navigate(`/documents/${doc.type}/${doc.id}/edit`)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          <Button variant="outline" data-testid="whatsapp-btn" onClick={whatsappShare} className="text-green-600 border-green-200 hover:bg-green-50"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
          <Button variant="outline" data-testid="email-btn" onClick={emailShare}><Mail className="h-4 w-4 mr-1" /> Email</Button>
          <Button data-testid="print-btn" onClick={() => window.print()} className="bg-iip-blue hover:bg-[#1E3A8A]"><Printer className="h-4 w-4 mr-1" /> Print / PDF</Button>
        </div>
      </div>

      {/* Document */}
      <div className="overflow-x-auto bg-slate-100 rounded-xl p-2 sm:p-6 flex justify-center">
        <div className="shadow-lg">
          <InvoiceDocument doc={doc} company={company} template={template} />
        </div>
      </div>
    </div>
  );
}
