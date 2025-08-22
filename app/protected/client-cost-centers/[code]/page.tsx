'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, DollarSign, Car, AlertTriangle, CreditCard, Users, X, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ClientCostCentersPage() {
  const params = useParams();
  const router = useRouter();
  const { code } = params;
  
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCostCenters, setFilteredCostCenters] = useState([]);
  const [costCentersWithPayments, setCostCentersWithPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [enteredAmount, setEnteredAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [clientLegalName, setClientLegalName] = useState('');
  const [selectedCostCenters, setSelectedCostCenters] = useState([]);
  const [payAllAmount, setPayAllAmount] = useState('');
  const [payAllReference, setPayAllReference] = useState('');

  useEffect(() => {
    if (code) {
      fetchClientData();
    }
  }, [code]);

  useEffect(() => {
    if (clientData?.vehicles) {
      filterCostCenters();
    }
  }, [searchTerm, clientData]);

  // Handle amount input changes - allow decimals and better formatting
  const handleAmountChange = (e) => {
    let value = e.target.value;
    
    // Remove all non-digit and non-decimal characters except the first decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    setEnteredAmount(value);
  };

  // Handle Pay All amount input changes
  const handlePayAllAmountChange = (e) => {
    let value = e.target.value;
    
    // Remove all non-digit and non-decimal characters except the first decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    setPayAllAmount(value);
  };

  // Get the numeric amount from entered string
  const getNumericAmount = () => {
    return parseFloat(enteredAmount) || 0;
  };

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicle-invoices?search=${code}&includeLegalNames=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client data');
      }

      const data = await response.json();
      console.log('API response for client:', data);

      if (data.customers && data.customers.length > 0) {
        // Get the first customer to extract client legal name
        const firstCustomer = data.customers[0];
        const legalName = firstCustomer.legal_name || firstCustomer.company || code;
        setClientLegalName(legalName);
        
        // Get all vehicles from all matching customers
        const allVehicles = data.customers.reduce((vehicles, customer) => {
          if (customer.vehicles && Array.isArray(customer.vehicles)) {
            return vehicles.concat(customer.vehicles);
          }
          return vehicles;
        }, []);

        setClientData({
          code: code,
          customers: data.customers,
          vehicles: allVehicles,
          totalMonthlyAmount: allVehicles.reduce((sum, v) => sum + (v.monthly_amount || 0), 0),
          totalAmountDue: allVehicles.reduce((sum, v) => sum + (v.amount_due || 0), 0),
          totalOverdue: 0,
          vehicleCount: allVehicles.length,
          paymentsTotalAmount: data.customers[0]?.paymentsTotalAmount || 0,
          paymentsAmountDue: data.customers[0]?.paymentsAmountDue || 0
        });
      } else {
        setClientLegalName(code);
        setClientData({
          code: code,
          customers: [],
          vehicles: [],
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          totalOverdue: 0,
          vehicleCount: 0,
          paymentsTotalAmount: 0,
          paymentsAmountDue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
      setClientLegalName(code);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch client data. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCostCenters = () => {
    if (!clientData?.vehicles) return;

    const filtered = clientData.vehicles.filter(vehicle => {
      const accountNumber = vehicle.account_number || '';
      const stockCode = vehicle.stock_code || '';
      const stockDescription = vehicle.stock_description || '';
      const company = vehicle.company || '';
      
      const searchLower = searchTerm.toLowerCase();
      return (
        accountNumber.toLowerCase().includes(searchLower) ||
        stockCode.toLowerCase().includes(searchLower) ||
        stockDescription.toLowerCase().includes(searchLower) ||
        company.toLowerCase().includes(searchLower)
      );
    });

    setFilteredCostCenters(filtered);
  };

  const groupByCostCenter = (vehicles) => {
    const costCenters = {};
    
    vehicles.forEach(vehicle => {
      const accountNumber = vehicle.account_number;
      if (!accountNumber) return;
      
      if (!costCenters[accountNumber]) {
        costCenters[accountNumber] = {
          accountNumber,
          accountName: vehicle.company || vehicle.stock_description || vehicle.stock_code || accountNumber,
          monthlyAmount: 0,
          amountDue: 0,
          overdue: 0,
          vehicleCount: 0,
          vehicles: []
        };
      }
      
      const monthlyAmount = (vehicle.one_month || 0) + (vehicle['2nd_month'] || 0) + (vehicle['3rd_month'] || 0);
      costCenters[accountNumber].monthlyAmount += monthlyAmount;
      costCenters[accountNumber].amountDue += vehicle.amount_due || 0;
      costCenters[accountNumber].vehicleCount += 1;
      costCenters[accountNumber].vehicles.push(vehicle);
    });
    
    return Object.values(costCenters);
  };

  // Fetch payments data for each cost center
  const fetchPaymentsForCostCenters = async (costCenters) => {
    try {
      const updatedCostCenters = await Promise.all(
        costCenters.map(async (costCenter) => {
          try {
            const response = await fetch(`/api/payments/by-account?accountNumber=${costCenter.accountNumber}`);
            if (response.ok) {
              const paymentData = await response.json();
              if (paymentData.payment) {
                return {
                  ...costCenter,
                  amountDue: paymentData.payment.amount_due || 0,
                  overdue: paymentData.payment.overdue || 0,
                  totalPaid: paymentData.payment.total_amount || 0,
                  firstMonth: paymentData.payment.first_month || 0
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching payment for ${costCenter.accountNumber}:`, error);
          }
          return costCenter;
        })
      );
      return updatedCostCenters;
    } catch (error) {
      console.error('Error fetching payments data:', error);
      return costCenters;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const handlePayCostCenter = (costCenter) => {
    setPaymentDetails({
      type: 'costCenter',
      title: `Pay Cost Center: ${costCenter.accountName || costCenter.accountNumber}`,
      amount: costCenter.amountDue,
      description: `Amount owed for ${costCenter.accountName || costCenter.accountNumber} (${costCenter.accountNumber})`,
      costCenter: costCenter
    });
    setEnteredAmount('');
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  const handlePayAllCostCenters = () => {
    const outstandingCostCenters = costCentersWithPayments.filter(cc => cc.amountDue > 0);
    
    if (outstandingCostCenters.length === 0) {
      toast({
        variant: "destructive",
        title: "No Outstanding Amounts",
        description: "All cost centers are already paid up to date."
      });
      return;
    }

    // Initialize selected cost centers with all outstanding ones
    setSelectedCostCenters(outstandingCostCenters.map(cc => ({
      ...cc,
      selected: true
    })));
    
    // Calculate initial total
    const totalAmount = outstandingCostCenters.reduce((sum, cc) => sum + cc.amountDue, 0);
    setPayAllAmount(totalAmount.toString());
    setPayAllReference('');
    
    setShowPayAllModal(true);
  };

  const handleCostCenterSelection = (accountNumber, selected) => {
    setSelectedCostCenters(prev => prev.map(cc => 
      cc.accountNumber === accountNumber 
        ? { ...cc, selected }
        : cc
    ));
    
    // Recalculate total based on selected cost centers
    const newSelected = selectedCostCenters.map(cc => 
      cc.accountNumber === accountNumber 
        ? { ...cc, selected }
        : cc
    );
    
    const totalAmount = newSelected
      .filter(cc => cc.selected)
      .reduce((sum, cc) => sum + cc.amountDue, 0);
    
    setPayAllAmount(totalAmount.toString());
  };

  const handlePayAllSubmit = async () => {
    const amount = parseFloat(payAllAmount);
    
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than 0."
      });
      return;
    }

    if (!payAllReference.trim()) {
      toast({
        variant: "destructive",
        title: "Payment Reference Required",
        description: "Please enter a payment reference for bulk payments."
      });
      return;
    }

    const selectedCostCentersToPay = selectedCostCenters.filter(cc => cc.selected);
    
    if (selectedCostCentersToPay.length === 0) {
      toast({
        variant: "destructive",
        title: "No Cost Centers Selected",
        description: "Please select at least one cost center to pay."
      });
      return;
    }

    setProcessingPayment(true);
    
    try {
      let successCount = 0;
      const errors = [];

      // Process payment for each selected cost center
      for (const costCenter of selectedCostCentersToPay) {
        try {
          const response = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountNumber: costCenter.accountNumber,
              amount: costCenter.amountDue,
              paymentReference: payAllReference,
              paymentType: 'cost_center_payment'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              successCount++;
            } else {
              errors.push(`${costCenter.accountName}: ${result.error}`);
            }
          } else {
            errors.push(`${costCenter.accountName}: Payment failed`);
          }
        } catch (error) {
          errors.push(`${costCenter.accountName}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        const message = successCount === selectedCostCentersToPay.length
          ? `Successfully processed payments for all ${successCount} cost centers! Total amount: ${formatCurrency(amount)}`
          : `Successfully processed payments for ${successCount} out of ${selectedCostCentersToPay.length} cost centers. Total amount: ${formatCurrency(amount)}`;
        
        toast({
          title: "Pay All Successful",
          description: message,
        });
        
        if (errors.length > 0) {
          console.error('Payment errors:', errors);
        }
        
        // Refresh client data to show updated amounts
        await fetchClientData();
        setShowPayAllModal(false);
      } else {
        toast({
          variant: "destructive",
          title: "Pay All Failed",
          description: "All payments failed. Please check the console for details."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: `Failed to process payments: ${error.message}`
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    const amount = getNumericAmount();
    
    // Validate payment amount
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than 0."
      });
      return;
    }

    // Validate payment reference for bulk payments
    if (paymentDetails.type === 'allCostCenters' && !paymentReference.trim()) {
      toast({
        variant: "destructive",
        title: "Payment Reference Required",
        description: "Please enter a payment reference for bulk payments to help track the transaction."
      });
      return;
    }

    // Check if payment exceeds amount due
    if (amount > paymentDetails.amount) {
      toast({
        variant: "destructive",
        title: "Payment Too High",
        description: `Payment amount (${formatCurrency(amount)}) cannot exceed amount due (${formatCurrency(paymentDetails.amount)}).`
      });
      return;
    }
    
    if (paymentDetails.type === 'costCenter') {
      setProcessingPayment(true);
      try {
        // Process payment through API
        const response = await fetch('/api/payments/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
                        body: JSON.stringify({
                accountNumber: paymentDetails.costCenter.accountNumber,
                amount: amount,
                paymentReference: paymentReference || `Payment for ${paymentDetails.costCenter.accountNumber}`,
                paymentType: 'cost_center_payment'
              }),
        });

        if (!response.ok) {
          throw new Error('Payment processing failed');
        }

        const result = await response.json();
        
        if (result.success) {
          const newAmountDue = result.payment.amount_due;
          const message = newAmountDue === 0 
            ? `Payment of ${formatCurrency(amount)} processed successfully! Amount due is now R 0.00.`
            : `Payment of ${formatCurrency(amount)} processed successfully! New amount due: ${formatCurrency(newAmountDue)}`;
          
          toast({
            title: "Payment Successful",
            description: message,
          });
          
          // Refresh client data to show updated amounts
          await fetchClientData();
        } else {
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description: result.error || 'Payment processing failed'
          });
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: "Failed to process payment. Please try again."
        });
      } finally {
        setProcessingPayment(false);
      }
    } else if (paymentDetails.type === 'allCostCenters') {
      setProcessingPayment(true);
      try {
        // Process payments for all cost centers
        const costCentersToPay = costCentersWithPayments.filter(cc => cc.amountDue > 0);
        let successCount = 0;
        let totalProcessed = 0;

        for (const costCenter of costCentersToPay) {
          try {
            const response = await fetch('/api/payments/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accountNumber: costCenter.accountNumber,
                amount: Math.min(amount - totalProcessed, costCenter.amountDue),
                paymentReference: paymentReference || `Bulk payment for ${costCenter.accountNumber}`,
                paymentType: 'cost_center_payment'
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                successCount++;
                totalProcessed += Math.min(amount - totalProcessed, costCenter.amountDue);
              }
            }
          } catch (error) {
            console.error(`Error processing payment for ${costCenter.accountNumber}:`, error);
          }
        }

        if (successCount > 0) {
          const message = successCount === costCentersToPay.length
            ? `Successfully processed payments for all ${successCount} cost centers! Total amount: ${formatCurrency(amount)}`
            : `Successfully processed payments for ${successCount} out of ${costCentersToPay.length} cost centers. Total amount: ${formatCurrency(amount)}`;
          
          toast({
            title: "Pay All Successful",
            description: message,
          });
          
          // Refresh client data to show updated amounts
          await fetchClientData();
        } else {
          toast({
            variant: "destructive",
            title: "Pay All Failed",
            description: "Failed to process payments for any cost centers. Please try again."
          });
        }
      } catch (error) {
        console.error('Pay All error:', error);
        toast({
          variant: "destructive",
          title: "Pay All Error",
          description: "Failed to process payments. Please try again."
        });
      } finally {
        setProcessingPayment(false);
      }
    }
    
    setShowPaymentModal(false);
    setPaymentDetails(null);
    setEnteredAmount('');
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentDetails(null);
    setEnteredAmount('');
    setPaymentReference('');
    setProcessingPayment(false);
  };

  const closePayAllModal = () => {
    setShowPayAllModal(false);
    setSelectedCostCenters([]);
    setPayAllAmount('');
    setPayAllReference('');
    setProcessingPayment(false);
  };

  // Effect to fetch payments data when cost centers change
  useEffect(() => {
    if (filteredCostCenters.length > 0) {
      const costCenters = groupByCostCenter(filteredCostCenters);
      fetchPaymentsForCostCenters(costCenters).then(setCostCentersWithPayments);
    }
  }, [filteredCostCenters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto border-b-2 border-blue-600 rounded-full w-32 h-32 animate-spin"></div>
          <p className="mt-4 text-gray-700 text-lg">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!clientData || clientData.vehicles.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-gray-200 border-b">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button variant="outline" onClick={() => router.push('/protected/accounts?section=clients')} className="mr-4">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back to Clients
                </Button>
                <div>
                  <h1 className="font-semibold text-gray-900 text-xl">Client Cost Centers</h1>
                  <p className="text-gray-500 text-sm">{clientLegalName || code}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto p-6 max-w-7xl container">
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Cost Centers Found</h3>
                <p className="text-gray-500">
                  No cost centers found for client: <strong className="text-blue-600">{clientLegalName || code}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-gray-200 border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="outline" onClick={() => router.push('/protected/accounts?section=clients')} className="mr-4">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Clients
              </Button>
              <div>
                <h1 className="font-semibold text-gray-900 text-xl">Client Cost Centers</h1>
                <p className="text-gray-500 text-sm">{clientLegalName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto p-6 max-w-7xl container">
        {/* Summary Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-red-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Amount Due</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-red-600 text-2xl">
                {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.amountDue || 0), 0))}
              </div>
              <p className="mt-1 text-gray-500 text-xs">From payments table</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-purple-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Total Vehicles</CardTitle>
              <Car className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-purple-600 text-2xl">{clientData.vehicleCount}</div>
              <p className="mt-1 text-gray-500 text-xs">Fleet size</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-green-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Cost Centers</CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-green-600 text-2xl">{costCentersWithPayments.length}</div>
              <p className="mt-1 text-gray-500 text-xs">Active centers</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-indigo-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">First Month</CardTitle>
              <Calendar className="w-5 h-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-indigo-600 text-2xl">
                {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.firstMonth || 0), 0))}
              </div>
              <p className="mt-1 text-gray-500 text-xs">Amounts after 21st of month</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-orange-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Payments Due</CardTitle>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-orange-600 text-2xl">
                {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.amountDue || 0), 0))}
              </div>
              <p className="mt-1 text-gray-500 text-xs">Amount due from payments table</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Row */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-6">
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-gray-900 text-lg">
                  {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.amountDue || 0), 0))}
                </div>
                <p className="text-gray-500 text-xs">Total Amount Due</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-green-600 text-lg">
                  {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.firstMonth || 0), 0))}
                </div>
                <p className="text-gray-500 text-xs">First Month Amounts</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-red-600 text-lg">
                  {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + (cc.overdue || 0), 0))}
                </div>
                <p className="text-gray-500 text-xs">Total Overdue Amount</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-white shadow-lg mb-6 border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search cost centers by company name, account number, stock code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Centers Table */}
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader className="bg-gray-50 border-gray-200 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-gray-900 text-lg">Cost Centers</CardTitle>
                <p className="mt-1 text-gray-600 text-sm">Individual cost centers with company names and account codes for this client</p>
              </div>
              <div className="text-right">
                <Button
                  onClick={() => handlePayAllCostCenters()}
                  size="sm"
                  disabled={costCentersWithPayments.filter(cc => cc.amountDue > 0).length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200 disabled:cursor-not-allowed"
                >
                  <CreditCard className="mr-2 w-4 h-4" />
                  Pay All
                </Button>
                {costCentersWithPayments.filter(cc => cc.amountDue > 0).length > 0 && (
                  <p className="mt-1 text-gray-500 text-xs">
                    Total Outstanding: {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + cc.amountDue, 0))}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-gray-200 border-b">
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Account Name</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Monthly Amount</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Amount Due</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">First Month</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Overdue</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Vehicles</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-center uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costCentersWithPayments.map((costCenter, index) => (
                    <tr key={costCenter.accountNumber} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {costCenter.accountName}
                          </div>
                          <Badge variant="outline" className="bg-blue-50 px-2 py-1 border-blue-200 font-mono text-blue-700 text-xs">
                            {costCenter.accountNumber}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{formatCurrency(costCenter.monthlyAmount)}</div>
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold ${
                          costCenter.amountDue > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(costCenter.amountDue)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(costCenter.firstMonth || 0)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold ${
                          costCenter.overdue > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(costCenter.overdue)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="bg-purple-100 border-purple-200 text-purple-700">
                          {costCenter.vehicleCount}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          onClick={() => handlePayCostCenter(costCenter)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200"
                        >
                          <CreditCard className="mr-2 w-4 h-4" />
                          Pay
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-md max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">{paymentDetails.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePaymentModal}
                disabled={processingPayment}
                className="disabled:opacity-50 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6 text-center">
                <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mb-2 font-bold text-gray-900 text-xl">Amount Owed</h4>
                <div className="mb-2 font-bold text-blue-600 text-3xl">
                  {formatCurrency(paymentDetails.amount)}
                </div>
                <p className="text-gray-600 text-sm">{paymentDetails.description}</p>
                
                {/* Payment Info Box */}
                <div className="bg-blue-50 mt-4 p-3 border border-blue-200 rounded-lg">
                  <div className="space-y-1 text-blue-800 text-xs">
                    <div className="flex justify-between">
                      <span>Current Amount Due:</span>
                      <span className="font-semibold">{formatCurrency(paymentDetails.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Due Date:</span>
                      <span className="font-semibold">21st of each month</span>
                    </div>
                    <div className="mt-2 font-medium text-blue-700 text-center">
                      💡 After 21st, unpaid amounts are added to overdue
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Enter Payment Amount
                </label>
                <div className="relative">
                  <span className="top-1/2 left-3 absolute font-semibold text-gray-500 -translate-y-1/2 transform">
                    R
                  </span>
                  <Input
                    type="text"
                    value={enteredAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    disabled={processingPayment}
                    className="disabled:opacity-50 py-3 pr-4 pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-gray-500">
                    Enter amount (e.g., 1500.50 or 1500)
                  </span>
                  <span className="font-medium text-blue-600">
                    Max: {formatCurrency(paymentDetails.amount)}
                  </span>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Payment Reference {paymentDetails.type === 'allCostCenters' ? '(Required)' : '(Optional)'}
                  {paymentDetails.type === 'allCostCenters' && <span className="ml-1 text-red-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter payment reference..."
                  disabled={processingPayment}
                  className="disabled:opacity-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-gray-500 text-xs">
                  {paymentDetails.type === 'allCostCenters' 
                    ? 'Payment reference is required for bulk payments to help track the transaction.'
                    : 'Add a reference to help track this payment (e.g., invoice number, check number)'
                  }
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 mb-6 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">Payment Type:</span>
                  <span className="text-gray-900 text-sm">
                    {paymentDetails.type === 'costCenter' ? 'Individual Cost Center' : 
                     paymentDetails.type === 'allCostCenters' ? 'All Cost Centers' : 'Entire Client'}
                  </span>
                </div>
                {paymentDetails.type === 'costCenter' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Cost Center:</span>
                    <span className="font-mono text-gray-900 text-sm">{paymentDetails.costCenter.accountNumber}</span>
                  </div>
                )}
                {paymentDetails.type === 'costCenter' && paymentDetails.costCenter.accountName && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Company Name:</span>
                    <span className="text-gray-900 text-sm">{paymentDetails.costCenter.accountName}</span>
                  </div>
                )}
                {paymentDetails.type === 'allCostCenters' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Cost Centers:</span>
                    <span className="text-gray-900 text-sm">{costCentersWithPayments.filter(cc => cc.amountDue > 0).length} cost centers with outstanding amounts</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">Client Code:</span>
                  <span className="font-semibold text-gray-900 text-sm">{code}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">Entered Amount:</span>
                  <span className="font-semibold text-green-600 text-sm">
                    {formatCurrency(getNumericAmount())}
                  </span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Payment Reference:</span>
                    <span className="font-semibold text-blue-600 text-sm">{paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">Remaining After Payment:</span>
                  <span className={`font-semibold text-sm ${
                    (paymentDetails.amount - getNumericAmount()) > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.max(0, paymentDetails.amount - getNumericAmount()))}
                  </span>
                </div>
                {paymentDetails.type === 'costCenter' && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium text-gray-700 text-sm">First Month Amount:</span>
                    <span className="font-semibold text-blue-600 text-sm">
                      {formatCurrency(paymentDetails.costCenter.firstMonth || 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closePaymentModal}
                  disabled={processingPayment}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!enteredAmount || getNumericAmount() <= 0 || processingPayment || (paymentDetails.type === 'allCostCenters' && !paymentReference.trim())}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <>
                      <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay All Modal */}
      {showPayAllModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-xl">Pay All Cost Centers</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePayAllModal}
                disabled={processingPayment}
                className="disabled:opacity-50 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Payment Fields - Moved to Top */}
              <div className="mb-6">
                <h5 className="mb-3 font-semibold text-gray-700">Payment Details</h5>
                
                {/* Payment Amount Input */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="top-1/2 left-3 absolute font-semibold text-gray-500 -translate-y-1/2 transform">
                      R
                    </span>
                    <Input
                      type="text"
                      value={payAllAmount}
                      onChange={handlePayAllAmountChange}
                      placeholder="0.00"
                      disabled={processingPayment}
                      className="disabled:opacity-50 py-3 pr-4 pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-500">
                      Enter total payment amount
                    </span>
                    <span className="font-medium text-blue-600">
                      Selected Total: {formatCurrency(selectedCostCenters.filter(cc => cc.selected).reduce((sum, cc) => sum + cc.amountDue, 0))}
                    </span>
                  </div>
                </div>

                {/* Payment Reference Input */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Payment Reference <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={payAllReference}
                    onChange={(e) => setPayAllReference(e.target.value)}
                    placeholder="Enter payment reference for all payments..."
                    disabled={processingPayment}
                    className="disabled:opacity-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-gray-500 text-xs">
                    This reference will be used for all selected cost center payments
                  </p>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mb-2 font-bold text-gray-900 text-xl">Bulk Payment</h4>
                <p className="text-gray-600 text-sm">Select cost centers and enter payment details</p>
              </div>

              {/* Cost Centers Selection */}
              <div className="mb-6">
                <h5 className="mb-3 font-semibold text-gray-700">Select Cost Centers to Pay</h5>
                <div className="space-y-2 p-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {selectedCostCenters.map((costCenter) => (
                    <div key={costCenter.accountNumber} className="flex items-center space-x-3 hover:bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={`cc-${costCenter.accountNumber}`}
                        checked={costCenter.selected}
                        onChange={(e) => handleCostCenterSelection(costCenter.accountNumber, e.target.checked)}
                        className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`cc-${costCenter.accountNumber}`} className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900 text-sm">{costCenter.accountName}</div>
                        <div className="text-gray-500 text-xs">
                          {costCenter.accountNumber} • Amount Due: {formatCurrency(costCenter.amountDue)}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg">
                <div className="text-center">
                  <div className="mb-1 text-blue-600 text-sm">Total Amount for Selected Cost Centers</div>
                  <div className="font-bold text-blue-700 text-3xl">
                    {formatCurrency(selectedCostCenters.filter(cc => cc.selected).reduce((sum, cc) => sum + cc.amountDue, 0))}
                  </div>
                  <div className="mt-1 text-blue-600 text-sm">
                    {selectedCostCenters.filter(cc => cc.selected).length} cost center(s) selected
                  </div>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closePayAllModal}
                  disabled={processingPayment}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayAllSubmit}
                  disabled={!payAllAmount || parseFloat(payAllAmount) <= 0 || !payAllReference.trim() || processingPayment || selectedCostCenters.filter(cc => cc.selected).length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <>
                      <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 w-4 h-4" />
                      Process All Payments
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
