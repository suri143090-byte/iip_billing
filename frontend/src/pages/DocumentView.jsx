import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import api, { formatApiErrorDetail } from "../lib/api";
import { fmtCurrency, TEMPLATES } from "../lib/format";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import { Button } from "../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Printer, Download, MessageCircle, Mail, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BACK_PATH = {
  invoice: "/invoices", quotation: "/quotations", proforma: "/proforma",
  purchase_order: "/purchase-orders", delivery_challan: "/delivery-challans", credit_note: "/credit-notes",
};
const TYPE_LABEL = {
  invoice: "Invoice", quotation: "Quotation", proforma: "Proforma Invoice",
  purchase_order: "Purchase Order", delivery_challan: "Delivery Challan", credit_note: "Credit Note",
};

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [template, setTemplate] = useState("classic");
  const [downloading, setDownloading] = useState(false);

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
    const dt = TYPE_LABEL[doc.type];
    return `${dt} ${doc.number} from ${company.name}\nAmount: ${fmtCurrency(doc.total)}\nDate: ${doc.date}\n${doc.customer?.name ? "For: " + doc.customer.name : ""}\n\nThank you for your business!\n${company.website || ""}`;
  };

  const whatsappShare = () => {
    const phone = (doc.customer?.phone || "").replace(/\D/g, "");
    const wa = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(shareText())}`
      : `https://wa.me/?text=${encodeURIComponent(shareText())}`;
    window.open(wa, "_blank");
  };

  const emailShare = async () => {
    try {
      const res = await api.post(`/documents/${doc.id}/email`, {});
      toast.success(res.data.message || "Email sent");
    } catch (e) {
      const detail = formatApiErrorDetail(e.response?.data?.detail);
      // Fallback to mailto if email service not configured
      const subject = `${company.name} - ${doc.number}`;
      const to = doc.customer?.email || "";
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText())}`;
      if (detail) toast.message("Opening email app", { description: detail });
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const el = document.getElementById("printable-invoice");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position -= 297;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
        heightLeft -= 297;
      }
      pdf.save(`${doc.number.replace(/\//g, "-")}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("Could not generate PDF. Use Print instead.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4">
      {/* Action bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(BACK_PATH[doc.type] || "/invoices")} data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></Button>
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
          <Button variant="outline" data-testid="download-btn" onClick={downloadPdf} disabled={downloading}>{downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} PDF</Button>
          <Button data-testid="print-btn" onClick={() => window.print()} className="bg-iip-blue hover:bg-[#1E3A8A]"><Printer className="h-4 w-4 mr-1" /> Print</Button>
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
