"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Mail,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Building2,
  Search,
  X,
  Car,
  ArrowLeft,
} from "lucide-react";
import { FaR } from "react-icons/fa6";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getVehiclesByAccountNumber } from "@/lib/actions/vehicles";
import DeinstallationFlow from "./DeinstallationFlow";

export default function ClientQuoteForm({ customer, vehicles, onQuoteCreated, accountInfo }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [productItems, setProductItems] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hasUserSelectedJobType, setHasUserSelectedJobType] = useState(false);
  const [newEmailRecipient, setNewEmailRecipient] = useState("");
  const [productTypes, setProductTypes] = useState([]);
  const [productCategories, setProductCategories] = useState([]);

  // De-install specific state
  const [deInstallData, setDeInstallData] = useState({
    availableVehicles: vehicles || [],
    selectedVehicles: [],
    loadingVehicles: false,
    vehiclesLoaded: 0,
    totalVehicles: 0,
    currentStep: 0, // 0: Vehicle selection, 1: Parts selection
    currentVehicleId: null, // Currently selected vehicle for parts viewing
  });

  // Log when vehicles prop changes
  useEffect(() => {
    console.log('ClientQuoteForm received vehicles:', vehicles);
  }, [vehicles]);

  // New function to fetch vehicles from vehicles table
  const fetchVehiclesFromIP = useCallback(async (loadAll = true) => {
    if (!accountInfo?.new_account_number) {
      console.log('No account number available for fetching vehicles');
      return;
    }
    
    try {
      setDeInstallData(prev => ({ ...prev, loadingVehicles: true }));
      
      // Fetch ALL vehicles from vehicles table for this account using server action
      // For de-installation, we want to show all vehicles by default
      const result = await getVehiclesByAccountNumber(accountInfo.new_account_number, 1, loadAll ? 1000 : 1000);
      
      if (result.success) {
        const allAccountVehicles = result.vehicles || [];
        
        console.log('Fetched all vehicles for account:', allAccountVehicles);
        
        // For de-installation, show all vehicles by default
        const initialCount = allAccountVehicles.length;
        const vehiclesToShow = allAccountVehicles;
        
        // Update available vehicles in deInstallData
        setDeInstallData(prev => ({ 
          ...prev, 
          availableVehicles: vehiclesToShow,
          totalVehicles: allAccountVehicles.length,
          vehiclesLoaded: initialCount
        }));
        
        // The vehicles are now available in deInstallData.availableVehicles
        // Equipment will be processed in the DeinstallationFlow component
        console.log('Vehicles loaded for de-installation:', vehiclesToShow.length);
        
        // Vehicle products will be processed dynamically in DeinstallationFlow
      } else {
        console.warn('Failed to fetch vehicles for account:', result.error);
        toast.error('Failed to load vehicles for de-installation');
        // Create default vehicle if fetch fails
        const defaultVehicle = {
          id: 'default-vehicle',
          fleet_number: 'Default Vehicle',
          reg: 'Default Vehicle',
          company: 'Default Company',
          products: []
        };
        
        setDeInstallData(prev => ({ 
          ...prev, 
          availableVehicles: [defaultVehicle],
          totalVehicles: 1,
          vehiclesLoaded: 1,
          vehicleProducts: {
            'default-vehicle': [{
              id: 'default-product',
              name: "Telematics Unit",
              description: "Standard telematics unit with GPS tracking",
              type: "FMS",
              category: "HARDWARE",
              installation_price: 0,
              de_installation_price: 500,
              price: 0,
              rental: 0,
              code: 'DEFAULT',
              vehicleId: 'default-vehicle',
              vehiclePlate: 'Default Vehicle'
            }]
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching vehicle products:', error);
      toast.error('Failed to load vehicle products');
    } finally {
      setDeInstallData(prev => ({ ...prev, loadingVehicles: false }));
    }
  }, [accountInfo?.new_account_number]);

  // Helper function to construct full address from customer data
  const constructAddress = useCallback((customer) => {
    if (!customer) return '';
    
    const physicalAddress = [
      customer.physical_address_1,
      customer.physical_address_2,
      customer.physical_address_3,
      customer.physical_area,
      customer.physical_province,
      customer.physical_code,
      customer.physical_country
    ].filter(Boolean).join(', ');
    
    const postalAddress = [
      customer.postal_address_1,
      customer.postal_address_2,
      customer.postal_area,
      customer.postal_province,
      customer.postal_code,
      customer.postal_country
    ].filter(Boolean).join(', ');
    
    return physicalAddress || postalAddress || '';
  }, []);

  // Fetch customer data from customers table
  const fetchCustomerData = useCallback(async (accountNumber) => {
    if (!accountNumber) return;
    
    console.log('fetchCustomerData called with accountNumber:', accountNumber);
    
    try {
      const response = await fetch(`/api/customers/match-account?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to fetch customer data';
        
        if (response.status === 404) {
          // Customer not found - show toast message
          toast.error('No contact information found for this customer');
        } else {
          console.error('API Error:', response.status, errorMessage);
        }
        return; // Don't throw error, just return
      }
      const data = await response.json();
      
      if (data.success && data.customer) {
        // Update form data with fetched customer information
        const customer = data.customer;
        
        // Check if customer has any contact information
        const hasContactInfo = customer.trading_name || customer.company || customer.legal_name ||
                              customer.branch_person_email || customer.email ||
                              customer.cell_no || customer.switchboard ||
                              constructAddress(customer);
        
        if (!hasContactInfo) {
          toast.error('No contact information found for this customer');
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          customerName: customer.trading_name || customer.company || customer.legal_name || prev.customerName,
          customerEmail: customer.branch_person_email || customer.email || prev.customerEmail,
          customerPhone: customer.cell_no || customer.switchboard || prev.customerPhone,
          customerAddress: constructAddress(customer) || prev.customerAddress,
        }));
        
        console.log('Customer data fetched and updated:', data.customer);
        console.log('Constructed address:', constructAddress(customer));
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Error fetching customer data');
    }
  }, [constructAddress]);

  const [formData, setFormData] = useState({
    jobType: "",
    description: "",
    purchaseType: "purchase", // "purchase" or "rental"
    customerName: accountInfo?.trading_name || customer?.trading_name || customer?.company || "",
    customerEmail: accountInfo?.branch_person_email || accountInfo?.email || customer?.branch_person_email || customer?.email || "",
    customerPhone: accountInfo?.cell_no || customer?.cell_no || customer?.switchboard || "",
    customerAddress: constructAddress(accountInfo) || constructAddress(customer) || "",
    // Vehicle information
    vehicle_registration: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    vin_number: "",
    odormeter: "",
    extraNotes: "",
    emailSubject: "",
    emailBody: "",
    // Email recipients
    emailRecipients: [],
    quoteFooter:
      "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
  });

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
      icon: FaR,
    },
    { id: 3, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];



  // Fetch filters on mount
  useEffect(() => {
    fetchFilters();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer || accountInfo) {
      const customerEmail = accountInfo?.branch_person_email || accountInfo?.email || customer?.branch_person_email || customer?.email || '';
      
      setFormData(prev => ({
        ...prev,
        customerName: accountInfo?.trading_name || customer?.trading_name || customer?.company || accountInfo?.company || '',
        customerEmail: customerEmail,
        customerPhone: accountInfo?.cell_no || customer?.cell_no || customer?.switchboard || accountInfo?.switchboard || '',
        customerAddress: constructAddress(accountInfo) || constructAddress(customer) || '',
        emailRecipients: customerEmail ? [customerEmail] : prev.emailRecipients,
      }));
    }
  }, [customer, accountInfo, constructAddress]);

  // Fetch customer data when accountInfo changes
  useEffect(() => {
    if (accountInfo?.new_account_number) {
      console.log('Fetching customer data for account:', accountInfo.new_account_number);
      fetchCustomerData(accountInfo.new_account_number);
    }
  }, [accountInfo?.new_account_number, fetchCustomerData]);

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/product-items?filters=true');
      if (res.ok) {
        const data = await res.json();
        setProductTypes(data.types || []);
        setProductCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  const fetchVehicleProducts = useCallback(async () => {
    if (!vehicles || vehicles.length === 0) {
      console.log('No vehicles available for fetching products');
      return;
    }
    
    try {
      setLoadingProducts(true);
      const vehicleProducts = {};
      
      // Fetch products for each selected vehicle
      for (const vehicle of vehicles) {
        if (!vehicle.id) {
          console.warn('Vehicle missing ID:', vehicle);
          continue;
        }
        
        try {
          const response = await fetch(`/api/vehicle-products?vehicle_id=${vehicle.id}`);
          if (response.ok) {
            const data = await response.json();
            vehicleProducts[vehicle.id] = data.products || [];
          } else {
            console.warn(`Failed to fetch products for vehicle ${vehicle.id}:`, response.status);
            // If no products found, create a default product for de-installation
            vehicleProducts[vehicle.id] = [
              {
                id: `default-${vehicle.id}`,
                name: "Telematics Unit",
                description: "Standard telematics unit with GPS tracking",
                type: "FMS",
                category: "HARDWARE",
                installation_price: 0, // User will fill in
                de_installation_price: 0, // User will fill in
                price: 0, // User will fill in
                rental: 0, // User will fill in
              }
            ];
          }
        } catch (vehicleError) {
          console.error(`Error fetching products for vehicle ${vehicle.id}:`, vehicleError);
          // Create default product even if fetch fails
          vehicleProducts[vehicle.id] = [
            {
              id: `default-${vehicle.id}`,
              name: "Telematics Unit",
              description: "Standard telematics unit with GPS tracking",
              type: "FMS",
              category: "HARDWARE",
              installation_price: 0, // User will fill in
              de_installation_price: 0, // User will fill in
              price: 0, // User will fill in
              rental: 0, // User will fill in
            }
          ];
        }
      }
      
      setDeInstallData(prev => ({ ...prev, vehicleProducts }));
    } catch (error) {
      console.error('Error fetching vehicle products:', error);
      toast.error('Failed to load vehicle products');
    } finally {
      setLoadingProducts(false);
    }
  }, [vehicles]);

  // Fetch vehicles from vehicles_ip when job type changes to deinstall
  useEffect(() => {
    if (formData.jobType === 'deinstall' && accountInfo?.new_account_number) {
      console.log('Job type changed to deinstall, fetching ALL vehicles from vehicles table');
      fetchVehiclesFromIP(true); // Load ALL vehicles for de-installation
    }
  }, [formData.jobType, accountInfo?.new_account_number, fetchVehiclesFromIP]);

  const fetchProductItems = useCallback(async () => {
    // Skip if no filters are set and we already have products
    if (selectedType === 'all' && selectedCategory === 'all' && !debouncedSearchTerm && productItems.length > 0) {
      return;
    }
    
    setLoadingProducts(true);
    setProductError(null);
    try {
      const params = new URLSearchParams();
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);

      const response = await fetch(`/api/product-items?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProductItems(data.products || []);
    } catch (err) {
      console.error('Error fetching product items:', err);
      setProductError('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedType, selectedCategory, debouncedSearchTerm, productItems.length]);

  // Effect for job type changes
  useEffect(() => {
    // Only fetch when job type changes and user has actually selected a job type
    if (formData.jobType === 'deinstall' && accountInfo?.new_account_number && hasUserSelectedJobType) {
      console.log('Job type changed to deinstall, fetching ALL vehicles from vehicles table');
      fetchVehiclesFromIP(true); // Load ALL vehicles for de-installation
    } else if (formData.jobType === 'install' && hasUserSelectedJobType) {
      console.log('Job type changed to install, fetching product items');
      fetchProductItems();
    } else if (formData.jobType === 'deinstall' && !accountInfo?.new_account_number && hasUserSelectedJobType) {
      console.log('Job type is deinstall but no account number available yet');
    }
  }, [formData.jobType, accountInfo?.new_account_number, hasUserSelectedJobType, fetchVehiclesFromIP, fetchProductItems]);

  // Separate effect for product filters
  useEffect(() => {
    if (formData.jobType === 'install') {
      fetchProductItems();
    }
  }, [selectedType, selectedCategory, debouncedSearchTerm, fetchProductItems]);

  const addProduct = useCallback((product) => {
    if (formData.jobType === 'deinstall') {
      // For de-installation, add vehicle with its products
      const vehicleWithProducts = {
        id: product.id,
        name: product.name,
        description: product.description + ' - marked for de-install',
        type: product.type,
        category: product.category,
        code: product.code || 'N/A',
        quantity: 1,
        purchaseType: 'service',
        cashPrice: product.de_installation_price || 500,
        cashDiscount: 0,
        rentalPrice: 0,
        rentalDiscount: 0,
        installationPrice: 0,
        installationDiscount: 0,
        deInstallationPrice: product.de_installation_price || 500,
        deInstallationDiscount: 0,
        subscriptionPrice: 0,
        subscriptionDiscount: 0,
        vehicleId: product.vehicleId,
        vehiclePlate: product.vehiclePlate,
      };
      setSelectedProducts(prev => [...prev, vehicleWithProducts]);
    } else {
      // For installation, add product normally - match external quotation structure
      const productWithDefaults = {
        id: product.id,
        name: product.product, // Use product.product instead of product.name
        description: product.description,
        type: product.type,
        category: product.category,
        code: product.code || 'N/A',
        quantity: 1,
        purchaseType: formData.purchaseType,
        cashPrice: product.price || 0,
        cashDiscount: 0,
        rentalPrice: product.rental || 0,
        rentalDiscount: 0,
        installationPrice: product.installation || 0,
        installationDiscount: 0,
        deInstallationPrice: product.installation || 0, // Use installation price for de-installation
        deInstallationDiscount: 0,
        subscriptionPrice: product.subscription || 0,
        subscriptionDiscount: 0,
      };
      setSelectedProducts(prev => [...prev, productWithDefaults]);
    }
  }, [formData.jobType, formData.purchaseType]);

  const removeProduct = useCallback((index) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateProduct = useCallback((index, field, value) => {
    setSelectedProducts(prev => 
      prev.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    );
  }, []);

  const calculateGrossAmount = useCallback((price, discount) => {
    // Discount is a fixed amount, not a percentage
    return Math.max(0, price - discount);
  }, []);

  const getProductTotal = useCallback((product) => {
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
  }, [formData.jobType, calculateGrossAmount]);

  const getTotalQuoteAmount = useMemo(() => {
    return selectedProducts.reduce((total, product) => total + getProductTotal(product), 0);
  }, [selectedProducts, getProductTotal]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.jobType && formData.description && formData.purchaseType;
      case 1:
        return formData.customerName && formData.customerEmail && formData.customerPhone;
      case 2:
        // For de-install, allow proceeding even without products (user can add pricing manually)
        if (formData.jobType === 'deinstall') {
          return true; // Allow proceeding, user can add products manually
        }
        
        // For installation, check if products are selected
        if (formData.jobType === 'install') {
          return (selectedProducts || []).length > 0;
        }
        
        return false;
      case 3:
        return formData.emailSubject && formData.emailBody && formData.emailRecipients && formData.emailRecipients.length > 0;
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
    
    // When moving to email step, ensure customer email is in recipients
    if (nextStep === 3 && formData.customerEmail && !formData.emailRecipients.includes(formData.customerEmail)) {
      setFormData(prev => ({
        ...prev,
        emailRecipients: [...prev.emailRecipients, formData.customerEmail]
      }));
    }
    
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

  // Function to add a new email recipient
  const handleAddRecipient = () => {
    if (!newEmailRecipient.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailRecipient)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Check if email is already in the recipients list
    if (formData.emailRecipients?.some(email => email === newEmailRecipient)) {
      toast.error("This email is already added");
      return;
    }
    
    // Add the new recipient
    setFormData(prev => ({
      ...prev,
      emailRecipients: [...(prev.emailRecipients || []), newEmailRecipient]
    }));
    
    // Clear the input field
    setNewEmailRecipient("");
  };
  
  // Function to remove a recipient
  const handleRemoveRecipient = (email) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email)
    }));
  };

  const handleSubmitQuote = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Fetch customer data when about to create a quote
      if (accountInfo?.new_account_number) {
        await fetchCustomerData(accountInfo.new_account_number);
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
        subtotal = getTotalQuoteAmount;
        quotationProducts = (selectedProducts || []).map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          type: product.type,
          category: product.category,
          quantity: product.quantity,
          purchase_type: 'service',
          cash_price: product.cashPrice,
          cash_discount: product.cashDiscount,
          cash_gross: calculateGrossAmount(product.cashPrice, product.cashDiscount),
          de_installation_price: product.deInstallationPrice,
          de_installation_discount: product.deInstallationDiscount,
          de_installation_gross: calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount),
          total_price: getProductTotal(product),
          vehicle_id: product.vehicleId,
          vehicle_plate: product.vehiclePlate,
        }));
      } else {
        // Installation quote
        subtotal = getTotalQuoteAmount;
        quotationProducts = (selectedProducts || []).map(product => ({
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
        
        // Vehicle information
        vehicleRegistration: formData.vehicle_registration || '',
        vehicleMake: formData.vehicle_make || '',
        vehicleModel: formData.vehicle_model || '',
        vehicleYear: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vinNumber: formData.vin_number || '',
        odormeter: formData.odormeter || '',
        
        // Account information (for internal quotes)
        new_account_number: accountInfo?.new_account_number || customer?.new_account_number || null,
        
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
        emailRecipients: (formData.emailRecipients || []).filter(email => email && email.trim() !== ''),
        
        // Quote type
        quoteType: 'internal',
        
        // Status - set to pending so it shows up for approval
        status: 'pending'
      };

      console.log('Submitting quotation data:', quotationData);
      
      // Send data to client_quotes API
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

      // Send email using NotificationAPI
      try {
        const emailResponse = await fetch(`${baseUrl}/api/send-quotation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteNumber: result.data.job_number,
            jobNumber: result.data.job_number,
            jobType: formData.jobType,
            clientName: formData.customerName,
            clientEmails: formData.emailRecipients || [formData.customerEmail],
            clientPhone: formData.customerPhone,
            clientAddress: formData.customerAddress,
            quoteDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            totalAmount: totalAmount,
            vatAmount: vatAmount,
            subtotal: subtotal,
            products: quotationProducts.map(p => ({
              name: p.name,
              description: p.description,
              quantity: p.quantity,
              unitPrice: p.total_price / p.quantity,
              total: p.total_price,
              vehiclePlate: p.vehicle_plate,
              purchaseType: p.purchase_type
            })),
            notes: formData.extraNotes,
            emailBody: formData.emailBody,
            emailSubject: formData.emailSubject,
            emailFooter: formData.quoteFooter,
            accountNumber: accountInfo?.new_account_number
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (emailResult.success) {
          toast.success('Client quote created and email sent successfully!', {
            description: `Quote Number: ${result.data.job_number} - Sent to ${emailResult.totalSent} recipients`,
            duration: 5000,
          });
        } else {
          toast.success('Client quote created successfully!', {
            description: `Quote Number: ${result.data.job_number} - Email failed: ${emailResult.error}`,
            duration: 5000,
          });
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.success('Client quote created successfully!', {
          description: `Quote Number: ${result.data.job_number} - Email could not be sent`,
          duration: 5000,
        });
      }
      
      // Reset form data
      setFormData({
        jobType: "",
        description: "",
        purchaseType: "purchase",
        customerName: accountInfo?.trading_name || customer?.trading_name || customer?.company || "",
        customerEmail: accountInfo?.branch_person_email || accountInfo?.email || customer?.branch_person_email || customer?.email || "",
        customerPhone: accountInfo?.cell_no || customer?.cell_no || customer?.switchboard || "",
        customerAddress: constructAddress(accountInfo) || constructAddress(customer) || "",
        // Vehicle information
        vehicle_registration: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_year: "",
        vin_number: "",
        odormeter: "",
        extraNotes: "",
        emailSubject: "",
        emailBody: "",
        quoteFooter:
          "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
      });
      
      // Reset other state
      setCurrentStep(0);
      setSelectedProducts([]);
      setSearchTerm("");
      setSelectedType("all");
      setSelectedCategory("all");
      setHasUserSelectedJobType(false);
      
      // Form submitted successfully - call callback after reset
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

  const toggleVehicleSelection = useCallback((vehicleId) => {
    setDeInstallData(prev => ({
      ...prev,
      selectedVehicles: prev.selectedVehicles.includes(vehicleId)
        ? prev.selectedVehicles.filter(id => id !== vehicleId)
        : [...prev.selectedVehicles, vehicleId]
    }));
  }, []);
  
  // Function to view parts for a specific vehicle
  const viewVehicleParts = useCallback((vehicleId) => {
    setDeInstallData(prev => ({
      ...prev,
      currentStep: 1, // Move to parts selection step
      currentVehicleId: vehicleId,
    }));
  }, []);
  
  // Function to go back to vehicle selection
  const backToVehicleSelection = useCallback(() => {
    setDeInstallData(prev => ({
      ...prev,
      currentStep: 0,
      currentVehicleId: null,
    }));
  }, []);

  // Removed addVehicleProducts as equipment is now processed dynamically

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type *</Label>
                  <Select
                    value={formData.jobType}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, jobType: value }));
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
                    <Label htmlFor="purchaseType">Cash Type *</Label>
                    <Select
                      value={formData.purchaseType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, purchaseType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cash type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Cash</SelectItem>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Vehicle Information Note */}
              <div className="bg-blue-50 p-3 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-2 h-2"></div>
                  <div className="text-blue-800 text-sm">
                    <p className="font-medium">Vehicle Information</p>
                    <p>You can add vehicle details in the next step (Customer Details). This information will be stored directly in the job card.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone *</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Input
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extraNotes">Additional Notes</Label>
                <Textarea
                  id="extraNotes"
                  value={formData.extraNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, extraNotes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {/* Vehicle Information Section */}
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Vehicle Information (Optional)</h3>
                <p className="mb-4 text-gray-600 text-sm">
                  Vehicle information is optional but will be stored with the quotation for future reference.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_registration">Vehicle Registration</Label>
                  <Input
                    id="vehicle_registration"
                    placeholder="Enter vehicle registration (optional)"
                    value={formData.vehicle_registration}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_registration: e.target.value })
                    }
                  />
                  <p className="text-gray-500 text-xs">
                    Vehicle registration is optional but will be stored if provided
                  </p>
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_make">Vehicle Make</Label>
                    <Input
                      id="vehicle_make"
                      placeholder="e.g., Toyota, Ford"
                      value={formData.vehicle_make}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_make: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_model">Vehicle Model</Label>
                    <Input
                      id="vehicle_model"
                      placeholder="e.g., Corolla, Ranger"
                      value={formData.vehicle_model}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_model: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_year">Vehicle Year</Label>
                    <Input
                      id="vehicle_year"
                      type="number"
                      placeholder="e.g., 2020"
                      value={formData.vehicle_year}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_year: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vin_number">VIN Number</Label>
                    <Input
                      id="vin_number"
                      placeholder="Enter VIN number"
                      value={formData.vin_number}
                      onChange={(e) =>
                        setFormData({ ...formData, vin_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odormeter">Odometer Reading</Label>
                    <Input
                      id="odormeter"
                      placeholder="Enter odometer reading"
                      value={formData.odormeter}
                      onChange={(e) =>
                        setFormData({ ...formData, odormeter: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Selected Products List - Show at top */}
            {(selectedProducts || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Selected Products ({selectedProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(selectedProducts || []).map((product, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 rounded-full w-3 h-3"></div>
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-gray-600 text-sm">
                              Qty: {product.quantity} • 
                              {product.purchaseType === 'purchase' ? (
                                <span className="text-green-600"> R{product.cashPrice?.toFixed(2) || '0.00'}</span>
                              ) : (
                                <span className="text-blue-600"> R{product.rentalPrice?.toFixed(2) || '0.00'}/month</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Selection */}
            {formData.jobType === 'install' && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
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
                      <Label>Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          {productTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {productCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                                     {/* Product List */}
                   {loadingProducts ? (
                     <div className="flex justify-center items-center py-8">
                       <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                       <span className="ml-2">Loading products...</span>
                     </div>
                   ) : productError ? (
                     <div className="py-4 text-red-600 text-center">{productError}</div>
                   ) : (
                                           <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
                        {(productItems || []).map((product) => (
                         <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer">
                           <CardContent className="p-4">
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <h4 className="font-semibold text-sm">{product.product}</h4>
                                 <p className="text-gray-600 text-xs">{product.description}</p>
                                 <div className="flex gap-2 mt-2">
                                   <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">{product.type}</span>
                                   <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs">{product.category}</span>
                                 </div>
                               </div>
                               <Button
                                 size="sm"
                                 onClick={() => addProduct(product)}
                                 className="bg-blue-600 hover:bg-blue-700"
                               >
                                 <Plus className="w-3 h-3" />
                               </Button>
                             </div>
                             <div className="space-y-1 text-gray-500 text-xs">
                               <div>Cash: R {product.price?.toFixed(2) || '0.00'}</div>
                               <div>Rental: R {product.rental?.toFixed(2) || '0.00'}/month</div>
                               <div>Installation: R {product.installation?.toFixed(2) || '0.00'}</div>
                               {product.subscription && <div>Subscription: R {product.subscription.toFixed(2)}/month</div>}
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* De-installation Vehicle Selection */}
            {formData.jobType === 'deinstall' && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {deInstallData.currentStep === 0 ? 'Vehicle Selection' : 'Vehicle Parts'}
                  </CardTitle>
                  {deInstallData.currentStep === 1 && deInstallData.currentVehicleId && (
                    <div className="text-sm text-gray-500 mt-1">
                      {(() => {
                        const vehicle = deInstallData.availableVehicles.find(v => v.id === deInstallData.currentVehicleId);
                        return vehicle ? 
                          `${vehicle.fleet_number || vehicle.reg || 'Unknown'} - ${vehicle.make || ''} ${vehicle.model || ''}` 
                          : 'Selected Vehicle';
                      })()}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <DeinstallationFlow
                    deInstallData={deInstallData}
                    setDeInstallData={setDeInstallData}
                    fetchVehiclesFromIP={fetchVehiclesFromIP}
                    toggleVehicleSelection={toggleVehicleSelection}
                    addProduct={addProduct}
                    viewVehicleParts={viewVehicleParts}
                    backToVehicleSelection={backToVehicleSelection}
                    selectedProducts={selectedProducts}
                  />
                  
                  {/* Selected vehicles summary */}
                  {(deInstallData.selectedVehicles || []).length > 0 && (
                    <div className="bg-blue-50 mt-4 p-4 rounded-lg">
                      <h4 className="mb-2 font-medium text-blue-900">Selected Vehicles: {(deInstallData.selectedVehicles || []).length}</h4>
                      <div className="space-y-2">
                        {(deInstallData.selectedVehicles || []).map(vehicleId => {
                          const vehicle = deInstallData.availableVehicles.find(v => v.id === vehicleId);
                          return (
                            <div key={vehicleId} className="flex justify-between items-center text-sm">
                              <span>{vehicle?.new_registration || vehicle?.group_name || 'Unknown'}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleVehicleSelection(vehicleId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}



            {/* Selected Products */}
            {(selectedProducts || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(selectedProducts || []).map((product, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-gray-600 text-sm">{product.description}</p>
                            <div className="flex gap-2 mt-1">
                              {product.code && (
                                <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">
                                  Code: {product.code}
                                </span>
                              )}
                              {product.vehiclePlate && (
                                <span className="bg-green-100 px-2 py-1 rounded text-green-800 text-xs">
                                  Vehicle: {product.vehiclePlate}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Product Information Header */}
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mb-4">
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <Input
                              value={product.name}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                              value={product.code || 'N/A'}
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
                          
                          {/* Cash Row */}
                          {product.purchaseType === 'purchase' && (
                            <div className="items-center gap-4 grid grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">Cash ex VAT</Label>
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

                          {/* De-installation Row */}
                          {formData.jobType === 'deinstall' && (
                            <div className="items-center gap-4 grid grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">Once Off De-installation</Label>
                                <Input
                                  type="number"
                                  value={product.deInstallationPrice}
                                  onChange={(e) =>
                                    updateProduct(index, "deInstallationPrice", parseFloat(e.target.value) || 0)
                                  }
                                  className="bg-gray-50"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">De-installation Discount *</Label>
                                <Input
                                  type="number"
                                  value={product.deInstallationDiscount || 0}
                                  onChange={(e) =>
                                    updateProduct(index, "deInstallationDiscount", parseFloat(e.target.value) || 0)
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">Gross Once Off De-installation</Label>
                                <Input
                                  value={calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount || 0).toFixed(2)}
                                  readOnly
                                  className="bg-gray-50"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">Total Once Off De-installation</Label>
                                <Input
                                  value={(calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount || 0) * product.quantity).toFixed(2)}
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
                      </div>
                    ))}

                    {/* Total */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Quote Amount:</span>
                        <span className="font-bold text-blue-600 text-lg">
                          R {getTotalQuoteAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gmail-like Recipients Field */}
              <div className="space-y-2">
                <Label htmlFor="emailRecipients">Recipients *</Label>
                <div className="border rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(formData.emailRecipients || []).map((email) => (
                      <div 
                        key={email} 
                        className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(email)}
                          className="text-blue-700 hover:text-blue-900 focus:outline-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input
                      id="newEmailRecipient"
                      type="email"
                      placeholder="Add recipient..."
                      value={newEmailRecipient}
                      onChange={(e) => setNewEmailRecipient(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                      className="grow min-w-[150px] border-0 focus:outline-none focus:ring-0 p-1 text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAddRecipient}
                      className="text-xs"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                {(!formData.emailRecipients || formData.emailRecipients.length === 0) && (
                  <p className="text-red-500 text-xs">Please add at least one recipient</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSubject">Email Subject *</Label>
                <Input
                  id="emailSubject"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                  placeholder="Enter email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBody">Email Body *</Label>
                <Textarea
                  id="emailBody"
                  value={formData.emailBody}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailBody: e.target.value }))}
                  placeholder="Enter email body..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteFooter">Quote Footer</Label>
                <Textarea
                  id="quoteFooter"
                  value={formData.quoteFooter}
                  onChange={(e) => setFormData(prev => ({ ...prev, quoteFooter: e.target.value }))}
                  placeholder="Quote footer text..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="flex flex-col bg-white shadow-xl w-[95%] h-[95%]">
        {/* Header */}
        <div className="flex flex-shrink-0 justify-between items-center p-6 border-b">
          <div>
            <h2 className="font-bold text-2xl">Client Quotation</h2>
            <p className="text-gray-600">Create quotation for {customer?.trading_name || customer?.company}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => onQuoteCreated && onQuoteCreated()}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>


        {/* Step Indicator */}
        <div className="flex flex-shrink-0 justify-center items-center bg-gray-50 px-4 py-1 border-b">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                index <= currentStep ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-500'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="w-2.5 h-2.5" />
                ) : (
                  <step.icon className="w-2.5 h-2.5" />
                )}
              </div>
              <div className="ml-1.5">
                <div className={`text-xs font-medium ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-gray-400 text-xs leading-tight">{step.subtitle}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-6 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Navigation - Fixed at Bottom */}
        <div className="flex flex-shrink-0 justify-between items-center p-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? () => onQuoteCreated && onQuoteCreated() : handlePreviousStep}
          >
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          <div className="flex items-center space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNextStep}
                disabled={!canProceed()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuote}
                disabled={!canProceed() || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 