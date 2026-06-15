"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Receipt,
  Car,
  ChevronDown,
  Menu,
  Building2,
  ArrowLeft,
} from "lucide-react";

interface CostCenter {
  cost_code: string;
  company?: string;
  company_name?: string;
  trading_name?: string;
  legal_names?: string;
}

interface FCSidebarContextValue {
  accounts: string;
  accountsArray: string[];
  costCenters: CostCenter[];
  selectedCostCenter: CostCenter | null;
  setSelectedCostCenter: (cc: CostCenter) => void;
  loading: boolean;
}

const FCSidebarContext = createContext<FCSidebarContextValue>({
  accounts: "",
  accountsArray: [],
  costCenters: [],
  selectedCostCenter: null,
  setSelectedCostCenter: () => {},
  loading: true,
});

export const useFCSidebar = () => useContext(FCSidebarContext);

const NAV_ITEMS = [
  { label: "Dashboard", href: "", icon: LayoutDashboard },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Vehicle Validation", href: "/vehicles", icon: Car },
  { label: "Client Pricing", href: "/pricing", icon: Receipt },
];

function CostCenterDropdown({
  costCenters,
  selected,
  onSelect,
}: {
  costCenters: CostCenter[];
  selected: CostCenter | null;
  onSelect: (cc: CostCenter) => void;
}) {
  const [open, setOpen] = useState(false);

  const displayName = selected?.cost_code === "all"
    ? "All"
    : selected
      ? selected.trading_name || selected.company_name || selected.company || selected.cost_code
      : "Select Cost Center";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-white text-sm transition-colors ${
          open ? "bg-blue-500 ring-2 ring-blue-300" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onSelect({ cost_code: "all", trading_name: "All", company: "All", company_name: "All" } as CostCenter);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                selected?.cost_code === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              <div className="truncate font-medium">All</div>
              <div className="text-xs text-gray-500 truncate">All cost centers</div>
            </button>
            {costCenters.map((cc) => (
              <button
                key={cc.cost_code}
                onClick={() => {
                  onSelect(cc);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                  selected?.cost_code === cc.cost_code ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                }`}
              >
                <div className="truncate font-medium">{cc.trading_name || cc.company_name || cc.company || cc.cost_code}</div>
                <div className="text-xs text-gray-500 truncate">{cc.cost_code}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function FCSidebarLayout({
  children,
  accounts,
}: {
  children: React.ReactNode;
  accounts: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>({ cost_code: "all", trading_name: "All", company: "All", company_name: "All" });
  const [loading, setLoading] = useState(true);

  const accountsArray = accounts ? accounts.split(",").filter(Boolean) : [];
  const basePath = `/protected/fc/client/${accounts}`;

  useEffect(() => {
    if (!accounts) return;
    let cancelled = false;

    const fetchCostCenters = async () => {
      try {
        const params = new URLSearchParams();
        params.set("all_new_account_numbers", accounts);
        const res = await fetch(`/api/cost-centers/client?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const centers = Array.isArray(data?.costCenters) ? data.costCenters : [];
        setCostCenters(centers);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCostCenters();
    return () => { cancelled = true; };
  }, [accounts]);

  const handleCostCenterSelect = useCallback((cc: CostCenter) => {
    setSelectedCostCenter(cc);
  }, []);

  const isActive = (href: string) => {
    const full = href ? `${basePath}${href}` : basePath;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(full);
  };

  return (
    <FCSidebarContext.Provider
      value={{ accounts, accountsArray, costCenters, selectedCostCenter, setSelectedCostCenter: handleCostCenterSelect, loading }}
    >
      <div className="flex h-[100dvh] overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar - fixed height, matches main navbar color */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-blue-600 text-white transition-all duration-300 max-h-[100dvh] ${
            sidebarOpen ? "w-56" : "w-14"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Client Name */}
          <div className="px-3 py-3 border-b border-white/10 shrink-0">
            {sidebarOpen ? (
              <p className="text-sm font-bold text-white truncate">
                {selectedCostCenter?.cost_code === "all"
                  ? `${costCenters[0]?.trading_name || costCenters[0]?.company_name || costCenters[0]?.company || "Client"} - All Cost Centers`
                  : selectedCostCenter?.trading_name || selectedCostCenter?.company_name || selectedCostCenter?.company || "Client"}
              </p>
            ) : (
              <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center mx-auto">
                <Building2 className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const href = item.href ? `${basePath}${item.href}` : basePath;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium transition-all ${
                    active
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Cost Center Switcher */}
          {sidebarOpen && (
            <div className="px-2 pb-2 shrink-0">
              <CostCenterDropdown
                costCenters={costCenters}
                selected={selectedCostCenter}
                onSelect={handleCostCenterSelect}
              />
            </div>
          )}

          {/* Back + links */}
          <div className="px-2 py-2 border-t border-white/10 space-y-0.5 shrink-0">
            <Link
              href="/protected/fc"
              className="flex items-center gap-2 px-2.5 py-2 rounded text-xs text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Back to FC</span>}
            </Link>
          </div>
        </aside>

        {/* Main content - no header */}
        <div className="flex flex-col flex-1 min-w-0 h-[100dvh] overflow-hidden">
          {/* Mobile toggle bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 shrink-0 lg:hidden">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 rounded hover:bg-gray-100">
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 truncate">
              {selectedCostCenter?.trading_name || selectedCostCenter?.company_name || selectedCostCenter?.company || ""}
            </span>
          </div>

          {/* Client Info Bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
            <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">
                {selectedCostCenter?.cost_code === "all"
                  ? `${costCenters[0]?.trading_name || costCenters[0]?.company_name || costCenters[0]?.company || "Client"} - All Cost Centers`
                  : selectedCostCenter?.trading_name || selectedCostCenter?.company_name || selectedCostCenter?.company || "Client"}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {selectedCostCenter?.cost_code === "all"
                  ? "All Cost Centers"
                  : selectedCostCenter?.cost_code || ""}
              </p>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </FCSidebarContext.Provider>
  );
}
