"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GlobalView from "@/components/ui-personal/global-view";
import { useClients } from "@/contexts/ClientsContext";
import { AccountsProvider } from "@/contexts/AccountsContext";
import AccountsClientsSection from "@/components/accounts/AccountsClientsSection";
import JobsTab from "@/components/fc/JobsTab";
import AnnuityBillingTab from "@/components/fc/AnnuityBillingTab";
import FCQuotesPage from "@/app/protected/fc/quotes/page";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Building2,
  Globe,
  Building,
  FileText,
  CheckCircle,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Briefcase,
  Receipt,
} from "lucide-react";
import CreateCalibrationJobModal from '@/components/master/CreateCalibrationJobModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const FC_TAB_IDS = ["global", "companies", "client-info", "jobs", "annuity-billing", "quotes"];

const normalizeFcTab = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return FC_TAB_IDS.includes(raw) ? raw : null;
};

function AccountsDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { 
    companyGroups, 
    contactInfo, 
    loading, 
    loadingContacts, 
    totalCount, 
    fetchCompanyGroups, 
    isDataLoaded 
  } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [fcFilter, setFcFilter] = useState("");
  const isFirstRender = useRef(true);
  const [fcUserOptions, setFcUserOptions] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTargetGroup, setAssignTargetGroup] = useState(null);
  const [assignSelections, setAssignSelections] = useState({});
  const [assignLoadingId, setAssignLoadingId] = useState(null);
  const [assignCostCenters, setAssignCostCenters] = useState([]);
  const [assignCostCentersLoading, setAssignCostCentersLoading] = useState(false);
  const [assignBulkFcId, setAssignBulkFcId] = useState('');
  const [assignSelectedAll, setAssignSelectedAll] = useState(false);
  const [assignCheckedIds, setAssignCheckedIds] = useState({});
  const [assignBulkLoading, setAssignBulkLoading] = useState(false);
  const costCentersCacheRef = useRef(new Map());
  const getInitialTab = () => {
    if (typeof window === "undefined") return "global";
    const stored = normalizeFcTab(window.localStorage.getItem("fc_active_tab"));
    return stored || "global";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const lastCompaniesRefreshRef = useRef(0);

  

  const maybeRefreshCompanyGroups = async (force = false) => {
    if (activeTab !== "companies") return;

    const now = Date.now();
    const isFresh = now - lastCompaniesRefreshRef.current < 60000;

    if (!force && isDataLoaded && isFresh) {
      return;
    }

    await fetchCompanyGroups(searchTerm, fcFilter);
    lastCompaniesRefreshRef.current = Date.now();
  };

  const setActiveTabWithPersistence = useCallback(
    (nextTab) => {
      const normalized = normalizeFcTab(nextTab) || "global";
      setActiveTab(normalized);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("fc_active_tab", normalized);
      }

      const params = new URLSearchParams(searchParams.toString());
      if (normalized === "global") {
        params.delete("tab");
      } else {
        params.set("tab", normalized);
      }

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const queryTab = normalizeFcTab(searchParams.get("tab"));
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [searchParams]);



  // Debounce searchTerm to avoid firing API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch company groups when debounced search or FC filter changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (activeTab === 'companies') {
      fetchCompanyGroups(debouncedSearchTerm, fcFilter, true);
    }
  }, [debouncedSearchTerm, fcFilter, activeTab, fetchCompanyGroups]);

  // Load FC users for the filter dropdown
  useEffect(() => {
    const fetchFcUsers = async () => {
      try {
        const response = await fetch('/api/fc/users', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setFcUserOptions(data.fcUsers || []);
        }
      } catch (err) {
        console.error('Failed to load FC users for filter:', err);
      }
    };
    fetchFcUsers();
  }, []);

  // Initial load
  useEffect(() => {
    if (activeTab === 'companies') {
      maybeRefreshCompanyGroups(true);
    }
  }, [activeTab, pathname]);

  useEffect(() => {
    if (activeTab !== 'companies') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeRefreshCompanyGroups(false);
      }
    };

    const handleWindowFocus = () => {
      maybeRefreshCompanyGroups(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [activeTab, isDataLoaded, fetchCompanyGroups]);

  const handleNewAccount = () => {
    router.push('/protected/fc/add-account');
  };

  const resolveAccountNumbers = (group) => {
    const rawAccountNumbers = [
      group?.all_new_account_numbers,
      group?.all_account_numbers,
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
      .find(Boolean);

    return rawAccountNumbers || "";
  };

  const handleViewDetails = (group) => {
    const accountNumbers = resolveAccountNumbers(group);

    if (!accountNumbers) {
      console.log('⚠️ [FC DASHBOARD] No account numbers found for group:', group);
      toast.error("No account numbers found for this client.");
      return;
    }

    const encodedAccountNumbers = encodeURIComponent(accountNumbers);
    router.push(`/protected/fc/clients/cost-centers?accounts=${encodedAccountNumbers}`);
  };

  const fetchCostCentersForAssign = async (group) => {
    const accountNumbers = resolveAccountNumbers(group);
    if (!accountNumbers) {
      toast.error("No account numbers found for this client.");
      return;
    }

    setAssignCostCentersLoading(true);
    setAssignTargetGroup(group);
    setAssignDialogOpen(true);
    setAssignSelections({});
    setAssignBulkFcId('');
    setAssignSelectedAll(false);
    setAssignCheckedIds({});

    try {
      // Check cache
      const cacheKey = accountNumbers;
      const cached = costCentersCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < 30000) {
        setAssignCostCenters(cached.data);
        setAssignCostCentersLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set('all_new_account_numbers', accountNumbers);
      params.set('skip_lock_info', 'true');
      if (group?.company_group) params.set('company_name', group.company_group);
      if (group?.legal_names) params.set('legal_name', group.legal_names);

      const response = await fetch(`/api/cost-centers/client?${params.toString()}`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error("Failed to fetch cost centers");
      }

      const data = await response.json();
      const centers = Array.isArray(data?.costCenters) ? data.costCenters : Array.isArray(data) ? data : [];
      costCentersCacheRef.current.set(cacheKey, { data: centers, cachedAt: Date.now() });
      setAssignCostCenters(centers);
    } catch (error) {
      console.error("Error fetching cost centers for assign:", error);
      toast.error("Failed to load cost centers");
      setAssignDialogOpen(false);
      setAssignTargetGroup(null);
    } finally {
      setAssignCostCentersLoading(false);
    }
  };

  const handleAssignFcToCostCenter = async (costCenterId, fcUserId) => {
    if (!fcUserId) return;

    try {
      setAssignLoadingId(costCenterId);
      const response = await fetch("/api/cost-centers/assign-fc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costCenterId,
          fcUserId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to assign FC");
      }

      toast.success("FC assigned successfully");
      setAssignCostCenters((prev) =>
        prev.map((cc) =>
          cc.id === costCenterId ? { ...cc, fc_id: fcUserId } : cc,
        ),
      );
      setAssignSelections((prev) => {
        const next = { ...prev };
        delete next[costCenterId];
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign FC");
    } finally {
      setAssignLoadingId(null);
    }
  };

  const handleBulkAssign = async () => {
    const checkedKeys = Object.keys(assignCheckedIds);
    if (checkedKeys.length === 0) {
      toast.error("No cost centers selected");
      return;
    }

    const assignments = checkedKeys
      .map((ccKey) => ({
        costCenterId: ccKey,
        fcUserId: assignSelections[ccKey] || assignBulkFcId,
      }))
      .filter((a) => a.fcUserId);

    if (assignments.length === 0) {
      toast.error("Select an FC user for the selected cost centers");
      return;
    }

    try {
      setAssignBulkLoading(true);
      const response = await fetch("/api/cost-centers/assign-fc/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to assign FCs");
      }

      toast.success(`${assignments.length} cost center(s) assigned successfully`);

      const updatedIds = new Set(assignments.map((a) => a.costCenterId));
      setAssignCostCenters((prev) =>
        prev.map((cc) =>
          updatedIds.has(cc.id) || updatedIds.has(cc.cost_code)
            ? { ...cc, fc_id: assignments.find((a) => a.costCenterId === (cc.id || cc.cost_code))?.fcUserId }
            : cc,
        ),
      );
      setAssignSelections((prev) => {
        const next = { ...prev };
        assignments.forEach((a) => delete next[a.costCenterId]);
        return next;
      });
      setAssignCheckedIds({});
      setAssignSelectedAll(false);
      setAssignBulkFcId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign FCs");
    } finally {
      setAssignBulkLoading(false);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'global':
        return <GlobalView />;
      

      case 'companies':
        return (
          <>
            {/* Search and Filter */}
            <div className="flex sm:flex-row flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <select
                value={fcFilter}
                onChange={(e) => setFcFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All FCs</option>
                {fcUserOptions.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.email}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={async () => {
                  await maybeRefreshCompanyGroups(true);
                }}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="text-sm text-gray-600">
                Showing {companyGroups.length} of {totalCount} clients
                {searchTerm && ` matching "${searchTerm}"`}
                {loadingContacts && (
                  <span className="ml-2 text-blue-600">
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                    Loading contact info...
                  </span>
                )}
                {isDataLoaded && (
                  <span className="ml-2 text-green-600">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Data loaded
                  </span>
                )}
              </div>
            )}

            {/* Clients Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex flex-col items-center">
                            <Building2 className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-gray-500">No clients found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      companyGroups.map((group) => {
                        const contact = contactInfo[group.id];
                        return (
                          <TableRow key={group.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {group.company_group || 'N/A'}
                                  </Badge>
                                  {group.validate && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Validated
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-semibold text-sm">{group.legal_names || 'N/A'}</div>
                                <div className="text-xs text-gray-500">
                                  {group.legal_names_list && group.legal_names_list.length > 0 
                                    ? `${group.legal_names_list.length} legal entities`
                                    : 'No legal names'
                                  }
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {loadingContacts ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm text-gray-500">Loading...</span>
                                </div>
                              ) : contact ? (
                                <div className="space-y-1">
                                  {contact.cell_no && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <span>{contact.cell_no}</span>
                                    </div>
                                  )}
                                  {contact.switchboard && !contact.cell_no && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <span>{contact.switchboard}</span>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-3 h-3 text-gray-400" />
                                      <span className="truncate max-w-[200px]" title={contact.email}>
                                        {contact.email}
                                      </span>
                                    </div>
                                  )}
                                  {contact.branch_person_email && !contact.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-3 h-3 text-gray-400" />
                                      <span className="truncate max-w-[200px]" title={contact.branch_person_email}>
                                        {contact.branch_person_email}
                                      </span>
                                    </div>
                                  )}
                                  {contact.physical_address_1 && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                                      <div className="truncate max-w-[200px]">
                                        <div title={`${contact.physical_address_1}${contact.physical_area ? `, ${contact.physical_area}` : ''}${contact.physical_province ? `, ${contact.physical_province}` : ''}`}>
                                          {contact.physical_address_1}
                                          {contact.physical_area && `, ${contact.physical_area}`}
                                          {contact.physical_province && `, ${contact.physical_province}`}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!contact.cell_no && !contact.switchboard && !contact.email && !contact.branch_person_email && !contact.physical_address_1 && (
                                    <span className="text-sm text-gray-400">No contact info</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No contact info</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    fetchCostCentersForAssign(group);
                                  }}
                                  className="text-xs h-8"
                                >
                                  Assign FC
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const accountNumbers = resolveAccountNumbers(group);
                                    if (!accountNumbers) {
                                      toast.error("No account numbers found for this client.");
                                      return;
                                    }
                                    router.push(`/protected/fc/validate?account=${encodeURIComponent(accountNumbers)}`);
                                  }}
                                  className="text-xs h-8"
                                >
                                  Vehicles
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleViewDetails(group);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Empty State */}
            {companyGroups.length === 0 && !loading && (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No clients found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm
                        ? "Try adjusting your search criteria."
                        : `Get started by creating your first client.`
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Client
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Assign FC Dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={(open) => {
            if (!open && !assignLoadingId && !assignBulkLoading) {
              setAssignDialogOpen(false);
              setAssignTargetGroup(null);
              setAssignCostCenters([]);
              setAssignSelections({});
              setAssignBulkFcId('');
              setAssignSelectedAll(false);
              setAssignCheckedIds({});
            }
          }}>
            <DialogContent
              className="sm:max-w-2xl"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Assign FC to Cost Centers</DialogTitle>
                <DialogDescription>
                  {assignTargetGroup?.company_group
                    ? `Manage FC assignment for ${assignTargetGroup.company_group}`
                    : "Manage FC assignment for cost centers"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {assignCostCentersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : assignCostCenters.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No cost centers found for this client.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      {(assignCostCenters.some((cc) => !cc.fc_id && cc.id)) ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="select-all-cc"
                              checked={assignSelectedAll}
                              onCheckedChange={(checked) => {
                                const isChecked = !!checked;
                                setAssignSelectedAll(isChecked);
                                const ccKey = (cc) => cc.id || cc.cost_code;
                                if (isChecked) {
                                  setAssignCheckedIds((prev) => {
                                    const next = { ...prev };
                                    assignCostCenters.forEach((cc) => {
                                      if (!cc.fc_id && cc.id) {
                                        next[ccKey(cc)] = true;
                                      }
                                    });
                                    return next;
                                  });
                                } else {
                                  setAssignCheckedIds((prev) => {
                                    const next = { ...prev };
                                    assignCostCenters.forEach((cc) => {
                                      if (!cc.fc_id && cc.id) {
                                        delete next[ccKey(cc)];
                                      }
                                    });
                                    return next;
                                  });
                                }
                              }}
                            />
                            <label htmlFor="select-all-cc" className="text-xs font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <select
                            value={assignBulkFcId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAssignBulkFcId(val);
                              if (val && assignSelectedAll) {
                                setAssignSelections((prev) => {
                                  const next = { ...prev };
                                  assignCostCenters.forEach((cc) => {
                                    if (!cc.fc_id && cc.id) {
                                      next[cc.id || cc.cost_code] = val;
                                    }
                                  });
                                  return next;
                                });
                              }
                            }}
                            className="border border-gray-300 rounded text-xs h-8 px-2 flex-1 max-w-[200px]"
                          >
                            <option value="">Assign all to FC...</option>
                            {fcUserOptions.map((fc) => (
                              <option key={fc.id} value={fc.id}>{fc.email}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={assignBulkLoading || !assignSelectedAll || !assignBulkFcId}
                            onClick={handleBulkAssign}
                            className="text-xs h-8"
                          >
                            {assignBulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign All"}
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md text-sm">
                          <CheckCircle className="w-4 h-4" />
                          All cost centers are assigned
                        </div>
                      )}
                    </div>
                    <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                      {assignCostCenters.map((cc) => {
                        const fcUser = fcUserOptions.find((u) => u.id === cc.fc_id);
                        const ccKey = cc.id || cc.cost_code;
                        const selectedFc = assignSelections[ccKey] || "";
                        const isAssigning = assignLoadingId === ccKey;
                        const isUnassigned = !cc.fc_id && !!cc.id;
                        return (
                          <div key={ccKey} className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              {isUnassigned && (
                                <Checkbox
                                  checked={!!assignCheckedIds[ccKey]}
                                  onCheckedChange={(checked) =>
                                    setAssignCheckedIds((prev) => {
                                      const next = { ...prev };
                                      if (checked) {
                                        next[ccKey] = true;
                                      } else {
                                        delete next[ccKey];
                                      }
                                      return next;
                                    })
                                  }
                                />
                              )}
                              <div>
                                <div className="font-medium text-sm">{cc.company || "N/A"}</div>
                                <div className="text-gray-500 text-xs">{cc.cost_code || ""}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cc.fc_id ? (
                                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                  {fcUser?.email || "Assigned"}
                                </span>
                              ) : !cc.id ? (
                                <span className="text-xs text-gray-400 italic">Not in DB yet</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedFc}
                                    onChange={(e) => setAssignSelections((prev) => ({ ...prev, [ccKey]: e.target.value }))}
                                    className="border border-gray-300 rounded text-xs h-8 px-2"
                                  >
                                    <option value="">Select FC...</option>
                                    {fcUserOptions.map((fc) => (
                                      <option key={fc.id} value={fc.id}>{fc.email}</option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    disabled={!selectedFc || isAssigning}
                                    onClick={() => handleAssignFcToCostCenter(ccKey, selectedFc)}
                                    className="text-xs h-8"
                                  >
                                    {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false);
                    setAssignTargetGroup(null);
                    setAssignCostCenters([]);
                    setAssignSelections({});
                    setAssignBulkFcId('');
                    setAssignSelectedAll(false);
                    setAssignCheckedIds({});
                  }}
                  disabled={!!assignLoadingId || assignBulkLoading}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
        );

      case 'client-info':
        return (
          <AccountsProvider>
            <AccountsClientsSection mode="client-info" />
          </AccountsProvider>
        );

      case 'jobs':
        return <JobsTab />;

      case 'annuity-billing':
        return <AnnuityBillingTab />;

      case 'quotes':
        return <FCQuotesPage />;

      default:
        return <GlobalView />;
    }
  };

  if (loading && activeTab === 'companies') {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Field Coordinator Dashboard"
          subtitle="Manage clients and view global overview"
          icon={Globe}
          actionContent={
            <div className="flex items-center gap-3">
              <CreateCalibrationJobModal />
              {activeTab === 'companies' ? (
                <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  New Account
                </Button>
              ) : null}
            </div>
          }
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></Loader2>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Field Coordinator Dashboard"
        subtitle="Manage companies and view global overview"
        icon={Globe}
        actionContent={
          <div className="flex items-center gap-3">
            <CreateCalibrationJobModal />
            {activeTab === 'companies' ? (
              <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Combined Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'global', label: 'Global View', icon: Globe, type: 'tab' },
            { id: 'companies', label: 'Clients', icon: Building, type: 'tab' },
            { id: 'client-info', label: 'Client Info', icon: Users, type: 'tab' },
            { id: 'jobs', label: 'Jobs', icon: Briefcase, type: 'tab' },
            { id: 'annuity-billing', label: 'Annuity Billing', icon: FileText, type: 'tab' },
            { id: 'quotes', label: 'Quotes', icon: Receipt, type: 'tab' }
          ].map((navItem) => {
            const Icon = navItem.icon;
            const isActive = (navItem.id === 'global' && activeTab === 'global') || 
                           (navItem.id === 'companies' && activeTab === 'companies') ||
                           (navItem.id === 'client-info' && activeTab === 'client-info') ||
                           (navItem.id === 'jobs' && activeTab === 'jobs') ||
                           (navItem.id === 'annuity-billing' && activeTab === 'annuity-billing') ||
                           (navItem.id === 'quotes' && activeTab === 'quotes');
            
            return (
              <button
                key={navItem.id}
                type="button"
                onClick={() => setActiveTabWithPersistence(navItem.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{navItem.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content based on active tab */}
      {renderContent()}

    </div>
  );
}

export default function AccountsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      }
    >
      <AccountsDashboardContent />
    </Suspense>
  );
}
