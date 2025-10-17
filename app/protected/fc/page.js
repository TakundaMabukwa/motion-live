"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThreeDotsMenu } from "@/components/ui/three-dots-menu";
import { GiveAccessDialog } from "@/components/ui/give-access-dialog";
import GlobalView from "@/components/ui-personal/global-view";
import { useClients } from "@/contexts/ClientsContext";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Building2,
  Eye,
  Globe,
  Building,
  FileText,
  ExternalLink,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
} from "lucide-react";

export default function AccountsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { 
    companyGroups, 
    contactInfo, 
    paymentData,
    loading, 
    loadingContacts, 
    totalCount, 
    fetchCompanyGroups, 
    isDataLoaded 
  } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('global');
  const [giveAccessDialog, setGiveAccessDialog] = useState({ open: false, clientName: "" });



  // Initial load
  useEffect(() => {
    if (activeTab === 'companies' && !isDataLoaded) {
      fetchCompanyGroups("");
    }
  }, [fetchCompanyGroups, activeTab, isDataLoaded]);

  // Debounced search effect
  useEffect(() => {
    if (activeTab === 'companies') {
      const timer = setTimeout(() => {
        if (searchTerm !== debouncedSearchTerm) {
          setDebouncedSearchTerm(searchTerm);
          fetchCompanyGroups(searchTerm);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, fetchCompanyGroups, activeTab]);

  const filteredCompanyGroups = useMemo(() => {
    console.log('🔍 [FC DASHBOARD] Company groups loaded:', companyGroups.length);
    console.log('🔍 [FC DASHBOARD] Company groups data:', companyGroups);
    
    // Log each group's account numbers for debugging
    companyGroups.forEach((group, index) => {
      console.log(`📋 [FC DASHBOARD] Group ${index}:`, {
        company_group: group.company_group,
        legal_names: group.legal_names,
        all_new_account_numbers: group.all_new_account_numbers
      });
    });
    
    return companyGroups;
  }, [companyGroups]);

  const handleNewAccount = () => {
    router.push('/protected/fc/add-account');
  };

  const handleViewDetails = (group) => {
    console.log('🔍 [FC DASHBOARD] handleViewDetails called for group:', group);
    console.log('🔍 [FC DASHBOARD] Group company_group:', group.company_group);
    console.log('🔍 [FC DASHBOARD] Group legal_names:', group.legal_names);
    console.log('🔍 [FC DASHBOARD] Group all_new_account_numbers:', group.all_new_account_numbers);
    
    if (group.all_new_account_numbers) {
      // Pass the entire all_new_account_numbers string to the cost centers page
      const encodedAccountNumbers = encodeURIComponent(group.all_new_account_numbers);
      console.log('🌐 [FC DASHBOARD] Encoded account numbers:', encodedAccountNumbers);
      console.log('🌐 [FC DASHBOARD] Navigation URL:', `/protected/fc/clients/cost-centers?accounts=${encodedAccountNumbers}`);
      
      router.push(`/protected/fc/clients/cost-centers?accounts=${encodedAccountNumbers}`);
    } else {
      console.log('⚠️ [FC DASHBOARD] No account numbers found for group:', group);
    }
  };

  const handleGiveAccess = (group) => {
    setGiveAccessDialog({
      open: true,
      clientName: group.legal_names || group.company_group || 'Unknown Client'
    });
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
              <Button
                variant="outline"
                onClick={() => fetchCompanyGroups(searchTerm)}
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
                Showing {filteredCompanyGroups.length} of {totalCount} clients
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
                    Data cached
                  </span>
                )}
                {/* Debug: Show which groups have ALLI-0001 */}
                {filteredCompanyGroups.some(group => group.all_new_account_numbers?.includes('ALLI-0001')) && (
                  <span className="ml-2 text-orange-600">
                    ⚠️ Found ALLI-0001 in data
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
                                <div className="mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {group.company_group || 'N/A'}
                                    {group.all_new_account_numbers?.includes('ALLI-0001') && (
                                      <span className="ml-1 text-orange-600">⚠️</span>
                                    )}
                                  </Badge>
                                </div>
                                <div className="font-semibold text-sm">{group.legal_names || 'N/A'}</div>
                                <div className="text-xs text-gray-500">
                                  {group.legal_names_list && group.legal_names_list.length > 0 
                                    ? `${group.legal_names_list.length} legal entities`
                                    : 'No legal names'
                                  }
                                  {group.all_new_account_numbers?.includes('ALLI-0001') && (
                                    <span className="ml-2 text-orange-600 font-medium">(Has ALLI-0001)</span>
                                  )}
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
                              <ThreeDotsMenu
                                onViewDetails={() => handleViewDetails(group)}
                                onGiveAccess={() => handleGiveAccess(group)}
                              />
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
          </>
        );

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
          actionButton={
            activeTab === 'companies' ? {
              label: "New Account",
              onClick: handleNewAccount,
              icon: Plus
            } : undefined
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
        actionButton={
          activeTab === 'companies' ? {
            label: "New Account",
            onClick: handleNewAccount,
            icon: Plus
          } : undefined
        }
      />

      {/* Combined Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'global', label: 'Global View', icon: Globe, type: 'tab' },
            { id: 'companies', label: 'Clients', icon: Building, type: 'tab' },
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc', type: 'link', hideOnGlobal: true, hideOnClients: true },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes', type: 'link' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation', type: 'link' },
            { id: 'completed-jobs', label: 'Completed Jobs', icon: CheckCircle, href: '/protected/fc/completed-jobs', type: 'link' }
          ].filter(navItem => 
            !(navItem.hideOnGlobal && activeTab === 'global') &&
            !(navItem.hideOnClients && activeTab === 'companies')
          ).map((navItem) => {
            const Icon = navItem.icon;
            const isActive = (navItem.id === 'global' && activeTab === 'global') || 
                           (navItem.id === 'companies' && activeTab === 'companies') ||
                           (navItem.type === 'link' && pathname === navItem.href);
            
            if (navItem.type === 'tab') {
              return (
                <button
                  key={navItem.id}
                  onClick={() => setActiveTab(navItem.id)}
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
            }
            
            return (
              <Link
                key={navItem.id}
                href={navItem.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{navItem.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content based on active tab */}
      {renderContent()}

      {/* Give Access Dialog */}
      <GiveAccessDialog
        open={giveAccessDialog.open}
        onOpenChange={(open) => setGiveAccessDialog({ ...giveAccessDialog, open })}
        clientName={giveAccessDialog.clientName}
      />

    </div>
  );
}
