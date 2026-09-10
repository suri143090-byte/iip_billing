import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { fmtCurrency, fmtDate } from "../../lib/format";

// Convert number to Indian words (for amount in words)
function numberToWords(num) {
  num = Math.round(num);
  if (num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  };
  return inWords(num) + " Rupees Only";
}

const THEMES = {
  classic: { primary: "#1D4ED8", headerBg: "#FFFFFF", headerText: "#0F172A", tableHead: "#1D4ED8", tableHeadText: "#FFFFFF", border: "#1D4ED8", accent: "#1D4ED8" },
  modern: { primary: "#1D4ED8", headerBg: "#F8FAFC", headerText: "#0F172A", tableHead: "#F1F5F9", tableHeadText: "#0F172A", border: "#E2E8F0", accent: "#EA580C" },
  premium: { primary: "#1E3A8A", headerBg: "#1E3A8A", headerText: "#FFFFFF", tableHead: "#1E3A8A", tableHeadText: "#FFFFFF", border: "#1E3A8A", accent: "#EA580C" },
  industrial: { primary: "#0F172A", headerBg: "#0F172A", headerText: "#FFFFFF", tableHead: "#0F172A", tableHeadText: "#FFFFFF", border: "#0F172A", accent: "#EA580C" },
  blue: { primary: "#1D4ED8", headerBg: "#EFF6FF", headerText: "#1E3A8A", tableHead: "#1D4ED8", tableHeadText: "#FFFFFF", border: "#1D4ED8", accent: "#1D4ED8" },
};

const DOC_TITLE = {
  invoice: "TAX INVOICE", quotation: "QUOTATION", proforma: "PROFORMA INVOICE",
  purchase_order: "PURCHASE ORDER", delivery_challan: "DELIVERY CHALLAN", credit_note: "CREDIT NOTE",
};

