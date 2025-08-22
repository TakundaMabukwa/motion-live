'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Users, Car, TrendingUp, AlertTriangle, Search, CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientCostCentersPage() {
  const params = useParams();
  const router = useRouter();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [selectedCostCenters, setSelectedCostCenters] = useState({});
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const clientCode = params.code;

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        console.log('Fetching data for client code:', clientCode);
        
        // Fetch all vehicle invoices that start with this client code
        const response = await fetch(`/api/vehicle-invoices?search=${clientCode}&includeLegalNames=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch client data');
        }

        const data = await response.json();
        console.log('API response:', data);
        
        // Find all customers that start with this client code
        const matchingCustomers = data.customers.filter(customer => 
          customer.code && customer.code.startsWith(clientCode)
        );
        
        console.log('Matching customers:', matchingCustomers);
        
        if (matchingCustomers.length > 0) {
          // Get all vehicles for these customers
          const allVehicles = data.vehicles.filter(vehicle => 
            vehicle.new_account_number && vehicle.new_account_number.startsWith(clientCode)
          );
          
          console.log('All vehicles for client:', allVehicles);
          
          setClientData({
            code: clientCode,
            customers: matchingCustomers,
            vehicles: allVehicles,
            totalMonthlyAmount: allVehicles.reduce((sum, v) => sum + (v.monthly_amount || 0), 0),
            totalAmountDue: allVehicles.reduce((sum, v) => sum + (v.amount_due || 0), 0),
            totalOverdue: 0, // Will calculate below
            vehicleCount: allVehicles.length
          });
        } else {
          setError('No clients found with this code');
        }
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (clientCode) {
      fetchClientData();
    }
  }, [clientCode]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleCostCenterToggle = (accountNumber, checked) => {
    console.log('Toggling cost center:', accountNumber, 'checked:', checked);
    setSelectedCostCenters(prev => ({
      ...prev,
      [accountNumber]: checked
    }));
  };

  const getSelectedTotalAmount = () => {
    const total = Object.entries(selectedCostCenters)
      .filter(([_, selected]) => selected)
      .reduce((total, [accountNumber]) => {
        const costCenter = costCentersArray.find(cc => cc.accountNumber === accountNumber);
        return total + (costCenter?.totalAmountDue || 0);
      }, 0);
    console.log('Selected total amount:', total, 'Selected centers:', selectedCostCenters);
    return total;
  };

  const handlePayAll = async () => {
    if (!paymentReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    const selectedCenters = Object.entries(selectedCostCenters)
      .filter(([_, selected]) => selected)
      .map(([accountNumber]) => accountNumber);

    if (selectedCenters.length === 0) {
      toast.error('Please select at least one cost center to pay');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Process payment for each selected cost center
      for (const accountNumber of selectedCenters) {
        const costCenter = costCentersArray.find(cc => cc.accountNumber === accountNumber);
        if (costCenter && costCenter.totalAmountDue > 0) {
          // Insert payment record
          const paymentResponse = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountNumber: accountNumber,
              paymentReference: paymentReference.trim(),
              amount: costCenter.totalAmountDue,
              paymentType: 'cost_center_payment'
            })
          });

          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json();
            throw new Error(`Failed to process payment for ${accountNumber}: ${errorData.error}`);
          }
        }
      }

      toast.success(`Successfully processed payments for ${selectedCenters.length} cost center(s)`);
      setShowPayAllModal(false);
      setSelectedCostCenters({});
      setPaymentReference('');
      
      // Refresh client data
      window.location.reload();
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'Failed to process payments');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
        <span className="ml-2">Loading client data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600 text-xl">Error: {error}</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-gray-600 text-xl">Client not found</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Group vehicles by account number to show each cost center
  const costCenters = {};
  clientData.vehicles.forEach(vehicle => {
    const accountNumber = vehicle.new_account_number;
    if (!costCenters[accountNumber]) {
      costCenters[accountNumber] = {
        accountNumber,
        vehicles: [],
        totalMonthlyAmount: 0,
        totalAmountDue: 0,
        totalOverdue: 0,
        vehicleCount: 0
      };
    }
    
    costCenters[accountNumber].vehicles.push(vehicle);
    costCenters[accountNumber].totalMonthlyAmount += vehicle.monthly_amount || 0;
    costCenters[accountNumber].totalAmountDue += vehicle.amount_due || 0;
    costCenters[accountNumber].vehicleCount += 1;
    
    // Calculate overdue amount for this vehicle
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const paymentDueDay = 21;
    
    let overdueAmount = 0;
    if (currentDay >= paymentDueDay) {
      if (currentMonth === 1) {
        overdueAmount += (vehicle.one_month || 0) + (vehicle['2nd_month'] || 0) + (vehicle['3rd_month'] || 0);
      } else if (currentMonth === 2) {
        overdueAmount += (vehicle['2nd_month'] || 0) + (vehicle['3rd_month'] || 0);
      } else if (currentMonth === 3) {
        overdueAmount += (vehicle['3rd_month'] || 0);
      } else {
        overdueAmount += (vehicle.one_month || 0) + (vehicle['2nd_month'] || 0) + (vehicle['3rd_month'] || 0);
      }
    }
    
    costCenters[accountNumber].totalOverdue += overdueAmount;
  });

  const costCentersArray = Object.values(costCenters).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  // Filter cost centers based on search term
  const filteredCostCenters = costCentersArray.filter(costCenter =>
    costCenter.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Debug - costCentersArray:', costCentersArray);
  console.log('Debug - filteredCostCenters:', filteredCostCenters);
  console.log('Debug - clientData.vehicles:', clientData.vehicles);

  return (
    <div className="space-y-6 p-6">
             {/* Header */}
       <div className="flex justify-between items-center">
         <div className="flex items-center space-x-4">
           <Button
             onClick={() => router.back()}
             variant="outline"
             size="sm"
           >
             <ArrowLeft className="mr-2 w-4 h-4" />
             Back to Clients
           </Button>
           <div>
             <h1 className="font-bold text-gray-900 text-3xl">
               Client Cost Centers: {clientCode}
             </h1>
             <p className="text-gray-600">
               {clientData.customers.length > 0 && clientData.customers[0].legal_name ? 
                 `Client: ${clientData.customers[0].legal_name}` : 
                 `Showing all clients and cost centers starting with "${clientCode}"`
               }
             </p>
           </div>
         </div>
       </div>

       {/* Pay All Button - Simple Version */}
       <div className="flex justify-center">
         <Button
           onClick={() => setShowPayAllModal(true)}
           className="bg-green-600 hover:bg-green-700 px-8 py-3 text-white text-lg"
           size="lg"
         >
           <CreditCard className="mr-3 w-6 h-6" />
           Pay All Cost Centers
         </Button>
       </div>

      {/* Summary Stats */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Monthly</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-red-600 text-2xl">
              {formatCurrency(clientData.totalMonthlyAmount)}
            </div>
            <p className="text-muted-foreground text-xs">Full monthly amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Amount Due</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-red-600 text-2xl">
              {formatCurrency(clientData.totalAmountDue)}
            </div>
            <p className="text-muted-foreground text-xs">Outstanding amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">
              {clientData.customers.length}
            </div>
            <p className="text-muted-foreground text-xs">Individual clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Vehicles</CardTitle>
            <Car className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-purple-600 text-2xl">
              {clientData.vehicleCount}
            </div>
            <p className="text-muted-foreground text-xs">Total vehicles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Payments Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">
              {clientData.totalAmountDue}
            </div>
            <p className="text-muted-foreground text-xs">From payments table</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Cost Centers</CardTitle>
          <p className="text-gray-600 text-sm">
            Filter cost centers by name or account number
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <input
              type="text"
              placeholder="Search by cost center name or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </CardContent>
      </Card>

             {/* Cost Centers Table */}
       <Card>
         <CardHeader>
           <div className="flex justify-between items-start">
             <div>
               <CardTitle className="text-lg">Individual Cost Centers ({filteredCostCenters.length})</CardTitle>
               <p className="text-gray-600 text-sm">
                 Each cost center represents a different account number starting with "{clientCode}"
               </p>
             </div>
             {costCentersArray.length > 0 ? (
               <Button
                 onClick={() => setShowPayAllModal(true)}
                 className="bg-green-600 hover:bg-green-700"
                 size="lg"
               >
                 <CreditCard className="mr-2 w-5 h-5" />
                 Pay All ({costCentersArray.length})
               </Button>
             ) : (
               <div className="text-gray-500 text-sm italic">
                 No cost centers available (Debug: {costCentersArray.length})
               </div>
             )}
           </div>
         </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                    Cost Center Name
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                    Monthly Amount
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                    Overdue
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                    Vehicles
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCostCenters.map((costCenter, index) => (
                  <tr key={costCenter.accountNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">
                        {costCenter.vehicles.length > 0 && costCenter.vehicles[0].legal_name ? 
                          costCenter.vehicles[0].legal_name : 
                          costCenter.accountNumber
                        }
                      </div>
                      <div className="text-gray-500 text-xs">
                        {costCenter.vehicles.length} vehicle{costCenter.vehicles.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(costCenter.totalMonthlyAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className={`font-medium ${
                        costCenter.totalAmountDue > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(costCenter.totalAmountDue)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className={`font-medium ${
                        costCenter.totalOverdue > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(costCenter.totalOverdue)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="outline">{costCenter.vehicleCount}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info (can remove later) */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-xs">
            <p><strong>Client Code:</strong> {clientCode}</p>
            <p><strong>Total Customers:</strong> {clientData.customers.length}</p>
            <p><strong>Total Vehicles:</strong> {clientData.vehicles.length}</p>
            <p><strong>Cost Centers:</strong> {costCentersArray.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pay All Modal */}
      <Dialog open={showPayAllModal} onOpenChange={setShowPayAllModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Pay All Cost Centers
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Cost Centers Selection */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Select Cost Centers to Pay</h3>
              <div className="space-y-3 p-4 border rounded-lg max-h-60 overflow-y-auto">
                {costCentersArray.map((costCenter) => (
                  <div key={costCenter.accountNumber} className="flex items-center space-x-3">
                    <Checkbox
                      id={`cost-center-${costCenter.accountNumber}`}
                      checked={selectedCostCenters[costCenter.accountNumber] || false}
                      onCheckedChange={(checked) => handleCostCenterToggle(costCenter.accountNumber, checked)}
                    />
                    <Label htmlFor={`cost-center-${costCenter.accountNumber}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{costCenter.accountNumber}</span>
                        <span className="text-gray-600 text-sm">
                          {formatCurrency(costCenter.totalAmountDue)}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        {costCenter.vehicleCount} vehicle{costCenter.vehicleCount !== 1 ? 's' : ''}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="payment-reference" className="font-medium text-gray-700 text-sm">
                Payment Reference
              </Label>
              <Input
                id="payment-reference"
                placeholder="Enter payment reference (e.g., PO123, Invoice #456)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            {/* Payment Summary */}
            {Object.values(selectedCostCenters).some(selected => selected) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="mb-3 font-medium text-gray-900">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected Cost Centers:</span>
                    <span className="font-medium">
                      {Object.values(selectedCostCenters).filter(selected => selected).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(getSelectedTotalAmount())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPayAllModal(false)}
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayAll}
              disabled={!paymentReference.trim() || !Object.values(selectedCostCenters).some(selected => selected) || processingPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingPayment ? 'Processing...' : 'Process Payments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
