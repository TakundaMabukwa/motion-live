'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Download, 
  AlertTriangle, 
  RefreshCw,
  Loader2,
  Eye,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/contexts/AccountsContext';
// Dynamic import for XLSX to avoid build issues

export default function AccountsClientsSection() {
  const { 
    companyGroups, 
    vehicleAmounts,
    loading, 
    loadingAmounts,
    totalCount, 
    fetchCompanyGroups, 
    fetchVehicleAmounts,
    isDataLoaded 
  } = useAccounts();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isGeneratingBulkInvoice, setIsGeneratingBulkInvoice] = useState(false);

  // Initial load
  useEffect(() => {
    if (!isDataLoaded) {
      fetchCompanyGroups('');
    }
  }, [fetchCompanyGroups, isDataLoaded]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(searchTerm);
        fetchCompanyGroups(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchCompanyGroups, debouncedSearchTerm]);

  const filteredCompanyGroups = useMemo(() => {
    return companyGroups;
  }, [companyGroups]);

  // Calculate statistics for customers with and without cost centers
  const customerStats = useMemo(() => {
    const withCostCenters = companyGroups.filter(group => group.hasCostCenters !== false).length;
    const withoutCostCenters = companyGroups.filter(group => group.hasCostCenters === false).length;
    return { withCostCenters, withoutCostCenters };
  }, [companyGroups]);

  const handleRefresh = async () => {
    try {
      await fetchCompanyGroups(searchTerm);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleViewClients = async (group: any) => {
    console.log('handleViewClients called with group:', group);
    console.log('Group all_new_account_numbers:', group.all_new_account_numbers);
    
    if (!group.all_new_account_numbers) {
      console.error('No account numbers found for this client:', group);
      toast.error('No account numbers found for this client');
      return;
    }

    try {
      // Parse comma-separated account numbers for payments_ table search
      const accountNumbers = group.all_new_account_numbers
        .split(',')
        .map((num: string) => num.trim().toUpperCase())
        .filter((num: string) => num.length > 0);

      console.log('Searching payments_ table for account numbers:', accountNumbers);

      // Fetch payment data directly from payments_ table using cost_code
      const response = await fetch(`/api/payments/by-client-accounts?all_new_account_numbers=${encodeURIComponent(group.all_new_account_numbers)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment data from payments_ table');
      }

      const data = await response.json();
      
      console.log('API response data:', data);
      console.log('Payments found:', data.payments?.length || 0);
      console.log('Summary:', data.summary);
      
      console.log('Payments_ table data retrieved:', {
        paymentsCount: data.payments?.length || 0,
        summary: data.summary,
        accountNumbers: data.accountNumbers
      });

      // Store payment data in sessionStorage for the next page
      sessionStorage.setItem('clientPaymentData', JSON.stringify({
        clientInfo: {
          companyGroup: group.company_group,
          legalNames: group.legal_names_list,
          accountNumbers: group.all_new_account_numbers,
          searchMethod: 'payments_table_focus'
        },
        payments: data.payments,
        summary: data.summary,
        searchDetails: {
          searchedAccountNumbers: accountNumbers,
          paymentsTableRecords: data.payments?.length || 0,
          totalDueAmount: data.summary?.totalDueAmount || 0,
          totalBalanceDue: data.summary?.totalBalanceDue || 0
        }
      }));

      // Navigate to the client cost centers page using the all_new_account_numbers
      const url = `/protected/client-cost-centers/${encodeURIComponent(group.all_new_account_numbers)}`;
      window.location.href = url;
      
    } catch (error) {
      console.error('Error fetching payment data from payments_ table:', error);
      toast.error('Failed to load payment data from payments_ table. Please try again.');
    }
  };

  // Handle Bulk Invoice Generation for All Cost Centers - Single Continuous Excel Sheet
  const handleBulkInvoice = async () => {
    try {
      setIsGeneratingBulkInvoice(true);
      
      // Dynamic import of XLSX library
      const XLSX = await import('xlsx');
      
      // Fetch all vehicles grouped by account number
      const response = await fetch('/api/vehicles/bulk-invoice');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle data');
      }
      
      const data = await response.json();
      const { groupedVehicles, customerDetails, accountTotals } = data.data;
      
      if (Object.keys(groupedVehicles).length === 0) {
        toast.error('No vehicle data found to generate invoices');
        return;
      }

      console.log(`Generating bulk invoice for ${Object.keys(groupedVehicles).length} accounts`);
      
      // Create a single continuous invoice data array
      const allInvoiceData = [];
      const invoiceResults = [];
      let successCount = 0;
      let errorCount = 0;
      let isFirstInvoice = true;

      // Process each account
      for (const [accountNumber, vehicles] of Object.entries(groupedVehicles)) {
        try {
          const customer = customerDetails[accountNumber];
          const totals = accountTotals[accountNumber];
          const companyName = customer?.legal_name || customer?.company || customer?.trading_name || 'Unknown Company';
          
          console.log(`Processing invoice for account: ${accountNumber} - ${companyName}`);
          
          // Add separator between invoices (except for the first one)
          if (!isFirstInvoice) {
            allInvoiceData.push([]); // Empty row
            allInvoiceData.push(['', '', '', '', '', '', '', '', '', '']); // Empty row
            allInvoiceData.push(['', '', '', '', '', '', '', '', '', '']); // Empty row
          }
          isFirstInvoice = false;
          
          // Add header information for this account
          allInvoiceData.push([`${companyName}`]);
          allInvoiceData.push([]); // Empty row
          allInvoiceData.push([`INVOICE - ${accountNumber}`]);
          allInvoiceData.push([`Account: ${accountNumber}`]);
          allInvoiceData.push([`Date: ${new Date().toLocaleDateString()}`]);
          allInvoiceData.push([]); // Empty row
          
          // Add table headers
          allInvoiceData.push([
            'Reg/Fleet No', 
            'Fleet/Reg No', 
            'Service Type', 
            'Company', 
            'Account Number',
            'Units', 
            'Unit Price', 
            'Total Excl VAT',
            'VAT Amount',
            'Total Incl VAT'
          ]);
          
          // Add vehicle data rows
          let totalAmount = 0;
          let vehiclesWithZeroAmount = 0;
          
          vehicles.forEach((vehicle) => {
            // Get vehicle identifier - prefer reg over fleet_number
            const regFleetNo = vehicle.reg ? vehicle.reg : (vehicle.fleet_number || '');
            
            // Use total_rental_sub as main amount
            const totalRentalSub = parseFloat(vehicle.total_rental_sub) || 0;
            
            // Process all vehicles, even with 0 amount
            {
              // Detect service type based on available fields
              let serviceType = '';
              
              // Check for specific service fields to determine type
              const serviceFields = [
                'skylink_trailer_unit_serial_number', 'sky_on_batt_ign_unit_serial_number',
                'skylink_voice_kit_serial_number', 'sky_scout_12v_serial_number', 'sky_scout_24v_serial_number',
                'skylink_pro_serial_number', 'sky_safety', 'sky_idata', 'sky_ican', 'industrial_panic',
                'flat_panic', 'buzzer', 'tag', 'tag_reader', 'keypad', 'keypad_waterproof',
                'early_warning', 'cia', 'fm_unit', 'gps', 'gsm', 'main_fm_harness',
                'beame_1', 'beame_2', 'beame_3', 'beame_4', 'beame_5',
                'fuel_probe_1', 'fuel_probe_2', '_7m_harness_for_probe', 'tpiece', 'idata',
                '_1m_extension_cable', '_3m_extension_cable', '_4ch_mdvr', '_5ch_mdvr', '_8ch_mdvr',
                'a2_dash_cam', 'a3_dash_cam_ai', 'vw400_dome_1', 'vw400_dome_2',
                'vw300_dakkie_dome_1', 'vw300_dakkie_dome_2', 'vw502_dual_lens_camera',
                'vw303_driver_facing_camera', 'vw502f_road_facing_camera', 'dms01_driver_facing',
                'adas_02_road_facing', 'vw100ip_driver_facing_ip', 'sd_card_1tb', 'sd_card_2tb',
                'sd_card_480gb', 'sd_card_256gb', 'sd_card_512gb', 'sd_card_250gb',
                'mic', 'speaker', 'pfk_main_unit', 'breathaloc', 'pfk_road_facing',
                'pfk_driver_facing', 'pfk_dome_1', 'pfk_dome_2', 'roller_door_switches',
                'consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom'
              ];
              
              // Check if vehicle has any of these service fields
              const hasServiceFields = serviceFields.some(field => 
                vehicle[field] && vehicle[field].toString().trim() !== ''
              );
              
              // Check total_rental and total_sub to determine service type suffix
              const totalRental = parseFloat(vehicle.total_rental) || 0;
              const totalSub = parseFloat(vehicle.total_sub) || 0;
              
              if (hasServiceFields) {
                // Use specific field names as service types
                let baseService = '';
                if (vehicle.skylink_trailer_unit_serial_number) baseService = 'Skylink Trailer Unit';
                else if (vehicle.skylink_pro_serial_number) baseService = 'Skylink Pro';
                else if (vehicle.sky_on_batt_ign_unit_serial_number) baseService = 'Sky On Batt IGN Unit';
                else if (vehicle.skylink_voice_kit_serial_number) baseService = 'Skylink Voice Kit';
                else if (vehicle.sky_scout_12v_serial_number) baseService = 'Sky Scout 12V';
                else if (vehicle.sky_scout_24v_serial_number) baseService = 'Sky Scout 24V';
                else if (vehicle._4ch_mdvr) baseService = '4CH MDVR';
                else if (vehicle._5ch_mdvr) baseService = '5CH MDVR';
                else if (vehicle._8ch_mdvr) baseService = '8CH MDVR';
                else if (vehicle.a2_dash_cam) baseService = 'A2 Dash Cam';
                else if (vehicle.a3_dash_cam_ai) baseService = 'A3 Dash Cam AI';
                else if (vehicle.pfk_main_unit) baseService = 'PFK Main Unit';
                else if (vehicle.breathaloc) baseService = 'Breathaloc';
                else if (vehicle.consultancy) baseService = 'Consultancy';
                else if (vehicle.maintenance) baseService = 'Maintenance';
                else if (vehicle.after_hours) baseService = 'After Hours';
                else if (vehicle.controlroom) baseService = 'Control Room';
                else if (vehicle.roaming) baseService = 'Roaming';
                
                // Add rental/subscription suffix
                if (totalRental > 0 && totalSub > 0) {
                  serviceType = `${baseService} - Rental and Subscription`;
                } else if (totalRental > 0) {
                  serviceType = `${baseService} - Rental`;
                } else if (totalSub > 0) {
                  serviceType = `${baseService} - Subscription`;
                } else {
                  serviceType = baseService;
                }
              } else {
                // No service fields, use rental/sub or default
                if (totalRental > 0 && totalSub > 0) {
                  serviceType = 'Monthly Rental and Subscription';
                } else if (totalRental > 0) {
                  serviceType = 'Monthly Rental';
                } else if (totalSub > 0) {
                  serviceType = 'Monthly Subscription';
                } else {
                  serviceType = 'Skylink rental monthly fee';
                }
              }
              
              // Calculate VAT amounts (total_rental_sub is VAT excluded)
              const totalExclVat = totalRentalSub;
              const vatAmount = totalExclVat * 0.15;
              const totalInclVat = totalExclVat + vatAmount;
              
              allInvoiceData.push([
                regFleetNo,
                regFleetNo,
                serviceType,
                vehicle.company || companyName,
                vehicle.account_number || '',
                1,
                totalExclVat.toFixed(2),
                totalExclVat.toFixed(2),
                vatAmount.toFixed(2),
                totalInclVat.toFixed(2)
              ]);
              
              totalAmount += totalInclVat;
            }
          });
          
          // Log statistics for this account
          console.log(`Account ${accountNumber}: ${vehicles.length} vehicles, ${vehiclesWithZeroAmount} with zero amounts, Total: R${totalAmount.toFixed(2)}`);
          
          // Add totals for this account
          allInvoiceData.push([]); // Empty row
          allInvoiceData.push(['', '', '', '', '', '', '', '', 'Total Amount:', totalAmount]);
          
          invoiceResults.push({
            accountNumber: accountNumber,
            companyName: companyName,
            status: 'success',
            message: `Invoice generated successfully`,
            totalAmount: totalAmount,
            vehicleCount: vehicles.length
          });
          
          successCount++;
          

          
        } catch (error) {
          console.error(`Error generating invoice for ${accountNumber}:`, error);
          invoiceResults.push({
            accountNumber: accountNumber,
            companyName: customerDetails[accountNumber]?.legal_name || customerDetails[accountNumber]?.company || 'Unknown',
            status: 'error',
            message: error.message
          });
          errorCount++;
        }
      }
      
      // Create a single worksheet with all invoice data
      const worksheet = XLSX.utils.aoa_to_sheet(allInvoiceData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Vehicle Reg
        { wch: 12 }, // Fleet No
        { wch: 30 }, // Description
        { wch: 20 }, // Company
        { wch: 15 }, // Account Number
        { wch: 8 },  // Units
        { wch: 12 }, // Unit Price
        { wch: 12 }, // Total Excl VAT
        { wch: 12 }, // VAT Amount
        { wch: 12 }  // Total Incl VAT
      ];
      worksheet['!cols'] = colWidths;
      
      // Create workbook with single sheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Invoices');
      
      // Save the Excel file
      const bulkFileName = `Bulk_Invoice_All_Accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, bulkFileName);
      
      // Show summary toast with detailed statistics
      if (successCount > 0) {
        const totalVehiclesInExcel = invoiceResults.reduce((sum, result) => sum + (result.vehicleCount || 0), 0);
        toast.success(`Bulk Invoice Generated: ${successCount} accounts processed, ${totalVehiclesInExcel} vehicles included. ${errorCount} failed.`);
        
        // Log detailed statistics
        console.log('=== BULK INVOICE GENERATION SUMMARY ===');
        console.log(`Total accounts processed: ${successCount}`);
        console.log(`Total vehicles included: ${totalVehiclesInExcel}`);
        console.log(`Failed accounts: ${errorCount}`);
        console.log(`Total accounts in database: ${Object.keys(groupedVehicles).length}`);
        console.log('========================================');
      } else {
        toast.error('Bulk Invoice Generation Failed: No invoices were generated successfully.');
      }
      
      console.log('Bulk invoice generation results:', invoiceResults);
      
    } catch (error) {
      console.error('Error in bulk invoice generation:', error);
      toast.error('Failed to generate bulk invoices. Please try again.');
    } finally {
      setIsGeneratingBulkInvoice(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || amount === 0) {
      return 'R 0.00';
    }
    
    return `R ${amount.toFixed(2)}`;
  };

  const getOverdueStatus = (totalAmountDue: number) => {
    if (totalAmountDue === 0) return 'current';
    if (totalAmountDue < 1000) return 'low';
    if (totalAmountDue < 5000) return 'medium';
    return 'high';
  };

  const getOverdueColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading clients...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">View Clients</h1>
          <p className="mt-2 text-gray-600">Manage and view all client information with legal names and vehicle amounts</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleBulkInvoice}
            disabled={isGeneratingBulkInvoice}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className={`w-4 h-4 mr-2 ${isGeneratingBulkInvoice ? 'animate-pulse' : ''}`} />
            {isGeneratingBulkInvoice ? 'Generating Excel...' : 'Bulk Invoice (Excel)'}
          </Button>
          <Button 
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

             {/* Summary Stats */}
       <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Clients</CardTitle>
             <Users className="w-4 h-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-blue-600 text-2xl">{filteredCompanyGroups.length}</div>
             <p className="text-muted-foreground text-xs">Active company groups</p>
           </CardContent>
         </Card>

         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Amount Due Now</CardTitle>
             <AlertTriangle className="w-4 h-4 text-red-500" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-red-600 text-2xl">
               {formatCurrency(filteredCompanyGroups.reduce((sum, group) => sum + (group.totalAmountDue || 0), 0))}
             </div>
             <p className="text-muted-foreground text-xs">Overdue amounts after 21st of month</p>
           </CardContent>
         </Card>
       </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Clients</CardTitle>
          <p className="text-gray-600 text-sm">Search by company group, legal names, or account numbers</p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="Search by company group or legal names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Client Company Groups</CardTitle>
          <p className="text-gray-600 text-sm">All clients with their legal names, account information, and vehicle amounts</p>

        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                             <TableHeader>
                                           <TableRow>
                            <TableHead>Company Group</TableHead>
                            <TableHead>Legal Names</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
               </TableHeader>
              <TableBody>
                {filteredCompanyGroups.map((group, index) => {
                  return (
                    <TableRow 
                      key={group.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <TableCell>
                        <div className="font-medium text-sm text-gray-900">
                          {group.company_group || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {group.legal_names_list?.slice(0, 2).join(', ') || 'N/A'}
                          {group.legal_names_list?.length > 2 && (
                            <span className="text-gray-500 text-xs"> +{group.legal_names_list.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={() => handleViewClients(group)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="mr-1 w-4 h-4" />
                            View Clients
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {filteredCompanyGroups.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                {loading ? 'Loading clients...' : 'No clients found'}
              </h3>
              <p className="text-gray-500">
                {loading 
                  ? 'Please wait while we load the client data...'
                  : searchTerm 
                    ? `No clients match your search "${searchTerm}"`
                    : 'No client data available at the moment.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
