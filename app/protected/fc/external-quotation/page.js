"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  ExternalLink,
  Search,
  X,
  Car,
} from "lucide-react";
import { toast } from "sonner";
import { FaR } from "react-icons/fa6";
import Link from "next/link";
import EnhancedCustomerDetails from "@/components/ui-personal/EnhancedCustomerDetails";
import VehicleDetailsForm from "@/components/ui-personal/VehicleDetailsForm";

export default function ExternalQuotation() {
  const pathname = usePathname();
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
  const [selectedVehiclesFromDetails, setSelectedVehiclesFromDetails] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [formData, setFormData] = useState({
    jobType: "",
    jobSubType: "",
    description: "",
    purchaseType: "purchase", // "purchase" or "rental"
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    contactPerson: "",
    decommissionDate: "",
    // Vehicle information
    vehicle_registration: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    vin_number: "",
    odormeter: "",
    // Additional fields
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
      title: "Vehicle Details",
      subtitle: "Add vehicle information",
      icon: Car,
    },
    {
      id: 3,
      title: "Quote Details",
      subtitle: "Pricing and terms",
      // icon: <FaR />
      icon: FaR
    },
    { id: 4, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];



  const handleVehiclesSelectedFromDetails = (vehicles) => {
    setSelectedVehiclesFromDetails(vehicles);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  // Force emailRecipients to always be an array
  useEffect(() => {
    if (formData.emailRecipients && !Array.isArray(formData.emailRecipients)) {
      console.warn('emailRecipients is not an array, fixing:', formData.emailRecipients);
      setFormData(prev => ({
        ...prev,
        emailRecipients: []
      }));
    }
  }, [formData.emailRecipients]);

  useEffect(() => {
    fetchProductItems();
  }, [selectedType, selectedCategory, searchTerm]);

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
      console.log("API response:", data);
      
      // Ensure data is an array - API returns { products: [...] }
      if (data && Array.isArray(data.products)) {
        console.log("Setting products from data.products:", data.products);
        setProductItems(data.products);
      } else if (Array.isArray(data)) {
        console.log("Setting products from data array:", data);
        setProductItems(data);
      } else {
        console.warn("API returned non-array data:", data);
        // Fallback to empty array if API fails
        setProductItems([]);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError(error.message);
      setProductItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = (product) => {
    // Check if product already exists
    if (selectedProducts.some(p => p.id === product.id)) {
      toast.error('Product already added', {
        description: `${product.product} is already in your quote`,
      });
      return;
    }

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
  };

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index, field, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
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

    // Subscription can apply to any quote line
    if (product.subscriptionPrice) {
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
        const basicRequirements = formData.jobType && formData.jobSubType && formData.description && formData.purchaseType;
        // If it's a decommission job, also require decommission date
        if (formData.jobType === 'deinstall' && formData.jobSubType === 'decommission') {
          return basicRequirements && formData.decommissionDate;
        }
        return basicRequirements;
      case 1:
        // Require customer details only
        return formData.customerName && 
               formData.customerEmail && 
               formData.customerPhone;
      case 2:
        return true; // Always allow proceeding from vehicle details
      case 3:
        return selectedProducts.length > 0;
      case 4:
        return formData.emailSubject && formData.emailBody && 
               Array.isArray(formData.emailRecipients) && formData.emailRecipients.length > 0;
      default:
        return false;
    }
  };

  const handleSubmitQuote = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // If vehicles are present, use the first one for single-vehicle fields
      const primaryVehicle = vehicles[0] || {};

      const serializeProductForQuote = (product) => {
        const quantity = Number(product.quantity) || 1;
        const isLabour = !!product.isLabour;
        const purchaseType = product.purchaseType || formData.purchaseType || 'purchase';
        const isRental = !isLabour && purchaseType === 'rental';
        const isPurchase = !isLabour && purchaseType === 'purchase';

        const cashPrice = (isLabour || isPurchase) ? (product.cashPrice || 0) : 0;
        const cashDiscount = (isLabour || isPurchase) ? (product.cashDiscount || 0) : 0;
        const cashGross = calculateGrossAmount(cashPrice, cashDiscount);

        const rentalPrice = isRental ? (product.rentalPrice || 0) : 0;
        const rentalDiscount = isRental ? (product.rentalDiscount || 0) : 0;
        const rentalGross = calculateGrossAmount(rentalPrice, rentalDiscount);

        const installationPrice = (formData.jobType === 'install' && !isLabour) ? (product.installationPrice || 0) : 0;
        const installationDiscount = (formData.jobType === 'install' && !isLabour) ? (product.installationDiscount || 0) : 0;
        const installationGross = calculateGrossAmount(installationPrice, installationDiscount);

        const deInstallationPrice = (formData.jobType === 'deinstall' && !isLabour) ? (product.deInstallationPrice || 0) : 0;
        const deInstallationDiscount = (formData.jobType === 'deinstall' && !isLabour) ? (product.deInstallationDiscount || 0) : 0;
        const deInstallationGross = calculateGrossAmount(deInstallationPrice, deInstallationDiscount);

        const subscriptionPrice = product.subscriptionPrice || 0;
        const subscriptionDiscount = product.subscriptionDiscount || 0;
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
          total_price: totalPrice
        };
      };

      const quotationProducts = selectedProducts.map(serializeProductForQuote);
      const subtotal = quotationProducts.reduce((sum, product) => sum + (product.total_price || 0), 0);
      const vatAmount = subtotal * 0.15; // 15% VAT
      const totalAmount = subtotal + vatAmount;

      const quotationData = {
        // Job details
        jobType: formData.jobType,
        jobSubType: formData.jobSubType,
        jobDescription: formData.description,
        description: formData.description,
        purchaseType: formData.purchaseType,
        quotationJobType: formData.jobType,
        
        // Customer information
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        contactPerson: formData.contactPerson,
        decommissionDate: formData.decommissionDate,
        emailRecipients: Array.isArray(formData.emailRecipients) && formData.emailRecipients.length > 0 
          ? formData.emailRecipients 
          : [formData.customerEmail],
        
        // Vehicle information
        vehicles: vehicles,
        vehicle_registration: primaryVehicle.registration || formData.vehicle_registration,
        vehicle_make: primaryVehicle.make || formData.vehicle_make,
        vehicle_model: primaryVehicle.model || formData.vehicle_model,
        vehicle_year: formData.vehicle_year,
        vin_number: formData.vin_number,
        odormeter: formData.odormeter,
        
        // Quotation products with strict pricing mode
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
        
        // Additional fields
        extraNotes: formData.extraNotes || '',
        emailBody: formData.emailBody || '',
        
        // Quote type
        quoteType: 'external'
      };

      console.log('Submitting quotation data:', quotationData);
      
      // Send data to customer_quotes API
      const response = await fetch('/api/customer-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create customer quote');
      }

      // Send email using NotificationAPI
      try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

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
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            totalAmount: totalAmount,
            vatAmount: vatAmount,
            subtotal: subtotal,
            products: quotationData.quotationProducts.map(p => ({
              name: p.name,
              description: p.description,
              quantity: p.quantity,
              unitPrice: p.total_price / p.quantity,
              total: p.total_price,
              purchaseType: p.purchase_type
            })),
            notes: formData.extraNotes,
            emailBody: formData.emailBody,
            emailSubject: formData.emailSubject,
            emailFooter: formData.quoteFooter,
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (emailResult.success) {
          toast.success('External quote created and email sent successfully!', {
            description: `Job Number: ${result.data.job_number} - Sent to ${emailResult.totalSent} recipients`,
            duration: 5000,
          });
        } else {
          toast.success('External quote created successfully!', {
            description: `Job Number: ${result.data.job_number} - Email failed: ${emailResult.error}`,
            duration: 5000,
          });
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.success('External quote created successfully!', {
          description: `Job Number: ${result.data.job_number} - Email could not be sent`,
          duration: 5000,
        });
      }
      
      // Reset form
      setCurrentStep(0);
      setSelectedProducts([]);
      setVehicles([]);
      setFormData({
        jobType: "",
        jobSubType: "",
        description: "",
        purchaseType: "purchase",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        contactPerson: "",
        decommissionDate: "",
        // Vehicle information (not stored in database)
        vehicle_registration: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_year: "",
        vin_number: "",
        odormeter: "",
        // Additional fields
        extraNotes: "",
        emailSubject: "",
        emailBody: "",
        emailRecipients: [],
        quoteFooter: "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
      });
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
        <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type *</Label>
            <Select
              value={formData.jobType}
              onValueChange={(value) =>
                setFormData({ ...formData, jobType: value, jobSubType: "" })
              }
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
                onValueChange={(value) => setFormData({ ...formData, jobSubType: value })}
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
                  ) : (
                    <SelectItem value="decommission">Decommission</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="purchaseType">Cash Type *</Label>
            <Select
              value={formData.purchaseType}
              onValueChange={(value) =>
                setFormData({ ...formData, purchaseType: value })
              }
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
        
        {/* Decommission Date Field */}
        {formData.jobType === 'deinstall' && formData.jobSubType === 'decommission' && (
          <div className="space-y-2">
            <Label htmlFor="decommissionDate">Decommission Date *</Label>
            <Input
              id="decommissionDate"
              type="date"
              value={formData.decommissionDate}
              onChange={(e) =>
                setFormData({ ...formData, decommissionDate: e.target.value })
              }
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-amber-600">
              ⚠️ Note: Both Helpdesk and Ria will be automatically notified when beames are decommissioned.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVehicleDetailsForm = () => (
    <VehicleDetailsForm
      vehicles={vehicles}
      onVehiclesChange={setVehicles}
    />
  );

  const renderCustomerDetailsForm = () => (
    <EnhancedCustomerDetails
      formData={formData}
      setFormData={setFormData}
      accountInfo={null}
      onVehiclesSelected={handleVehiclesSelectedFromDetails}
      isDeinstall={false} // External quotes are not de-installation
    />
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
        {/* Product Selection Filters */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Select Products</h3>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading products...</p>
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
          {!loadingProducts && !productError && Array.isArray(productItems) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {productItems.map((product) => (
                <Card key={product.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm">{product.product}</h4>
                        <p className="text-xs text-gray-600">{product.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{product.type}</span>
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{product.category}</span>
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
                    <div className="text-xs text-gray-500 space-y-1">
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

          {Array.isArray(productItems) && productItems.length === 0 && !loadingProducts && !productError && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Selected Products */}
        {selectedProducts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selected Products</h3>
            {selectedProducts.map((product, index) => (
              <Card key={`${product.id}-${index}`} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{product.type}</span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{product.category}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded capitalize">{product.purchaseType}</span>
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                   <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
                     <div>Base Price</div>
                     <div>Discount</div>
                     <div>Gross Price</div>
                     <div>Total Price</div>
                   </div>
                   
                   {/* Cash Price Row */}
                   {product.purchaseType === 'purchase' && (
                     <div className="grid grid-cols-4 gap-4 items-center">
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Cash ex VAT</Label>
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
                         <Label className="text-xs text-gray-600">Discount</Label>
                         <Input
                           type="number"
                           value={product.cashDiscount}
                           onChange={(e) =>
                             updateProduct(index, "cashDiscount", parseFloat(e.target.value) || 0)
                           }
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Gross Cash ex VAT</Label>
                         <Input
                           value={calculateGrossAmount(product.cashPrice, product.cashDiscount).toFixed(2)}
                           readOnly
                           className="bg-gray-50"
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Total Cash ex VAT</Label>
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
                     <div className="grid grid-cols-4 gap-4 items-center">
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Rental Price ex VAT</Label>
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
                         <Label className="text-xs text-gray-600">Discount</Label>
                         <Input
                           type="number"
                           value={product.rentalDiscount}
                           onChange={(e) =>
                             updateProduct(index, "rentalDiscount", parseFloat(e.target.value) || 0)
                           }
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Gross Rental/Month ex VAT</Label>
                         <Input
                           value={calculateGrossAmount(product.rentalPrice, product.rentalDiscount).toFixed(2)}
                           readOnly
                           className="bg-gray-50"
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Total Rental/Month ex VAT</Label>
                         <Input
                           value={(calculateGrossAmount(product.rentalPrice, product.rentalDiscount) * product.quantity).toFixed(2)}
                           readOnly
                           className="bg-gray-50"
                         />
                       </div>
                     </div>
                   )}

                   {/* Installation Row */}
                   {(formData.jobType === 'install' || formData.jobType === 'deinstall') && (
                     <div className="grid grid-cols-4 gap-4 items-center">
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">
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
                         <Label className="text-xs text-gray-600">
                           {formData.jobType === 'install' ? 'Installation Discount *' : 'De-installation Discount *'}
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
                         <Label className="text-xs text-gray-600">
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
                         <Label className="text-xs text-gray-600">
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
                    <div className="grid grid-cols-4 gap-4 items-center">
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Monthly Subscription</Label>
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
                         <Label className="text-xs text-gray-600">Subscription Discount</Label>
                         <Input
                           type="number"
                           value={product.subscriptionDiscount || 0}
                           onChange={(e) =>
                             updateProduct(index, "subscriptionDiscount", parseFloat(e.target.value) || 0)
                           }
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Gross Monthly Subscription</Label>
                         <Input
                           value={calculateGrossAmount(product.subscriptionPrice, product.subscriptionDiscount || 0).toFixed(2)}
                           readOnly
                           className="bg-gray-50"
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs text-gray-600">Total Monthly Subscription</Label>
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
                <span className="font-bold text-2xl text-blue-800">
                  R {getTotalQuoteAmount().toFixed(2)}
                </span>
              </div>
            </div>
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

  const [newEmailRecipient, setNewEmailRecipient] = useState("");
  
  // Function to handle adding a new recipient
  const handleAddRecipient = () => {
    if (!newEmailRecipient) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailRecipient)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Ensure emailRecipients is an array
    const currentRecipients = Array.isArray(formData.emailRecipients) ? formData.emailRecipients : [];
    
    // Check if email is already in the recipients list
    if (currentRecipients.some(email => email === newEmailRecipient)) {
      toast.error("This email is already added");
      return;
    }
    
    // Add the new recipient
    setFormData(prev => ({
      ...prev,
      emailRecipients: [...currentRecipients, newEmailRecipient]
    }));
    
    // Clear the input field
    setNewEmailRecipient("");
  };
  
  // Function to remove a recipient
  const handleRemoveRecipient = (email) => {
    const currentRecipients = Array.isArray(formData.emailRecipients) ? formData.emailRecipients : [];
    setFormData(prev => ({
      ...prev,
      emailRecipients: currentRecipients.filter(e => e !== email)
    }));
  };
  
  const renderEmailForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gmail-like Recipients Field */}
        <div className="space-y-2">
          <Label htmlFor="emailRecipients">Recipients *</Label>
          <div className="border rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.emailRecipients && Array.isArray(formData.emailRecipients) && formData.emailRecipients.length > 0 ? (
                <div 
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                >
                  <span>{formData.emailRecipients[0]}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(formData.emailRecipients[0])}
                    className="text-blue-700 hover:text-blue-900 focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <input
                id="newEmailRecipient"
                type="email"
                placeholder="Add recipient..."
                value={newEmailRecipient}
                onChange={(e) => setNewEmailRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRecipient();
                  }
                }}
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
          {(!formData.emailRecipients || !Array.isArray(formData.emailRecipients) || formData.emailRecipients.length === 0) && (
            <p className="text-red-500 text-xs">Please add at least one recipient</p>
          )}
        </div>

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
        return renderVehicleDetailsForm();
      case 3:
        return renderQuoteDetailsForm();
      case 4:
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
          <h1 className="mb-2 font-bold text-3xl">External Quotation</h1>
          <p className="text-gray-600">
            Create quotes for external customers not in our system
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Vehicle Information (Optional)</p>
                <p>Vehicle information is optional. If vehicle registration is not provided, 
                a temporary registration will be automatically generated by the system.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="mb-6 border-gray-200 border-b">
          <nav className="flex space-x-8">
            {[
              { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
              { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
              { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
              { id: 'completed-jobs', label: 'Completed Jobs', icon: CheckCircle, href: '/protected/fc/completed-jobs' }
            ].map((navItem) => {
              const Icon = navItem.icon;
              const isActive = pathname === navItem.href;
              
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
                      <p className="text-xs text-gray-400">{step.subtitle}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>
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
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
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
                  <ExternalLink className="mr-2 w-4 h-4" />
                  Create External Quote
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
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
