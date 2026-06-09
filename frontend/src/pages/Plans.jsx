import React from "react";
import { useAuth } from "../context/AuthContext";
import { Check, Crown, Zap, Gift } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free", name: "Free", price: "₹0", period: "forever", icon: Gift,
    color: "border-border", btn: "bg-slate-800 hover:bg-slate-900",
    features: ["Unlimited Quotations", "Unlimited Proforma Invoices", "Up to 10 Invoices / month", "Customer Management", "Product Management", "GST Calculation", "PDF Download", "Company Logo", "Basic Reports"],
  },
  {
    id: "pro", name: "Pro", price: "₹95", period: "/month", icon: Zap, popular: true,
    color: "border-iip-blue ring-2 ring-iip-blue", btn: "bg-iip-blue hover:bg-[#1E3A8A]",
    features: ["Everything in Free", "Unlimited Invoices", "Delivery Challan", "Purchase Orders", "Credit Notes", "Expense Management", "WhatsApp Sharing", "Email Sharing", "Payment Reminders", "Advanced Reports", "Remove Watermark"],
  },
  {
    id: "premium", name: "Premium", price: "₹289", period: "/month", icon: Crown,
    color: "border-iip-orange", btn: "bg-iip-orange hover:bg-[#C2410C]",
    features: ["Everything in Pro", "Multi-user Access", "Inventory Management", "E-Way Bill Support", "E-Invoice Support", "Barcode Scanner", "QR Payment Collection", "Customer/Supplier/Manufacturer Portals", "Analytics Dashboard", "Data Backup & Restore", "Priority Support"],
  },
];

export default function Plans() {
  const { user } = useAuth();

  const choose = (plan) => {
    if (plan.id === "free") return toast.info("You're on the Free plan.");
    toast.info("Razorpay checkout coming soon — payment integration will be wired up next.");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#0F172A]">Choose your plan</h1>
        <p className="text-muted-foreground mt-2">Upgrade to unlock unlimited invoices, sharing, inventory &amp; more.</p>
        <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-iip-blue/10 text-iip-blue font-semibold uppercase">
          Current plan: {user?.plan || "free"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => (
          <div key={plan.id} data-testid={`plan-${plan.id}`} className={`relative bg-white rounded-2xl border ${plan.color} shadow-sm p-6 flex flex-col`}>
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-iip-blue text-white font-semibold">Most Popular</span>
            )}
            <div className="flex items-center gap-2">
              <plan.icon className="h-5 w-5 text-iip-blue" />
              <h3 className="font-heading text-xl font-bold text-[#0F172A]">{plan.name}</h3>
            </div>
            <div className="mt-4 flex items-end gap-1">
              <span className="font-heading text-4xl font-bold text-[#0F172A]">{plan.price}</span>
              <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
            </div>
            <ul className="mt-6 space-y-2.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button data-testid={`choose-${plan.id}`} onClick={() => choose(plan)} disabled={user?.plan === plan.id} className={`mt-6 w-full ${plan.btn} h-11`}>
              {user?.plan === plan.id ? "Current Plan" : `Choose ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
