import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FileSpreadsheet, Receipt, Settings as SettingsIcon, Crown, Building2,
  Truck, FileMinus, Wallet, Warehouse, ShoppingCart, Shield, LogOut, ChevronRight,
} from "lucide-react";

const groups = [
  {
    title: "Documents",
    items: [
      { label: "Quotations", icon: FileSpreadsheet, to: "/quotations" },
      { label: "Proforma Invoices", icon: Receipt, to: "/proforma" },
      { label: "Purchase Orders", icon: ShoppingCart, to: "/purchase-orders" },
      { label: "Delivery Challans", icon: Truck, to: "/delivery-challans" },
      { label: "Credit Notes", icon: FileMinus, to: "/credit-notes" },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Expenses", icon: Wallet, to: "/expenses" },
      { label: "Suppliers", icon: Building2, to: "/suppliers" },
      { label: "Inventory", icon: Warehouse, to: "/inventory" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Upgrade Plan", icon: Crown, to: "/plans", accent: true },
      { label: "Settings", icon: SettingsIcon, to: "/settings" },
    ],
  },
];

export default function More() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-br from-iip-blue to-[#1E3A8A] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-heading font-bold text-lg">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-heading font-bold">{user?.name}</p>
            <p className="text-xs text-white/80">{user?.email}</p>
          </div>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-white/20 font-semibold uppercase">{user?.plan}</span>
        </div>
      </div>

      {user?.role === "admin" && (
        <button data-testid="more-admin" onClick={() => navigate("/admin")} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-iip-orange/30 text-left">
          <Shield className="h-5 w-5 text-iip-orange" />
          <span className="font-medium text-[#0F172A]">Admin Panel</span>
          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </button>
      )}

      {groups.map((g) => (
        <div key={g.title}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">{g.title}</p>
          <div className="bg-white rounded-xl border border-border divide-y divide-border overflow-hidden">
            {g.items.map((it) => (
              <button key={it.label} data-testid={`more-${it.label.toLowerCase().replace(/\s/g, "-")}`} onClick={() => navigate(it.to)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 text-left">
                <it.icon className={`h-5 w-5 ${it.accent ? "text-iip-orange" : "text-iip-blue"}`} />
                <span className="font-medium text-[#0F172A]">{it.label}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <button data-testid="more-logout" onClick={() => { logout(); navigate("/login"); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-destructive font-medium hover:bg-red-50">
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </div>
  );
}
