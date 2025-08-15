"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  FileText,
  User,
  DollarSign,
  Mail,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Building2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerQuoteForm({ companyName, accountInfo, onQuoteCreated }) {
  // Debug logging for accountInfo
  useEffect(() => {
    console.log('CustomerQuoteForm - accountInfo received:', {
      accountInfo,
      new_account_number: accountInfo?.new_account_number,
      account_number: accountInfo?.account_number,
      id: accountInfo?.id
    });
  }, [accountInfo]);

  const [currentStep, setCurrentStep] = useState(0);
  const [productItems, setProductItems] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hasUserSelectedJobType, setHasUserSelectedJobType] = useState(false);

  const [formData, setFormData] = useState({
    jobType: "",
    description: "",
    purchaseType: "purchase", // "purchase" or "rental"
    customerName: accountInfo?.company_trading_name || accountInfo?.company || companyName || "",
    customerEmail: accountInfo?.email || "",
    customerPhone: accountInfo?.landline_no || "",
    customerAddress: accountInfo?.address || "",
    extraNotes: "",
    emailSubject: "",
    emailBody: "",
    quoteFooter:
      "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
  });

  // De-install specific state
  const [deInstallData, setDeInstallData] = useState({
    stockReceived: null,
    availableVehicles: [],
    selectedVehicles: [],
    vehicleStock: [],
    selectedStock: [],
  });

  // Client stock state for installation
  const [clientStockData, setClientStockData] = useState({
    availableStock: [],
    selectedStock: [],
    loading: false,
    error: null,
    calculatedTotal: 0,
    productDetails: {},
  });

  const [customerDataLoading, setCustomerDataLoading] = useState(false);
  const [fetchedCustomerData, setFetchedCustomerData] = useState(null);

  // Helper function to get account number with fallbacks
  const getAccountNumber = useCallback(() => {
    // Priority 1: Extract account number from URL path (e.g., /protected/fc/accounts/ACEA-0001)
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      console.log('URL path parts:', pathParts);
      
      const accountIndex = pathParts.findIndex(part => part === 'accounts');
      console.log('Found accounts at index:', accountIndex);
      
      if (accountIndex !== -1 && accountIndex + 1 < pathParts.length) {
        const urlAccountNumber = pathParts[accountIndex + 1];
        console.log('Potential account number from path:', urlAccountNumber);
        
        // Check if it looks like an account number (contains letters and numbers, possibly with hyphens)
        const isAccountNumber = /^[A-Z0-9-]+$/i.test(urlAccountNumber);
        console.log('Regex test result for', urlAccountNumber, ':', isAccountNumber);
        
        if (urlAccountNumber && isAccountNumber) {
          console.log('Using account number from URL path:', urlAccountNumber);
          return urlAccountNumber;
        }
      }
    }
    
    // Priority 2: accountInfo props (fallback)
    let accountNumber = accountInfo?.new_account_number || accountInfo?.account_number;
    if (accountNumber) {
      console.log('Using account number from accountInfo:', accountNumber);
      return accountNumber;
    }
    
    console.warn('No account number found in URL path or accountInfo');
    return null;
  }, [accountInfo]);

  const steps = [
    {
      id: 0,
      title: "Job Details",
      subtitle: "Basic job information",
      icon: FileText,
    },
    {
      id: 1,
      title: "Customer Details",
      subtitle: "Customer information",
      icon: User,
    },
    {
      id: 2,
      title: "Quote Details",
      subtitle: "Pricing and terms",
      icon: DollarSign,
    },
    { id: 3, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];

  // Product types and categories for filtering
  const productTypes = [
    "FMS", "BACKUP", "MODULE", "INPUT", "PFK CAMERA", "DASHCAM", "PTT", "DVR CAMERA"
  ];

  const productCategories = [
    "HARDWARE", "MODULES", "INPUTS", "CAMERA EQUIPMENT", "AI MOVEMENT DETECTION", "PTT RADIOS"
  ];

  useEffect(() => {
    if (formData.jobType === 'install' && hasUserSelectedJobType) {
      fetchProductItems();
    } else if (formData.jobType === 'deinstall' && hasUserSelectedJobType) {
      fetchVehiclesForDeinstall();
    }
  }, [formData.jobType, selectedType, selectedCategory, searchTerm, hasUserSelectedJobType]);

  // Calculate client stock total when selected stock changes
  useEffect(() => {
    if (formData.jobType === 'install' && clientStockData.selectedStock.length > 0) {
      calculateClientStockTotal();
    }
  }, [clientStockData.selectedStock, formData.jobType]);

  // Fetch stock for selected vehicles in de-installation
  useEffect(() => {
    if (formData.jobType === 'deinstall' && deInstallData.selectedVehicles.length > 0 && deInstallData.stockReceived === true) {
      fetchStockForSelectedVehicles();
    }
  }, [deInstallData.selectedVehicles, deInstallData.stockReceived]);

  // Fetch vehicles for de-install
  const fetchVehiclesForDeinstall = async () => {
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      
             // Use new_account_number from accountInfo
       const accountNumber = getAccountNumber();
      
      if (!accountNumber) {
        toast.error("No account number available");
        return;
      }
      
      const res = await fetch(`${baseUrl}/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setDeInstallData(prev => ({ ...prev, availableVehicles: data.vehicles || [] }));
      } else {
        throw new Error(data.error || "Failed to fetch vehicles");
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      toast.error("Failed to fetch vehicles", {
        description: error.message,
        duration: 5000,
      });
    }
  };

  // Fetch customer data when about to create a quote
  const fetchCustomerData = useCallback(async (accountNumber) => {
    if (!accountNumber) return;
    
    setCustomerDataLoading(true);
    try {
      // Query customers table where account_number matches the new_account_number
      const response = await fetch(`/api/customers/fetch-by-account?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      const data = await response.json();
      
      if (data.success && data.customer) {
        // Store the fetched customer data instead of immediately updating the form
        setFetchedCustomerData(data.customer);
        console.log('Customer data fetched and stored:', data.customer);
        toast.success('Customer details loaded successfully', {
          description: 'Contact information is ready to be populated',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      // Don't show error toast as this is not critical for quote creation
    } finally {
      setCustomerDataLoading(false);
    }
  }, []);

  // Fetch customer data when account loads (not just when reaching customer details step)
  useEffect(() => {
    const accountNumber = getAccountNumber();
    
    if (accountNumber && !fetchedCustomerData) {
      console.log('Fetching customer data when account loads for account:', accountNumber);
      console.log('This will query customers table where account_number =', accountNumber);
      fetchCustomerData(accountNumber);
    }
  }, [accountInfo, getAccountNumber, fetchCustomerData, fetchedCustomerData]);

  // Populate form with fetched customer data when reaching customer details step
  useEffect(() => {
    if (currentStep === 1 && fetchedCustomerData) { // Customer Details step
      console.log('Populating form with fetched customer data:', fetchedCustomerData);
      
      // Update form data with fetched customer information from customers table
      setFormData(prev => ({
        ...prev,
        customerName: fetchedCustomerData.trading_name || fetchedCustomerData.company || fetchedCustomerData.legal_name || prev.customerName,
        customerEmail: fetchedCustomerData.email || prev.customerEmail,
        customerPhone: fetchedCustomerData.cell_no || fetchedCustomerData.switchboard || prev.customerPhone,
        customerAddress: [
          fetchedCustomerData.physical_address_1,
          fetchedCustomerData.physical_address_2,
          fetchedCustomerData.physical_address_3,
          fetchedCustomerData.physical_area,
          fetchedCustomerData.physical_province,
          fetchedCustomerData.physical_code,
          fetchedCustomerData.physical_country
        ].filter(Boolean).join(', ') || prev.customerAddress,
      }));
      
      toast.success('Customer details populated automatically', {
        description: 'Contact information has been filled from customers table',
        duration: 3000,
      });
    }
  }, [currentStep, fetchedCustomerData]);

  // Auto-fetch customer data when entering customer details step (fallback)
  useEffect(() => {
    if (currentStep === 1 && !fetchedCustomerData) { // Customer Details step
      const accountNumber = getAccountNumber();
      
      if (accountNumber) {
        console.log('Fallback: fetching customer data for account:', accountNumber);
        console.log('This will query customers table where account_number =', accountNumber);
        fetchCustomerData(accountNumber);
      } else {
        console.warn('No account number available for fetching customer data');
      }
    }
  }, [currentStep, getAccountNumber, fetchCustomerData, fetchedCustomerData]);



  const fetchProductItems = async () => {
    setLoadingProducts(true);
    setProductError(null);
    try {
      const params = new URLSearchParams();
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/product-items?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
      const data = await res.json();
      setProductItems(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError(error.message);
      setProductItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = (product) => {
    const newProduct = {
      id: product.id,
      name: product.product,
      description: product.description,
      type: product.type,
      category: product.category,
      cashPrice: product.price || 0,
      cashDiscount: product.discount || 0,
      rentalPrice: product.rental || 0,
      rentalDiscount: 0,
      installationPrice: formData.jobType === 'install' ? (product.installation || 0) : 0,
      installationDiscount: 0,
      deInstallationPrice: formData.jobType === 'deinstall' ? (product.installation || 0) : 0,
      deInstallationDiscount: 0,
      subscriptionPrice: product.subscription || 0,
      subscriptionDiscount: 0,
      quantity: 1,
      purchaseType: formData.purchaseType,
    };
    setSelectedProducts([...selectedProducts, newProduct]);
    toast.success("Product Added Successfully", {
      description: `${product.product} has been added to the quote.`,
      duration: 5000,
    });
  };

  const removeProduct = (index) => {
    const productName = selectedProducts[index].name;
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
    toast.info("Product Removed", {
      description: `${productName} has been removed from the quote.`,
      duration: 5000,
    });
  };

  const updateProduct = (index, field, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index][field] = value;
    setSelectedProducts(updatedProducts);
  };

  const calculateGrossAmount = (price, discount) => {
    // Discount is a fixed amount, not a percentage
    return Math.max(0, price - discount);
  };

  const getProductTotal = (product) => {
    let total = 0;
    
    if (product.purchaseType === 'purchase') {
      // Cash price calculation
      const cashGross = calculateGrossAmount(product.cashPrice, product.cashDiscount);
      total += cashGross;
    } else {
      // Rental price calculation
      const rentalGross = calculateGrossAmount(product.rentalPrice, product.rentalDiscount);
      total += rentalGross;
    }

    // Add installation/de-installation cost with discount
    if (formData.jobType === 'install') {
      const installationGross = calculateGrossAmount(product.installationPrice, product.installationDiscount || 0);
      total += installationGross;
    } else if (formData.jobType === 'deinstall') {
      const deInstallationGross = calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount || 0);
      total += deInstallationGross;
    }

    // Add subscription if rental with discount
    if (product.purchaseType === 'rental' && product.subscriptionPrice) {
      const subscriptionGross = calculateGrossAmount(product.subscriptionPrice, product.subscriptionDiscount || 0);
      total += subscriptionGross;
    }

    return total * product.quantity;
  };

  const getTotalQuoteAmount = () => {
    return selectedProducts.reduce((total, product) => total + getProductTotal(product), 0);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.jobType && formData.description && formData.purchaseType;
      case 1:
        return formData.customerName && formData.customerEmail && formData.customerPhone;
      case 2:
        // For de-install, we don't need products
        if (formData.jobType === 'deinstall') {
          return true;
        }
        
        // For installation, check if products are selected
        if (formData.jobType === 'install') {
          return selectedProducts.length > 0;
        }
        
        return false;
      case 3:
        return formData.emailSubject && formData.emailBody;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (!canProceed()) {
      toast.error("Form Incomplete", {
        description: "Please complete all required fields to proceed to the next step.",
        duration: 5000,
      });
      return;
    }
    
    const nextStep = Math.min(steps.length - 1, currentStep + 1);
    setCurrentStep(nextStep);
    
    if (nextStep === 1) {
      toast.success("Job Details Complete", {
        description: "Moving to customer information.",
        duration: 5000,
      });
    } else if (nextStep === 2) {
      toast.success("Customer Details Complete", {
        description: "Moving to quote pricing details.",
        duration: 5000,
      });
    } else if (nextStep === 3) {
      toast.success("Quote Details Complete", {
        description: "Moving to email configuration.",
        duration: 5000,
      });
    }
  };

  const handlePreviousStep = () => {
    const prevStep = Math.max(0, currentStep - 1);
    setCurrentStep(prevStep);
  };

  const handleSubmitQuote = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
                   // Use fetched customer data if available, otherwise fetch it
      const accountNumber = getAccountNumber();
      console.log('=== ACCOUNT NUMBER DEBUG ===');
      console.log('Final resolved account number:', accountNumber);
      console.log('URL pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A');
      console.log('URL path parts:', typeof window !== 'undefined' ? window.location.pathname.split('/') : 'N/A');
      console.log('Account info:', accountInfo);
      console.log('===========================');
      
      if (accountNumber && !fetchedCustomerData) {
        await fetchCustomerData(accountNumber);
      }

      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

      // Calculate totals
      let subtotal = 0;
      let quotationProducts = [];

      if (formData.jobType === 'deinstall') {
        // De-installation quote
        subtotal = deInstallData.selectedStock.length * 500;
        quotationProducts = deInstallData.selectedStock.map(stock => ({
          id: stock.id,
          name: stock.product,
          description: stock.description,
          type: 'De-installation',
          category: 'Service',
          quantity: 1,
          purchase_type: 'service',
          cash_price: 500,
          cash_discount: 0,
          cash_gross: 500,
          total_price: 500
        }));
      } else {
        // Installation quote
        subtotal = getTotalQuoteAmount();
        quotationProducts = selectedProducts.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          type: product.type,
          category: product.category,
          quantity: product.quantity,
          purchase_type: product.purchaseType,
          cash_price: product.cashPrice,
          cash_discount: product.cashDiscount,
          cash_gross: calculateGrossAmount(product.cashPrice, product.cashDiscount),
          rental_price: product.rentalPrice,
          rental_discount: product.rentalDiscount,
          rental_gross: calculateGrossAmount(product.rentalPrice, product.rentalDiscount),
          installation_price: product.installationPrice,
          installation_discount: product.installationDiscount,
          installation_gross: calculateGrossAmount(product.installationPrice, product.installationDiscount),
          de_installation_price: product.deInstallationPrice,
          de_installation_discount: product.deInstallationDiscount,
          de_installation_gross: calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount),
          subscription_price: product.subscriptionPrice,
          subscription_discount: product.subscriptionDiscount,
          subscription_gross: calculateGrossAmount(product.subscriptionPrice, product.subscriptionDiscount),
          total_price: getProductTotal(product)
        }));
      }

      const vatAmount = subtotal * 0.15; // 15% VAT
      const totalAmount = subtotal + vatAmount;

      const quotationData = {
        // Job details
        jobType: formData.jobType,
        jobDescription: formData.description,
        purchaseType: formData.purchaseType,
        quotationJobType: formData.jobType,
        
        // Customer information
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        
                         // Account information (for internal quotes)
        accountId: accountInfo?.id,
        accountNumber: getAccountNumber(),
        new_account_number: getAccountNumber(), // Explicitly set new_account_number for client_quotes table
        
        // Quotation products with detailed pricing
        quotationProducts: quotationProducts,
        
        // Totals
        quotationSubtotal: subtotal,
        quotationVatAmount: vatAmount,
        quotationTotalAmount: totalAmount,
        
        // Email details
        quoteEmailSubject: formData.emailSubject || `Quotation for ${formData.customerName}`,
        quoteEmailBody: formData.emailBody || `Dear ${formData.customerName},\n\nPlease find attached our quotation for your requested services.\n\nBest regards,\nGot Motion Team`,
        quoteEmailFooter: formData.quoteFooter,
        quoteNotes: formData.extraNotes || '',
        
        // Quote type
        quoteType: 'internal'
      };

      console.log('Submitting quotation data:', quotationData);
                    console.log('Account info being used:', {
          id: accountInfo?.id,
          new_account_number: accountInfo?.new_account_number,
          account_number: accountInfo?.account_number,
          company: accountInfo?.company,
          company_trading_name: accountInfo?.company_trading_name,
          fullAccountInfo: accountInfo,
          resolvedAccountNumber: getAccountNumber()
        });
        
        console.log('Final account number being sent:', {
          accountNumber: getAccountNumber(),
          new_account_number: getAccountNumber(),
          urlParams: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).toString() : 'N/A'
        });
      
      // Send data to client_quotes API
      console.log('Final quotation data being sent:', JSON.stringify(quotationData, null, 2));
      
      const response = await fetch(`${baseUrl}/api/client-quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client quote');
      }

      // Show success toast
      toast.success('Client quote created successfully!', {
        description: `Quote Number: ${result.data.job_number}`,
        duration: 5000,
      });
      
      if (onQuoteCreated) {
        onQuoteCreated();
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      
      // Show error toast
      toast.error('Failed to create quote', {
        description: error.message || 'Please try again.',
        duration: 5000,
      });
      
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderJobDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Job Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type *</Label>
            <Select
              value={formData.jobType}
              onValueChange={(value) => {
                setFormData({ ...formData, jobType: value });
                setHasUserSelectedJobType(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="install">Installation</SelectItem>
                <SelectItem value="deinstall">De-installation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.jobType !== 'deinstall' && (
            <div className="space-y-2">
              <Label htmlFor="purchaseType">Purchase Type *</Label>
              <Select
                value={formData.purchaseType}
                onValueChange={(value) =>
                  setFormData({ ...formData, purchaseType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Job Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe the job requirements..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderCustomerDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Details
          {customerDataLoading && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
              Loading contact details...
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              disabled={customerDataLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email Address *</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              disabled={customerDataLoading}
            />
          </div>
        </div>

        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number"
              value={formData.customerPhone}
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
              disabled={customerDataLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              placeholder="Enter address"
              value={formData.customerAddress}
              onChange={(e) =>
                setFormData({ ...formData, customerAddress: e.target.value })
              }
              disabled={customerDataLoading}
            />
          </div>
        </div>
        
        {customerDataLoading && (
          <div className="bg-blue-50 p-3 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
              <span className="text-sm">Automatically loading contact details from your account...</span>
            </div>
          </div>
        )}
        
        {!customerDataLoading && (
          <div className="flex justify-between items-center">
            <div className="text-gray-600 text-sm">
              Contact details will be automatically loaded from your account
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const accountNumber = getAccountNumber();
                
                if (accountNumber) {
                  if (fetchedCustomerData) {
                    // If we already have the data, just populate the form
                    console.log('Re-populating form with existing customer data:', fetchedCustomerData);
                    setFormData(prev => ({
                      ...prev,
                      customerName: fetchedCustomerData.trading_name || fetchedCustomerData.company || fetchedCustomerData.legal_name || prev.customerName,
                      customerEmail: fetchedCustomerData.email || prev.customerEmail,
                      customerPhone: fetchedCustomerData.cell_no || fetchedCustomerData.switchboard || prev.customerPhone,
                      customerAddress: [
                        fetchedCustomerData.physical_address_1,
                        fetchedCustomerData.physical_address_2,
                        fetchedCustomerData.physical_address_3,
                        fetchedCustomerData.physical_area,
                        fetchedCustomerData.physical_province,
                        fetchedCustomerData.physical_code,
                        fetchedCustomerData.physical_country
                      ].filter(Boolean).join(', ') || prev.customerAddress,
                    }));
                    
                    toast.success('Customer details re-populated', {
                      description: 'Contact information has been refreshed',
                      duration: 3000,
                    });
                  } else {
                    // Fetch new data if we don't have it
                    fetchCustomerData(accountNumber);
                  }
                } else {
                  toast.error('No account number available', {
                    description: 'Please ensure you have access to an account',
                    duration: 3000,
                  });
                }
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              <User className="mr-2 w-4 h-4" />
              Reload Contact Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderQuoteDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Quote Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formData.jobType === 'deinstall' ? (
          // De-installation form
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stock Received</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="stockReceived"
                      value="true"
                      checked={deInstallData.stockReceived === true}
                      onChange={(e) => setDeInstallData(prev => ({ ...prev, stockReceived: e.target.value === 'true' }))}
                      className="text-blue-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="stockReceived"
                      value="false"
                      checked={deInstallData.stockReceived === false}
                      onChange={(e) => setDeInstallData(prev => ({ ...prev, stockReceived: e.target.value === 'true' }))}
                      className="text-blue-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {deInstallData.stockReceived === true && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Vehicles</Label>
                    <div className="gap-2 grid grid-cols-1 md:grid-cols-2 max-h-40 overflow-y-auto">
                      {deInstallData.availableVehicles.map((vehicle) => (
                        <label key={vehicle.id} className="flex items-center space-x-2 hover:bg-gray-50 p-2 border rounded">
                          <input
                            type="checkbox"
                            checked={deInstallData.selectedVehicles.includes(vehicle.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDeInstallData(prev => ({
                                  ...prev,
                                  selectedVehicles: [...prev.selectedVehicles, vehicle.id]
                                }));
                              } else {
                                setDeInstallData(prev => ({
                                  ...prev,
                                  selectedVehicles: prev.selectedVehicles.filter(id => id !== vehicle.id)
                                }));
                              }
                            }}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{vehicle.group_name || vehicle.plate_number || 'Unknown Vehicle'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {deInstallData.selectedVehicles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Stock Items</Label>
                      <div className="gap-2 grid grid-cols-1 md:grid-cols-2 max-h-40 overflow-y-auto">
                        {deInstallData.vehicleStock.map((item) => (
                          <label key={item.id} className="flex items-center space-x-2 hover:bg-gray-50 p-2 border rounded">
                            <input
                              type="checkbox"
                              checked={deInstallData.selectedStock.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDeInstallData(prev => ({
                                    ...prev,
                                    selectedStock: [...prev.selectedStock, item.id]
                                  }));
                                } else {
                                  setDeInstallData(prev => ({
                                    ...prev,
                                    selectedStock: prev.selectedStock.filter(id => id !== item.id)
                                  }));
                                }
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm">{item.name || 'Unknown Item'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="mb-2 font-semibold text-blue-800">De-installation Summary</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Stock Received:</strong> {deInstallData.stockReceived ? 'Yes' : 'No'}</p>
                  {deInstallData.stockReceived && (
                    <>
                      <p><strong>Selected Vehicles:</strong> {deInstallData.selectedVehicles.length} vehicles</p>
                      <p><strong>Selected Stock Items:</strong> {deInstallData.selectedStock.length} items</p>
                      <p><strong>De-installation Fee:</strong> R {deInstallData.selectedStock.length * 500}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Installation form with product selection
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Select Products</h3>
            </div>

            {/* Filters */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search Products</Label>
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {productTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingProducts && (
              <div className="py-4 text-center">
                <div className="mx-auto border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading products...</p>
              </div>
            )}

            {productError && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-red-800 text-sm">{productError}</p>
                </div>
              </div>
            )}

            {/* Product List */}
            {!loadingProducts && !productError && (
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                {productItems.map((product) => (
                  <Card key={product.id} className="hover:shadow-md p-4 transition-shadow cursor-pointer">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm">{product.product}</h4>
                          <p className="text-gray-600 text-xs">{product.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">{product.type}</span>
                            <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs">{product.category}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => addProduct(product)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1 text-gray-500 text-xs">
                        <div>Cash: R {product.price?.toFixed(2) || '0.00'}</div>
                        <div>Rental: R {product.rental?.toFixed(2) || '0.00'}/month</div>
                        <div>Installation: R {product.installation?.toFixed(2) || '0.00'}</div>
                        {product.subscription && <div>Subscription: R {product.subscription.toFixed(2)}/month</div>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {productItems.length === 0 && !loadingProducts && !productError && (
              <div className="py-8 text-center">
                <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p className="text-gray-500">No products found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Selected Products</h3>
                {selectedProducts.map((product, index) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-gray-600 text-sm">{product.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">{product.type}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs">{product.category}</span>
                          <span className="bg-green-100 px-2 py-1 rounded text-green-800 text-xs capitalize">{product.purchaseType}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeProduct(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Product Information Header */}
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mb-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Input
                          value={product.name}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) =>
                            updateProduct(index, "quantity", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>

                    {/* Pricing Grid */}
                    <div className="space-y-4">
                      <div className="gap-4 grid grid-cols-4 pb-2 border-b font-medium text-gray-700 text-sm">
                        <div>Base Price</div>
                        <div>Discount</div>
                        <div>Gross Price</div>
                        <div>Total Price</div>
                      </div>
                      
                      {/* Cash Price Row */}
                      {product.purchaseType === 'purchase' && (
                        <div className="items-center gap-4 grid grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Cash Price ex VAT</Label>
                            <Input
                              type="number"
                              value={product.cashPrice}
                              onChange={(e) =>
                                updateProduct(index, "cashPrice", parseFloat(e.target.value) || 0)
                              }
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Discount</Label>
                            <Input
                              type="number"
                              value={product.cashDiscount}
                              onChange={(e) =>
                                updateProduct(index, "cashDiscount", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Gross Cash ex VAT</Label>
                            <Input
                              value={calculateGrossAmount(product.cashPrice, product.cashDiscount).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Total Cash ex VAT</Label>
                            <Input
                              value={(calculateGrossAmount(product.cashPrice, product.cashDiscount) * product.quantity).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Rental Price Row */}
                      {product.purchaseType === 'rental' && (
                        <div className="items-center gap-4 grid grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Rental Price ex VAT</Label>
                            <Input
                              type="number"
                              value={product.rentalPrice}
                              onChange={(e) =>
                                updateProduct(index, "rentalPrice", parseFloat(e.target.value) || 0)
                              }
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Discount</Label>
                            <Input
                              type="number"
                              value={product.rentalDiscount}
                              onChange={(e) =>
                                updateProduct(index, "rentalDiscount", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Gross Rental/Month ex VAT</Label>
                            <Input
                              value={calculateGrossAmount(product.rentalPrice, product.rentalDiscount).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Total Rental/Month ex VAT</Label>
                            <Input
                              value={(calculateGrossAmount(product.rentalPrice, product.rentalDiscount) * product.quantity).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Installation Row */}
                      {formData.jobType === 'install' && (
                        <div className="items-center gap-4 grid grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Once Off Installation</Label>
                            <Input
                              type="number"
                              value={product.installationPrice}
                              onChange={(e) =>
                                updateProduct(index, "installationPrice", parseFloat(e.target.value) || 0)
                              }
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Installation Discount *</Label>
                            <Input
                              type="number"
                              value={product.installationDiscount || 0}
                              onChange={(e) =>
                                updateProduct(index, "installationDiscount", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Gross Once Off Installation</Label>
                            <Input
                              value={calculateGrossAmount(product.installationPrice, product.installationDiscount || 0).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Total Once Off Installation</Label>
                            <Input
                              value={(calculateGrossAmount(product.installationPrice, product.installationDiscount || 0) * product.quantity).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Subscription Row */}
                      {product.purchaseType === 'rental' && product.subscriptionPrice > 0 && (
                        <div className="items-center gap-4 grid grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Monthly Subscription</Label>
                            <Input
                              type="number"
                              value={product.subscriptionPrice}
                              onChange={(e) =>
                                updateProduct(index, "subscriptionPrice", parseFloat(e.target.value) || 0)
                              }
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Subscription Discount</Label>
                            <Input
                              type="number"
                              value={product.subscriptionDiscount || 0}
                              onChange={(e) =>
                                updateProduct(index, "subscriptionDiscount", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Gross Monthly Subscription</Label>
                            <Input
                              value={calculateGrossAmount(product.subscriptionPrice, product.subscriptionDiscount || 0).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 text-xs">Total Monthly Subscription</Label>
                            <Input
                              value={(calculateGrossAmount(product.subscriptionPrice, product.subscriptionDiscount || 0) * product.quantity).toFixed(2)}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Product Total:</span>
                        <span className="font-bold text-lg">
                          R {getProductTotal(product).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-800">Total Quote Amount:</span>
                    <span className="font-bold text-blue-800 text-2xl">
                      R {getTotalQuoteAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="extraNotes">Extra Notes</Label>
          <Textarea
            id="extraNotes"
            placeholder="Add any additional notes for the quote..."
            value={formData.extraNotes}
            onChange={(e) =>
              setFormData({ ...formData, extraNotes: e.target.value })
            }
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderEmailForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emailSubject">Email Subject *</Label>
          <Input
            id="emailSubject"
            placeholder="Enter email subject"
            value={formData.emailSubject}
            onChange={(e) =>
              setFormData({ ...formData, emailSubject: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailBody">Email Body *</Label>
          <Textarea
            id="emailBody"
            placeholder="Email body text"
            value={formData.emailBody}
            onChange={(e) =>
              setFormData({ ...formData, emailBody: e.target.value })
            }
            className="min-h-40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quoteFooter">Quote Footer *</Label>
          <Textarea
            id="quoteFooter"
            value={formData.quoteFooter}
            onChange={(e) =>
              setFormData({ ...formData, quoteFooter: e.target.value })
            }
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderJobDetailsForm();
      case 1:
        return renderCustomerDetailsForm();
      case 2:
        return renderQuoteDetailsForm();
      case 3:
        return renderEmailForm();
      default:
        return null;
    }
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "pending";
  };

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-3xl">Create Quote for {companyName}</h1>
          <p className="text-gray-600">
            Follow the steps to create a professional quote for this customer
          </p>
        </div>

        {submitError && (
          <div className="bg-red-50 mb-4 p-4 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const status = getStepStatus(index);
                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : status === "current"
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-gray-200 border-gray-300 text-gray-500"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm font-medium ${
                          status === "current"
                            ? "text-blue-600"
                            : status === "completed"
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-gray-400 text-xs">{step.subtitle}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="bg-gray-300 ml-4 w-8 h-0.5"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-8">{renderStepContent()}</div>

        <div className="flex justify-between">
          <Button
            onClick={handlePreviousStep}
            disabled={currentStep === 0}
            variant="outline"
          >
            Previous
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmitQuote}
              disabled={!canProceed() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
                  Creating Quote...
                </>
              ) : (
                <>
                  <FileText className="mr-2 w-4 h-4" />
                  Create Quote
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNextStep}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 