import React from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, FileText, FileSpreadsheet, Users, Package,
  Settings as SettingsIcon, Crown, LogOut, Home, Receipt, MoreHorizontal,
  Truck, FileMinus, Wallet, Warehouse, BarChart3, Building2,
} from "lucide-react";
import { Button } from "../components/ui/button";

const sidebarNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/quotations", label: "Quotations", icon: FileSpreadsheet },
  { to: "/proforma", label: "Proforma", icon: Receipt },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
];

const sidebarSoon = [
  { label: "Purchase Orders", icon: Truck },
  { label: "Delivery Challan", icon: Truck },
  { label: "Credit Notes", icon: FileMinus },
  { label: "Expenses", icon: Wallet },
  { label: "Inventory", icon: Warehouse },
  { label: "Reports", icon: BarChart3 },
  { label: "Suppliers", icon: Building2 },
];

const bottomNav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/invoices", label: "Bills", icon: Receipt },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Parties", icon: Users },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white z-40">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-iip-blue flex items-center justify-center font-heading font-bold text-lg">
              IIP
            </div>
            <div>
              <p className="font-heading font-bold leading-tight">IIP Billing</p>
              <p className="text-[10px] tracking-widest text-iip-orange font-semibold uppercase">Pro</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-iip-blue text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Coming Soon
            </p>
            {sidebarSoon.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 cursor-not-allowed"
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </div>
            ))}
          </div>
        </nav>
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <NavLink
            to="/plans"
            data-testid="nav-plans"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-iip-orange/90 hover:bg-iip-orange transition"
          >
            <Crown className="h-[18px] w-[18px]" /> Upgrade Plan
          </NavLink>
          <NavLink
            to="/settings"
            data-testid="nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? "bg-iip-blue text-white" : "text-slate-300 hover:bg-white/10"
              }`
            }
          >
            <SettingsIcon className="h-[18px] w-[18px]" /> Settings
          </NavLink>
        </div>
      </aside>

      {/* Topbar */}
      <header className="md:pl-64 sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-iip-blue flex items-center justify-center font-heading font-bold text-white text-sm">
              IIP
            </div>
            <span className="font-heading font-bold text-[#0F172A]">Billing Pro</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-iip-blue/10 text-iip-blue font-semibold uppercase tracking-wide">
              {user?.plan || "free"}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-iip-blue/10 text-iip-blue flex items-center justify-center font-semibold">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-[#0F172A]">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              data-testid="logout-btn"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-64 pb-24 md:pb-8">
        <div className="fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around items-stretch h-16 z-50">
        {bottomNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={`bottomnav-${item.label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 transition ${
                isActive ? "text-iip-blue" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
