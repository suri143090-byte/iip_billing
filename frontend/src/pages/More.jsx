import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FileSpreadsheet, Receipt, Settings as SettingsIcon, Crown, Building2,
  Truck, FileMinus, Wallet, Warehouse, BarChart3, LogOut, ChevronRight,
} from "lucide-react";

const items = [
  { label: "Quotations", icon: FileSpreadsheet, to: "/quotations" },
  { label: "Proforma Invoices", icon: Receipt, to: "/proforma" },
  { label: "Upgrade Plan", icon: Crown, to: "/plans", accent: true },
  { label: "Settings", icon: SettingsIcon, to: "/settings" },
];

const soon = [
  { label: "Purchase Orders", icon: Truck },
  { label: "Delivery Challan", icon: Truck },
  { label: "Credit Notes", icon: FileMinus },
  { label: "Expenses", icon: Wallet },
  { label: "Inventory", icon: Warehouse },
  { label: "Reports", icon: BarChart3 },
  { label: "Suppliers", icon: Building2 },
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

      <div className="bg-white rounded-xl border border-border divide-y divide-border overflow-hidden">
        {items.map((it) => (
          <button key={it.label} data-testid={`more-${it.label.toLowerCase().replace(/\s/g, "-")}`} onClick={() => navigate(it.to)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 text-left">
            <it.icon className={`h-5 w-5 ${it.accent ? "text-iip-orange" : "text-iip-blue"}`} />
            <span className="font-medium text-[#0F172A]">{it.label}</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">Coming Soon</p>
        <div className="bg-white rounded-xl border border-border divide-y divide-border overflow-hidden">
          {soon.map((it) => (
            <div key={it.label} className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground">
              <it.icon className="h-5 w-5" />
              <span className="font-medium">{it.label}</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted">Soon</span>
            </div>
          ))}
        </div>
      </div>

      <button data-testid="more-logout" onClick={() => { logout(); navigate("/login"); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-destructive font-medium hover:bg-red-50">
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </div>
  );
}
