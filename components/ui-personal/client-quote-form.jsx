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

export default function ClientQuoteForm({
  customer,
  vehicles,
  onQuoteCreated,
  accountInfo,
  initialQuote = null,
  mode = "create", // "create" | "edit"
  quoteId = null,
  embedded = false,
}) {
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

  // Fetch customer data from customers_grouped table
  const fetchCustomerData = useCallback(async (accountNumber) => {
    if (!accountNumber) return;
    
    console.log('fetchCustomerData called with accountNumber:', accountNumber);
    
    try {
      // Query customers_grouped table to find the customer by account number
      const response = await fetch(`/api/customers-grouped-by-account?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to fetch customer data';
        
        if (response.status === 404) {
          // Customer not found - show toast message
          console.log('Customer not found in customers_grouped table for account:', accountNumber);
          toast.error('Customer information not found for this account number');
        } else {
          console.error('API Error:', response.status, errorMessage);
        }
        return; // Don't throw error, just return
      }
      const data = await response.json();
      
      if (data.success && data.customer) {
        // Update form data with fetched customer information
        const customer = data.customer;
        
        console.log('Customer data fetched from customers_grouped:', data.customer);
        
        setFormData(prev => ({
          ...prev,
          customerName: customer.company_group || customer.legal_names || prev.customerName,
          customerEmail: customer.email || prev.customerEmail,
          customerPhone: customer.phone || prev.customerPhone,
          customerAddress: customer.address || prev.customerAddress,
        }));
        
        console.log('Form data updated with customer information');
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Error fetching customer data');
    }
  }, []);

  const [formData, setFormData] = useState({
    jobType: "",
    jobSubType: "",
    description: "",
    purchaseType: "purchase", // "purchase" or "rental"
    customerName: accountInfo?.trading_name || customer?.trading_name || customer?.company || "",
    customerEmail: accountInfo?.branch_person_email || accountInfo?.email || customer?.branch_person_email || customer?.email || "",
    customerPhone: accountInfo?.cell_no || customer?.cell_no || customer?.switchboard || "",
    customerAddress: constructAddress(accountInfo) || constructAddress(customer) || "",
    contactPerson: accountInfo?.branch_person_name || customer?.branch_person_name || "",
    decommissionDate: "",
    annuityEndDate: "",
    moveToRole: "",
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
    if (mode === "edit" && initialQuote) return;
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
    if (mode === "edit" && initialQuote) return;
    if (accountInfo?.new_account_number) {
      console.log('Fetching customer data for account:', accountInfo.new_account_number);
      fetchCustomerData(accountInfo.new_account_number);
    }
  }, [accountInfo?.new_account_number, fetchCustomerData, mode, initialQuote]);

  // Prefill when editing an existing quote
  useEffect(() => {
    if (mode !== "edit" || !initialQuote) return;

    const deserialize = (p) => ({
      id: p.id || `item-${Math.random().toString(36).slice(2)}`,
      name: p.name || p.product || p.description || "",
      description: p.description || "",
      type: p.type || "",
      category: p.category || "",
      code: p.code || "N/A",
      quantity: Number(p.quantity) || 1,
      purchaseType: p.purchase_type || initialQuote.purchase_type || "purchase",
      isLabour: !!p.is_labour,
      cashPrice: Number(p.cash_price || p.cashPrice || p.price || 0),
      cashDiscount: Number(p.cash_discount || p.cashDiscount || 0),
      rentalPrice: Number(p.rental_price || p.rentalPrice || 0),
      rentalDiscount: Number(p.rental_discount || p.rentalDiscount || 0),
      installationPrice: Number(p.installation_price || p.installationPrice || 0),
      installationDiscount: Number(p.installation_discount || p.installationDiscount || 0),
      deInstallationPrice: Number(p.de_installation_price || p.deInstallationPrice || 0),
      deInstallationDiscount: Number(p.de_installation_discount || p.deInstallationDiscount || 0),
      subscriptionPrice: Number(p.subscription_price || p.subscriptionPrice || 0),
      subscriptionDiscount: Number(p.subscription_discount || p.subscriptionDiscount || 0),
      vehicleId: p.vehicle_id || null,
      vehiclePlate: p.vehicle_plate || null,
    });

    setFormData((prev) => ({
      ...prev,
      jobType: initialQuote.job_type || "",
      jobSubType: initialQuote.job_sub_type || "",
      description: initialQuote.job_description || "",
      purchaseType: initialQuote.purchase_type || "purchase",
      customerName: initialQuote.customer_name || prev.customerName,
      customerEmail: initialQuote.customer_email || prev.customerEmail,
      customerPhone: initialQuote.customer_phone || prev.customerPhone,
      customerAddress: initialQuote.customer_address || prev.customerAddress,
      contactPerson: initialQuote.contact_person || "",
      decommissionDate: initialQuote.decommission_date || "",
      annuityEndDate: initialQuote.annuity_end_date || "",
      moveToRole: initialQuote.move_to_role || "",
      vehicle_registration: initialQuote.vehicle_registration || "",
      vehicle_make: initialQuote.vehicle_make || "",
      vehicle_model: initialQuote.vehicle_model || "",
      vehicle_year: initialQuote.vehicle_year ? String(initialQuote.vehicle_year) : "",
      vin_number: initialQuote.vin_number || "",
      odormeter: initialQuote.odormeter || "",
      extraNotes: initialQuote.quote_notes || "",
      emailSubject: initialQuote.quote_email_subject || prev.emailSubject,
      emailBody: initialQuote.quote_email_body || prev.emailBody,
      quoteFooter: initialQuote.quote_email_footer || prev.quoteFooter,
      emailRecipients: initialQuote.customer_email ? [initialQuote.customer_email] : prev.emailRecipients,
    }));

    const existingItems = Array.isArray(initialQuote.quotation_products) ? initialQuote.quotation_products : [];
    setSelectedProducts(existingItems.map(deserialize));
    setHasUserSelectedJobType(!!initialQuote.job_type);

    if (initialQuote.job_type === "deinstall" && Array.isArray(initialQuote.deinstall_vehicles)) {
      setDeInstallData((prev) => ({
        ...prev,
        selectedVehicles: initialQuote.deinstall_vehicles.map((v) => v.id).filter(Boolean),
      }));
    }
  }, [mode, initialQuote]);

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
    } else if (formData.jobType !== 'deinstall' && hasUserSelectedJobType) {
      console.log('Job type changed to install, fetching product items');
      fetchProductItems();
    } else if (formData.jobType === 'deinstall' && !accountInfo?.new_account_number && hasUserSelectedJobType) {
      console.log('Job type is deinstall but no account number available yet');
    }
  }, [formData.jobType, accountInfo?.new_account_number, hasUserSelectedJobType, fetchVehiclesFromIP, fetchProductItems]);

  // Separate effect for product filters
  useEffect(() => {
    if (formData.jobType !== 'deinstall') {
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
    // Labour items: only use cash price (the labour cost field)
    if (product.isLabour) {
      const labourGross = calculateGrossAmount(product.cashPrice, product.cashDiscount);
      return labourGross * product.quantity;
    }
    
    // Regular products: sum all applicable pricing tiers
    let total = 0;
    const isPurchase = product.purchaseType === 'purchase';
    const isRental = product.purchaseType === 'rental';
    
    if (isPurchase) {
      // Cash price calculation
      const cashGross = calculateGrossAmount(product.cashPrice, product.cashDiscount);
      total += cashGross;
    } else if (isRental) {
      // Rental price calculation
      const rentalGross = calculateGrossAmount(product.rentalPrice, product.rentalDiscount);
      total += rentalGross;
    }

    // Add installation/de-installation cost with discount
    if (formData.jobType !== 'deinstall') {
      const installationGross = calculateGrossAmount(product.installationPrice, product.installationDiscount || 0);
      total += installationGross;
    } else if (formData.jobType === 'deinstall') {
      const deInstallationGross = calculateGrossAmount(product.deInstallationPrice, product.deInstallationDiscount || 0);
      total += deInstallationGross;
    }

    // Subscription can apply to any non-labour line item (including services)
    if (product.subscriptionPrice) {
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
        const basicRequirements = formData.jobType && formData.jobSubType && formData.description && formData.purchaseType;
        if (formData.jobType === 'deinstall') {
          const hasAnnuityEndDate = Boolean(formData.annuityEndDate);
          if (formData.jobSubType === 'decommission') {
            return basicRequirements && formData.decommissionDate && hasAnnuityEndDate && Boolean(formData.moveToRole);
          }
          return basicRequirements && hasAnnuityEndDate;
        }
        return basicRequirements;
      case 1:
        return formData.customerName && formData.customerEmail && formData.customerPhone;
      case 2:
        // For de-install, allow proceeding even without products (user can add pricing manually)
        if (formData.jobType === 'deinstall') {
          return true; // Allow proceeding, user can add products manually
        }
        
        // For all non-deinstall jobs, require selected products
        if (formData.jobType !== 'deinstall') {
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

      const serializeProductForQuote = (product) => {
        const quantity = Number(product.quantity) || 1;
        const isLabour = !!product.isLabour;
        const purchaseType = product.purchaseType || (formData.jobType === 'deinstall' ? 'service' : formData.purchaseType || 'purchase');
        const isRental = !isLabour && purchaseType === 'rental';
        const isPurchase = !isLabour && purchaseType === 'purchase';

        // Persist all pricing fields; total calculation still respects purchase type for base price
        const cashPrice = isLabour ? (product.cashPrice || 0) : (product.cashPrice || 0);
        const cashDiscount = isLabour ? (product.cashDiscount || 0) : (product.cashDiscount || 0);
        const cashGross = calculateGrossAmount(cashPrice, cashDiscount);

        const rentalPrice = isLabour ? 0 : (product.rentalPrice || 0);
        const rentalDiscount = isLabour ? 0 : (product.rentalDiscount || 0);
        const rentalGross = calculateGrossAmount(rentalPrice, rentalDiscount);

        const installationPrice = (formData.jobType !== 'deinstall' && !isLabour) ? (product.installationPrice || 0) : 0;
        const installationDiscount = (formData.jobType !== 'deinstall' && !isLabour) ? (product.installationDiscount || 0) : 0;
        const installationGross = calculateGrossAmount(installationPrice, installationDiscount);

        const deInstallationPrice = (formData.jobType === 'deinstall' && !isLabour) ? (product.deInstallationPrice || 0) : 0;
        const deInstallationDiscount = (formData.jobType === 'deinstall' && !isLabour) ? (product.deInstallationDiscount || 0) : 0;
        const deInstallationGross = calculateGrossAmount(deInstallationPrice, deInstallationDiscount);

        const subscriptionPrice = isLabour ? 0 : (product.subscriptionPrice || 0);
        const subscriptionDiscount = isLabour ? 0 : (product.subscriptionDiscount || 0);
        const subscriptionGross = calculateGrossAmount(subscriptionPrice, subscriptionDiscount);

        const totalPrice = ((isLabour || isPurchase ? cashGross : 0)
          + (isRental ? rentalGross : 0)
          + installationGross
          + deInstallationGross
          + subscriptionGross) * quantity;

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          type: product.type,
          category: product.category,
          quantity,
          purchase_type: purchaseType,
          is_labour: isLabour,
          cash_price: cashPrice,
          cash_discount: cashDiscount,
          cash_gross: cashGross,
          rental_price: rentalPrice,
          rental_discount: rentalDiscount,
          rental_gross: rentalGross,
          installation_price: installationPrice,
          installation_discount: installationDiscount,
          installation_gross: installationGross,
          de_installation_price: deInstallationPrice,
          de_installation_discount: deInstallationDiscount,
          de_installation_gross: deInstallationGross,
          subscription_price: subscriptionPrice,
          subscription_discount: subscriptionDiscount,
          subscription_gross: subscriptionGross,
          total_price: totalPrice,
          vehicle_id: product.vehicleId,
          vehicle_plate: product.vehiclePlate,
        };
      };

      const quotationProducts = (selectedProducts || []).map(serializeProductForQuote);
      const subtotal = quotationProducts.reduce((sum, product) => sum + (product.total_price || 0), 0);

      const vatAmount = subtotal * 0.15; // 15% VAT
      const totalAmount = subtotal + vatAmount;

      const quotationData = {
        // Job details
        jobType: formData.jobType,
        jobSubType: formData.jobSubType,
        jobDescription: formData.description,
        purchaseType: formData.purchaseType,
        quotationJobType: formData.jobType,
        
        // Customer information
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        contactPerson: formData.contactPerson,
        decommissionDate: formData.decommissionDate,
        annuityEndDate: formData.annuityEndDate,
        moveToRole: formData.moveToRole || null,
        
        // Vehicle information
        vehicle_registration: formData.vehicle_registration || '',
        vehicle_make: formData.vehicle_make || '',
        vehicle_model: formData.vehicle_model || '',
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vin_number: formData.vin_number || '',
        odormeter: formData.odormeter || '',
        
        // Account information (for internal quotes)
        new_account_number: accountInfo?.new_account_number || customer?.new_account_number || null,
        
        // De-install specific data - capture selected vehicles and their details with parts being removed
        ...(formData.jobType === 'deinstall' && {
          deinstall_vehicles: (deInstallData?.selectedVehicles || []).map(vehicleId => {
            const vehicle = deInstallData.availableVehicles.find(v => v.id === vehicleId);
            // Get all products associated with this vehicle
            const vehicleParts = (selectedProducts || []).filter(p => p.vehicleId === vehicleId && !p.isLabour);
            
            return {
              id: vehicleId,
              registration: vehicle?.fleet_number || vehicle?.reg || '',
              make: vehicle?.make || '',
              model: vehicle?.model || '',
              year: vehicle?.year || null,
              vin: vehicle?.vin_number || '',
              odometer: vehicle?.odometer || '',
              color: vehicle?.color || '',
              fuel_type: vehicle?.fuel_type || '',
              // Parts/Equipment being de-installed from this vehicle
              parts_being_deinstalled: vehicleParts.map(part => ({
                id: part.id,
                name: part.name,
                description: part.description,
                type: part.type,
                category: part.category,
                code: part.code || '',
                quantity: part.quantity || 1
              }))
            };
          })
        }),
        
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

      const isEditMode = mode === "edit" && !!quoteId;

      const updatePayload = {
        job_type: formData.jobType,
        job_sub_type: formData.jobSubType || null,
        job_description: formData.description,
        purchase_type: formData.purchaseType || "purchase",
        quotation_job_type: formData.jobType,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        contact_person: formData.contactPerson || null,
        decommission_date: formData.decommissionDate || null,
        annuity_end_date: formData.annuityEndDate || null,
        move_to_role: formData.moveToRole || null,
        vehicle_registration: formData.vehicle_registration || null,
        vehicle_make: formData.vehicle_make || null,
        vehicle_model: formData.vehicle_model || null,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vin_number: formData.vin_number || null,
        odormeter: formData.odormeter || null,
        quote_notes: formData.extraNotes || "",
        quote_email_subject: formData.emailSubject || "",
        quote_email_body: formData.emailBody || "",
        quote_email_footer: formData.quoteFooter || "",
        quotation_products: quotationProducts,
        quotation_subtotal: subtotal,
        quotation_vat_amount: vatAmount,
        quotation_total_amount: totalAmount,
        ...(formData.jobType === "deinstall" && {
          deinstall_vehicles: quotationData.deinstall_vehicles || [],
          deinstall_stock_items: [],
          stock_received: null,
        }),
      };

      console.log('Submitting quotation data:', isEditMode ? updatePayload : quotationData);

      const response = await fetch(isEditMode ? `${baseUrl}/api/client-quotes/${quoteId}` : `${baseUrl}/api/client-quotes`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(isEditMode ? updatePayload : quotationData),
      });

      const result = await response.json();

      if (!response.ok) {
        const fallback = isEditMode ? 'Failed to update client quote' : 'Failed to create client quote';
        throw new Error(result.details ? `${result.error || fallback}: ${result.details}` : (result.error || fallback));
      }

      // Send email using NotificationAPI (create mode only)
      if (!isEditMode) {
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
      }
      
      if (isEditMode) {
        toast.success('Client quote updated successfully!', {
          description: `Quote Number: ${initialQuote?.job_number || ''}`.trim(),
          duration: 5000,
        });
        if (onQuoteCreated) onQuoteCreated();
      } else {
        // Reset form data
        setFormData({
        jobType: "",
        jobSubType: "",
        description: "",
        purchaseType: "purchase",
        customerName: accountInfo?.trading_name || customer?.trading_name || customer?.company || "",
        customerEmail: accountInfo?.branch_person_email || accountInfo?.email || customer?.branch_person_email || customer?.email || "",
        customerPhone: accountInfo?.cell_no || customer?.cell_no || customer?.switchboard || "",
        customerAddress: constructAddress(accountInfo) || constructAddress(customer) || "",
        contactPerson: accountInfo?.branch_person_name || customer?.branch_person_name || "",
        decommissionDate: "",
        annuityEndDate: "",
        moveToRole: "",
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
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      
      // Show error toast
      toast.error(mode === "edit" ? 'Failed to update quote' : 'Failed to create quote', {
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
                      setFormData(prev => ({ ...prev, jobType: value, jobSubType: "" }));
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

                {formData.jobType && (
                  <div className="space-y-2">
                    <Label htmlFor="jobSubType">Sub Category *</Label>
                    <Select
                      value={formData.jobSubType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, jobSubType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub category" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.jobType === 'install' ? (
                          <>
                            <SelectItem value="new_install">New Install</SelectItem>
                            <SelectItem value="reinstall">Reinstall</SelectItem>
                            <SelectItem value="additional_install">Additional Install</SelectItem>
                          </>
                        ) : formData.jobType === 'deinstall' ? (
                          <>
                            <SelectItem value="decommission">Decommission</SelectItem>
                            <SelectItem value="de-install">De-install</SelectItem>
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">

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

              {/* Decommission Date Field - Only for Decommission, not De-install */}
              {formData.jobType === 'deinstall' && formData.jobSubType === 'decommission' && (
                <div className="space-y-2">
                  <Label htmlFor="decommissionDate">Decommission Date *</Label>
                  <Input
                    id="decommissionDate"
                    type="date"
                    value={formData.decommissionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, decommissionDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sm text-amber-600">
                    ⚠️ Note: Both Helpdesk and Ria will be automatically notified when equipment is decommissioned.
                  </p>
                </div>
              )}

              {formData.jobType === 'deinstall' && (
                <div className="space-y-2">
                  <Label htmlFor="annuityEndDate">Annuity End Date *</Label>
                  <Input
                    id="annuityEndDate"
                    type="date"
                    value={formData.annuityEndDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, annuityEndDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sm text-blue-700">
                    This is required for de-install and decommission quotes.
                  </p>
                </div>
              )}

              {formData.jobType === 'deinstall' && formData.jobSubType === 'decommission' && (
                <div className="space-y-2">
                  <Label htmlFor="moveToRole">Send Job Card To Role *</Label>
                  <Select
                    value={formData.moveToRole}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, moveToRole: value }))}
                  >
                    <SelectTrigger id="moveToRole">
                      <SelectValue placeholder="Select destination role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inv">Inventory</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="accounts">Accounts</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-blue-700">
                    The approved job card will automatically be routed to this role.
                  </p>
                </div>
              )}

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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone *</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Customer Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_registration">Vehicle Registration</Label>
                    <Input
                      id="vehicle_registration"
                      value={formData.vehicle_registration}
                      onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_make">Vehicle Make</Label>
                    <Input
                      id="vehicle_make"
                      value={formData.vehicle_make}
                      onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_model">Vehicle Model</Label>
                    <Input
                      id="vehicle_model"
                      value={formData.vehicle_model}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            {/* Product Selection */}
            {formData.jobType !== 'deinstall' && (
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

                  {/* Add Labour Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const labourItem = {
                          id: `labour-${Date.now()}`,
                          name: 'Labour Charge',
                          description: 'Manual labour charge',
                          type: 'Labour',
                          category: 'Labour',
                          quantity: 1,
                          purchaseType: 'service',
                          isLabour: true,
                          cashPrice: 0,
                          cashDiscount: 0,
                          rentalPrice: 0,
                          rentalDiscount: 0,
                          installationPrice: 0,
                          installationDiscount: 0,
                          deInstallationPrice: 0,
                          deInstallationDiscount: 0,
                          subscriptionPrice: 0,
                          subscriptionDiscount: 0,
                        };
                        setSelectedProducts(prev => [...(prev || []), labourItem]);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Labour Charge
                    </Button>
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
                              <div>Subscription: R {product.subscription?.toFixed(2) || '0.00'}/month</div>
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

                  {/* Add Labour Button for De-install */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const labourItem = {
                          id: `labour-${Date.now()}`,
                          name: 'Labour Charge',
                          description: 'Manual labour charge',
                          type: 'Labour',
                          category: 'Labour',
                          quantity: 1,
                          purchaseType: 'service',
                          isLabour: true,
                          cashPrice: 0,
                          cashDiscount: 0,
                          rentalPrice: 0,
                          rentalDiscount: 0,
                          installationPrice: 0,
                          installationDiscount: 0,
                          deInstallationPrice: 0,
                          deInstallationDiscount: 0,
                          subscriptionPrice: 0,
                          subscriptionDiscount: 0,
                        };
                        setSelectedProducts(prev => [...(prev || []), labourItem]);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Labour Charge
                    </Button>
                  </div>
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
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{product.name}</h4>
                              {product.isLabour && (
                                <span className="bg-green-100 px-2 py-1 rounded text-green-800 text-xs font-medium">
                                  Labour
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{product.description}</p>
                            <div className="flex gap-2 mt-1">
                              {product.code && (
                                <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">
                                  Code: {product.code}
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
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>

                        {/* Product Information Header */}
                        {!product.isLabour ? (
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
                        ) : (
                          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mb-4">
                            <div className="space-y-2">
                              <Label>Labour Description</Label>
                              <Input
                                value={product.name}
                                onChange={(e) =>
                                  updateProduct(index, "name", e.target.value)
                                }
                                placeholder="e.g., Installation labour, Technical support"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Hours/Units</Label>
                              <Input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={product.quantity}
                                onChange={(e) =>
                                  updateProduct(index, "quantity", parseFloat(e.target.value) || 1)
                                }
                                placeholder="Number of hours or units"
                              />
                            </div>
                          </div>
                        )}

                        {/* Pricing Grid */}
                        <div className="space-y-4">
                          <div className="gap-4 grid grid-cols-4 pb-2 border-b font-medium text-gray-700 text-sm">
                            {product.isLabour ? (
                              <>
                                <div>Labour Cost ex VAT (Once Off)</div>
                                <div>Discount</div>
                                <div>Gross ex VAT</div>
                                <div>Total (Once Off)</div>
                              </>
                            ) : (
                              <>
                                <div>Base Price</div>
                                <div>Discount</div>
                                <div>Gross Price</div>
                                <div>Total Price</div>
                              </>
                            )}
                          </div>
                          
                          {/* Cash Row / Labour Cost Row */}
                          <div className="items-center gap-4 grid grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">{product.isLabour ? 'Labour Cost ex VAT' : 'Cash ex VAT'}</Label>
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
                                <Label className="text-gray-600 text-xs">{product.isLabour ? 'Gross ex VAT' : 'Gross Cash ex VAT'}</Label>
                                <Input
                                  value={calculateGrossAmount(product.cashPrice, product.cashDiscount).toFixed(2)}
                                  readOnly
                                  className="bg-gray-50"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">{product.isLabour ? 'Total (Once Off)' : 'Total Cash ex VAT'}</Label>
                                <Input
                                  value={(calculateGrossAmount(product.cashPrice, product.cashDiscount) * product.quantity).toFixed(2)}
                                  readOnly
                                  className="bg-gray-50"
                                />
                              </div>
                            </div>

                          {/* Rental Row */}
                          {!product.isLabour && (
                            <div className="items-center gap-4 grid grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">Rental/Month ex VAT</Label>
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
                                <Label className="text-gray-600 text-xs">Rental Discount</Label>
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
                          {!product.isLabour && (
                            <div className="items-center gap-4 grid grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">
                                  {formData.jobType === 'install' ? 'Once Off Installation' : 'Once Off De-installation'}
                                </Label>
                                <Input
                                  type="number"
                                  value={formData.jobType === 'install' ? product.installationPrice : product.deInstallationPrice}
                                  onChange={(e) => {
                                    const field = formData.jobType === 'install' ? 'installationPrice' : 'deInstallationPrice';
                                    updateProduct(index, field, parseFloat(e.target.value) || 0);
                                  }}
                                  className="bg-gray-50"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">
                                  {formData.jobType === 'install' ? 'Installation Discount' : 'De-installation Discount'}
                                </Label>
                                <Input
                                  type="number"
                                  value={formData.jobType === 'install' ? (product.installationDiscount || 0) : (product.deInstallationDiscount || 0)}
                                  onChange={(e) => {
                                    const field = formData.jobType === 'install' ? 'installationDiscount' : 'deInstallationDiscount';
                                    updateProduct(index, field, parseFloat(e.target.value) || 0);
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">
                                  {formData.jobType === 'install' ? 'Gross Once Off Installation' : 'Gross Once Off De-installation'}
                                </Label>
                                <Input
                                  value={calculateGrossAmount(
                                    formData.jobType === 'install' ? product.installationPrice : product.deInstallationPrice,
                                    formData.jobType === 'install' ? (product.installationDiscount || 0) : (product.deInstallationDiscount || 0)
                                  ).toFixed(2)}
                                  readOnly
                                  className="bg-gray-50"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-600 text-xs">
                                  {formData.jobType === 'install' ? 'Total Once Off Installation' : 'Total Once Off De-installation'}
                                </Label>
                                <Input
                                  value={(calculateGrossAmount(
                                    formData.jobType === 'install' ? product.installationPrice : product.deInstallationPrice,
                                    formData.jobType === 'install' ? (product.installationDiscount || 0) : (product.deInstallationDiscount || 0)
                                  ) * product.quantity).toFixed(2)}
                                  readOnly
                                  className="bg-gray-50"
                                />
                              </div>
                            </div>
                          )}

                          {/* Subscription Row */}
                          {!product.isLabour && (
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

                        {/* Product Total */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Product Total:</span>
                            <span className="font-bold text-lg">
                              R {getProductTotal(product).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Total Quote Amount */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-800">Total Quote Amount:</span>
                        <span className="font-bold text-2xl text-blue-800">
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
    <div className={embedded ? "flex justify-center items-center" : "z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50"}>
      <div className={embedded ? "flex flex-col bg-white shadow-xl w-full h-full" : "flex flex-col bg-white shadow-xl w-[95%] h-[95%]"}>
        {/* Header */}
        <div className="flex flex-shrink-0 justify-between items-center p-6 border-b">
          <div>
            <h2 className="font-bold text-2xl">{mode === "edit" ? "Edit Client Quotation" : "Client Quotation"}</h2>
            <p className="text-gray-600">{mode === "edit" ? "Update quotation details" : `Create quotation for ${customer?.trading_name || customer?.company}`}</p>
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
          {steps.map((step, index) => {
            const StepIcon = typeof step.icon === "function" ? step.icon : FileText;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                  index <= currentStep ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-2.5 h-2.5" />
                  ) : (
                    <StepIcon className="w-2.5 h-2.5" />
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
            );
          })}
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
                    {mode === "edit" ? "Saving Quote..." : "Creating Quote..."}
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 w-4 h-4" />
                    {mode === "edit" ? "Save Quote" : "Create Quote"}
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