export default function InvoiceDocument({ doc, company, template = "classic" }) {
  const t = THEMES[template] || THEMES.classic;
  const customer = doc.customer || {};
  const isIntra = doc.is_intra_state;
  const isDark = ["premium", "industrial"].includes(template);

  const upiString = company.upi_id
    ? `upi://pay?pa=${encodeURIComponent(company.upi_id)}&pn=${encodeURIComponent(company.name)}&am=${doc.total}&cu=INR`
    : "";
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    if (upiString) {
      QRCode.toDataURL(upiString, { width: 120, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(""));
    } else {
      setQrUrl("");
    }
  }, [upiString]);

  return (
    <div id="printable-invoice" className="bg-white text-[#0F172A] mx-auto" style={{ width: "210mm", maxWidth: "100%", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "12px" }}>
      {/* Header */}
      <div className="flex items-start justify-between p-6" style={{ background: t.headerBg, color: t.headerText, borderBottom: `3px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt="logo" style={{ height: 56, width: 56, objectFit: "contain" }} />
          ) : (
            <div style={{ height: 52, width: 52, borderRadius: 10, background: isDark ? "#FFFFFF22" : t.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Outfit'" }}>IIP</div>
          )}
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Outfit'", fontWeight: 700, fontSize: 18 }}>{company.name}</h2>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{company.address}</p>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{company.phone} · {company.email}</p>
            {company.gstin && <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>GSTIN: {company.gstin}</p>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1 style={{ margin: 0, fontFamily: "'Outfit'", fontWeight: 800, fontSize: 22, color: isDark ? "#fff" : t.accent }}>{DOC_TITLE[doc.type] || "INVOICE"}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}><strong>{doc.number}</strong></p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Date: {fmtDate(doc.date)}</p>
          {doc.due_date && <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Due: {fmtDate(doc.due_date)}</p>}
          {doc.place_of_supply && <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Place of Supply: {doc.place_of_supply}</p>}
        </div>
      </div>

      {/* Bill to / Ship to */}
      <div className="grid grid-cols-2" style={{ borderBottom: `1px solid #E2E8F0` }}>
        <div style={{ padding: "14px 24px", borderRight: "1px solid #E2E8F0" }}>
          <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Bill To</p>
          <p style={{ margin: "4px 0 0", fontWeight: 700 }}>{customer.name || "Walk-in Customer"}</p>
          {customer.contact_person && <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Attn: {customer.contact_person}</p>}
          <p style={{ margin: 0, fontSize: 11, color: "#475569", whiteSpace: "pre-line" }}>{customer.billing_address}</p>
          {customer.gstin && <p style={{ margin: 0, fontSize: 11 }}>GSTIN: {customer.gstin}</p>}
          {customer.phone && <p style={{ margin: 0, fontSize: 11 }}>Ph: {customer.phone}</p>}
          {customer.state && <p style={{ margin: 0, fontSize: 11 }}>State: {customer.state}</p>}
        </div>
        <div style={{ padding: "14px 24px" }}>
          <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Ship To</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", whiteSpace: "pre-line" }}>{customer.shipping_address || customer.billing_address || "—"}</p>
          {doc.place_of_supply && <p style={{ margin: "8px 0 0", fontSize: 11 }}><strong>Place of Supply:</strong> {doc.place_of_supply}</p>}
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: "0 24px", marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: t.tableHead, color: t.tableHeadText }}>
              <th style={th()}>Sr</th>
              <th style={{ ...th(), textAlign: "left" }}>Item</th>
              <th style={{ ...th(), textAlign: "left" }}>Description</th>
              <th style={th()}>HSN/SAC</th>
              <th style={th()}>Qty</th>
              <th style={{ ...th(), textAlign: "right" }}>Rate</th>
              <th style={{ ...th(), textAlign: "right" }}>Disc</th>
              <th style={{ ...th(), textAlign: "right" }}>Taxable</th>
              <th style={th()}>GST%</th>
              {isIntra ? (
                <>
                  <th style={{ ...th(), textAlign: "right" }}>CGST</th>
                  <th style={{ ...th(), textAlign: "right" }}>SGST</th>
                </>
              ) : (
                <th style={{ ...th(), textAlign: "right" }}>IGST</th>
              )}
              <th style={{ ...th(), textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => {
              const tax = it.tax || 0;
              const discAmt = it.discount_amount != null ? it.discount_amount : 0;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={td()}>{i + 1}</td>
                  <td style={{ ...td(), textAlign: "left", fontWeight: 600 }}>{it.name}</td>
                  <td style={{ ...td(), textAlign: "left", color: "#64748B", whiteSpace: "pre-line", fontSize: 9 }}>{it.description || "-"}</td>
                  <td style={td()}>{it.hsn || "-"}</td>
                  <td style={td()}>{it.qty}{it.unit ? ` ${it.unit}` : ""}</td>
                  <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(it.rate)}</td>
                  <td style={{ ...td(), textAlign: "right" }}>{discAmt > 0 ? fmtCurrency(discAmt) : "-"}</td>
                  <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(it.taxable)}</td>
                  <td style={td()}>{it.gst_rate}%</td>
                  {isIntra ? (
                    <>
                      <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(it.cgst != null ? it.cgst : tax / 2)}</td>
                      <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(it.sgst != null ? it.sgst : tax / 2)}</td>
                    </>
                  ) : (
                    <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(it.igst != null ? it.igst : tax)}</td>
                  )}
                  <td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{fmtCurrency(it.amount)}</td>
                </tr>
              );
            })}
            {(doc.charges || []).map((ch, i) => (
              <tr key={`ch-${i}`} style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <td style={td()}>{doc.items.length + i + 1}</td>
                <td style={{ ...td(), textAlign: "left", fontWeight: 600 }} colSpan={6}>{ch.label}</td>
                <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(ch.amount)}</td>
                <td style={td()}>{ch.gst_rate}%</td>
                {isIntra ? (
                  <>
                    <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency((ch.tax || 0) / 2)}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency((ch.tax || 0) / 2)}</td>
                  </>
                ) : (
                  <td style={{ ...td(), textAlign: "right" }}>{fmtCurrency(ch.tax || 0)}</td>
                )}
                <td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{fmtCurrency((ch.amount || 0) + (ch.tax || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + bank/qr */}
      <div className="grid grid-cols-2" style={{ padding: "16px 24px", gap: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Amount in Words</p>
          <p style={{ margin: "2px 0 12px", fontSize: 11, fontWeight: 600 }}>{numberToWords(doc.total)}</p>

          {(company.bank_name || company.account_number) && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Bank Details</p>
              {company.bank_name && <p style={{ margin: 0, fontSize: 11 }}>Bank: {company.bank_name}</p>}
              {company.account_number && <p style={{ margin: 0, fontSize: 11 }}>A/c: {company.account_number}</p>}
              {company.ifsc && <p style={{ margin: 0, fontSize: 11 }}>IFSC: {company.ifsc}</p>}
              {company.upi_id && <p style={{ margin: 0, fontSize: 11 }}>UPI: {company.upi_id}</p>}
            </div>
          )}
          {qrUrl && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Scan to Pay</p>
              <img src={qrUrl} alt="UPI QR" style={{ height: 100, width: 100 }} />
            </div>
          )}
        </div>

        <div>
          <table style={{ width: "100%", fontSize: 12 }}>
            <tbody>
              <tr><td style={trow()}>Subtotal (Taxable)</td><td style={{ ...trow(), textAlign: "right" }}>{fmtCurrency(doc.subtotal)}</td></tr>
              {doc.total_discount > 0 && <tr><td style={trow()}>Total Discount</td><td style={{ ...trow(), textAlign: "right", color: "#16A34A" }}>- {fmtCurrency(doc.total_discount)}</td></tr>}
              {doc.charges_total > 0 && <tr><td style={trow()}>Additional Charges</td><td style={{ ...trow(), textAlign: "right" }}>{fmtCurrency(doc.charges_total)}</td></tr>}
              {isIntra ? (
                <>
                  <tr><td style={trow()}>CGST</td><td style={{ ...trow(), textAlign: "right" }}>{fmtCurrency(doc.cgst)}</td></tr>
                  <tr><td style={trow()}>SGST</td><td style={{ ...trow(), textAlign: "right" }}>{fmtCurrency(doc.sgst)}</td></tr>
                </>
              ) : (
                <tr><td style={trow()}>IGST</td><td style={{ ...trow(), textAlign: "right" }}>{fmtCurrency(doc.igst)}</td></tr>
              )}
              {doc.discount > 0 && <tr><td style={trow()}>Extra Discount</td><td style={{ ...trow(), textAlign: "right" }}>- {fmtCurrency(doc.discount)}</td></tr>}
              <tr>
                <td style={{ padding: "10px 8px", fontWeight: 800, fontFamily: "'Outfit'", background: t.tableHead, color: t.tableHeadText }}>Grand Total</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, fontFamily: "'Outfit'", background: t.tableHead, color: t.tableHeadText }}>{fmtCurrency(doc.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: terms + signature */}
      <div className="grid grid-cols-2" style={{ padding: "12px 24px 24px", gap: 24, borderTop: "1px solid #E2E8F0" }}>
        <div>
          {doc.notes && (<><p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Notes</p><p style={{ margin: "2px 0 10px", fontSize: 11 }}>{doc.notes}</p></>)}
          {doc.terms && (<><p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#64748B", fontWeight: 700 }}>Terms &amp; Conditions</p><p style={{ margin: "2px 0 0", fontSize: 11, whiteSpace: "pre-line" }}>{doc.terms}</p></>)}
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-end" }}>
          {company.signature_url && <img src={company.signature_url} alt="signature" style={{ height: 50, marginBottom: 4 }} />}
          <div style={{ borderTop: "1px solid #94A3B8", paddingTop: 4, minWidth: 160 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>For {company.name}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748B" }}>Authorized Signatory</p>
          </div>
        </div>
      </div>

      <div style={{ background: t.primary, color: "#fff", textAlign: "center", padding: "8px", fontSize: 10 }}>
        Thank you for your business! · {company.website}
      </div>
    </div>
  );
}

const th = () => ({ padding: "8px 6px", textAlign: "center", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 });
const td = () => ({ padding: "7px 6px", textAlign: "center", color: "#334155" });
const trow = () => ({ padding: "5px 8px", color: "#475569" });
