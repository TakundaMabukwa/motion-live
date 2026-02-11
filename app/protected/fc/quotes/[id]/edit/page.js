"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, FileText, User, DollarSign, Mail, CheckCircle, AlertTriangle, Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import EnhancedCustomerDetails from "@/components/ui-personal/EnhancedCustomerDetails";

export default function EditQuote() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedVehiclesFromDetails, setSelectedVehiclesFromDetails] = useState([]);

  const [formData, setFormData] = useState({
    jobType: "",
    description: "",
    stockType: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    extraNotes: "",
    emailSubject: "",
    emailBody: "",
    quoteFooter: "",
    selectedVehicles: [],
    selectedStock: [],
    stockReceived: false,
    vehicle_registration: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
  });

  const [accountInfo, setAccountInfo] = useState(null);

  const steps = [
    { id: 0, title: "Job Details", subtitle: "Basic job information", icon: FileText },
    { id: 1, title: "Customer Details", subtitle: "Customer information", icon: User },
    { id: 2, title: "Quote Details", subtitle: "Pricing and terms", icon: DollarSign },
    { id: 3, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];

  useEffect(() => {
    if (quoteId) fetchQuote();
  }, [quoteId]);

  useEffect(() => {
    if (formData.stockType === "new-stock") fetchProducts();
  }, [formData.stockType]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client-quotes/${quoteId}`);
      if (!response.ok) throw new Error('Failed to fetch quote');
      
      const result = await response.json();
      if (result.success && result.data) {
        const quote = result.data;
        
        // Handle deinstall vehicles
        if (quote.job_type === 'deinstall' && quote.deinstall_vehicles) {
          setSelectedVehiclesFromDetails(quote.deinstall_vehicles || []);
        }
        
        // Store account info for vehicle fetching
        setAccountInfo({
          new_account_number: quote.new_account_number,
          account_id: quote.account_id
        });
        
        setFormData({
          jobType: quote.job_type || "",
          description: quote.job_description || "",
          stockType: quote.purchase_type === "purchase" ? "new-stock" : "used-stock",
          customerName: quote.customer_name || "",
          customerEmail: quote.customer_email || "",
          customerPhone: quote.customer_phone || "",
          customerAddress: quote.customer_address || "",
          extraNotes: quote.quote_notes || "",
          emailSubject: quote.quote_email_subject || "",
          emailBody: quote.quote_email_body || "",
          quoteFooter: quote.quote_email_footer || "",
          selectedVehicles: quote.deinstall_vehicles?.map(v => v.id) || [],
          selectedStock: quote.deinstall_stock_items || [],
          stockReceived: quote.stock_received || false,
          vehicle_registration: quote.vehicle_registration || "",
          vehicle_make: quote.vehicle_make || "",
          vehicle_model: quote.vehicle_model || "",
          vehicle_year: quote.vehicle_year || "",
        });
        
        if (quote.quotation_products && Array.isArray(quote.quotation_products)) {
          setSelectedProducts(quote.quotation_products.map(p => ({
            id: p.id || Math.random().toString(),
            name: p.name || p.description || "",
            description: p.description || "",
            quantity: p.quantity || 1,
            vehicle_id: p.vehicle_id || null,
            vehicle_plate: p.vehicle_plate || null,
            cashPrice: parseFloat(p.cash_price || p.cashPrice || p.price || p.de_installation_price || 0),
            cashDiscount: parseFloat(p.cash_discount || p.cashDiscount || 0),
            rentalPrice: parseFloat(p.rental_price || p.rentalPrice || p.rental || 0),
            rentalDiscount: parseFloat(p.rental_discount || p.rentalDiscount || 0),
            installationPrice: parseFloat(p.installation_price || p.installationPrice || p.installation || 0),
            installationDiscount: parseFloat(p.installation_discount || p.installationDiscount || 0),
          })));
        }
      }
    } catch (error) {
      toast.error('Failed to load quote', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError(null);
    try {
      const res = await fetch("/api/product-items");
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError(error.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = (product) => {
    setSelectedProducts([...selectedProducts, {
      id: product.id,
      name: product.product,
      quantity: 1,
      cashPrice: product.price,
      cashDiscount: 0,
      rentalPrice: product.rental,
      rentalDiscount: 0,
      installationPrice: product.installation,
      installationDiscount: 0,
    }]);
  };

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = parseFloat(value) || 0;
    setSelectedProducts(updated);
  };

  const calculateGrossAmount = (price, discount) => {
    const p = parseFloat(price) || 0;
    const d = parseFloat(discount) || 0;
    return p * (1 - d / 100);
  };

  const getProductTotal = (product) => {
    const grossCash = calculateGrossAmount(product.cashPrice, product.cashDiscount);
    const grossRental = calculateGrossAmount(product.rentalPrice, product.rentalDiscount);
    const grossInstallation = calculateGrossAmount(product.installationPrice, product.installationDiscount);
    const qty = parseFloat(product.quantity) || 1;
    return (grossCash + grossRental + grossInstallation) * qty;
  };

  const getTotalQuoteAmount = () => {
    return selectedProducts.reduce((total, product) => total + getProductTotal(product), 0);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.jobType && formData.description;
      case 1:
        return formData.customerName && formData.customerEmail && formData.customerPhone;
      case 2:
        if (formData.jobType === "deinstall") return true;
        return selectedProducts.length > 0;
      case 3:
        return formData.emailSubject && formData.emailBody;
      default:
        return false;
    }
  };

  const handleSave = async () => {
    if (!canProceed()) return;

    setSaving(true);
    try {
      const quoteData = {
        job_type: formData.jobType,
        job_description: formData.description,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        quote_notes: formData.extraNotes,
        quote_email_subject: formData.emailSubject,
        quote_email_body: formData.emailBody,
        quote_email_footer: formData.quoteFooter,
        quotation_products: selectedProducts,
        vehicle_registration: formData.vehicle_registration,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year,
      };

      if (formData.jobType === "deinstall") {
        quoteData.deinstall_vehicles = selectedVehiclesFromDetails;
        quoteData.deinstall_stock_items = formData.selectedStock;
        quoteData.stock_received = formData.stockReceived;
      } else {
        quoteData.quotation_subtotal = getTotalQuoteAmount();
        quoteData.quotation_vat_amount = getTotalQuoteAmount() * 0.15;
        quoteData.quotation_total_amount = getTotalQuoteAmount() * 1.15;
      }

      const response = await fetch(`/api/client-quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });

      if (!response.ok) throw new Error('Failed to update quote');

      toast.success('Quote updated successfully!');
      router.push('/protected/fc/quotes');
    } catch (error) {
      toast.error('Failed to save quote', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleVehiclesSelectedFromDetails = useCallback((vehicles) => {
    setSelectedVehiclesFromDetails(vehicles);
    setFormData(prev => ({ ...prev, selectedVehicles: vehicles.map(v => v.id) }));
  }, []);

  const renderJobDetailsForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Job Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Job Type *</Label>
          <Select value={formData.jobType} onValueChange={(value) => setFormData({ ...formData, jobType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="install">Installation</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="deinstall">De-installation</SelectItem>
              <SelectItem value="relocation">Relocation</SelectItem>
              <SelectItem value="upgrade">Upgrade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.jobType !== "deinstall" && (
          <div className="space-y-2">
            <Label>Stock Type *</Label>
            <Select value={formData.stockType} onValueChange={(value) => setFormData({ ...formData, stockType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select stock type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-stock">New Stock</SelectItem>
                <SelectItem value="used-stock">Used Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.stockType === "new-stock" && (
          <div className="space-y-2">
            <Label>Available Products</Label>
            {loadingProducts ? (
              <p>Loading products...</p>
            ) : productError ? (
              <div className="text-red-500">{productError}</div>
            ) : (
              <Select onValueChange={(value) => {
                const product = products.find((p) => p.id === value);
                if (product) addProduct(product);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product to add" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product} (R{product.price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {formData.jobType === "deinstall" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">De-installation Job</h3>
              <p className="text-sm text-blue-800">
                Vehicle selection will be handled in the Customer Details step. 
                Please proceed to the next step to select vehicles and configure de-installation details.
              </p>
            </div>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Products</Label>
            <div className="space-y-2">
              {selectedProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeProduct(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea
            placeholder="Describe the job requirements..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="min-h-32"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderCustomerDetailsForm = useCallback(() => {
    // For deinstall jobs in edit mode, show vehicle info from products instead of selection
    if (formData.jobType === "deinstall" && selectedProducts.length > 0) {
      const vehiclesFromProducts = selectedProducts
        .filter(p => p.vehicle_plate)
        .map(p => ({
          vehicle_id: p.vehicle_id,
          registration: p.vehicle_plate,
          product: p.name
        }));

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                />
              </div>
            </div>

            {vehiclesFromProducts.length > 0 && (
              <div className="mt-6">
                <Label className="mb-3 block">Vehicles for De-installation</Label>
                <div className="space-y-2">
                  {vehiclesFromProducts.map((vehicle, idx) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold text-blue-900">{vehicle.registration}</div>
                          <div className="text-sm text-blue-700">Product: {vehicle.product}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <EnhancedCustomerDetails
        formData={formData}
        setFormData={setFormData}
        accountInfo={accountInfo}
        onVehiclesSelected={handleVehiclesSelectedFromDetails}
        isDeinstall={formData.jobType === "deinstall"}
      />
    );
  }, [formData, accountInfo, selectedProducts, handleVehiclesSelectedFromDetails]);

  const renderQuoteDetailsForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Quote Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formData.jobType === "deinstall" ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">De-installation Items</h3>
              {selectedProducts.length > 0 ? (
                <div className="space-y-3">
                  {selectedProducts.map((product, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.vehicle_plate && (
                            <div className="text-sm text-gray-600 mt-1">
                              Vehicle: <span className="font-mono font-semibold">{product.vehicle_plate}</span>
                            </div>
                          )}
                          {product.description && (
                            <div className="text-sm text-gray-500 mt-1">{product.description}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">De-install Fee</div>
                          <div className="font-semibold">R{parseFloat(product.cashPrice || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">No items selected for de-installation</div>
              )}
            </div>
          </div>
        ) : (
          selectedProducts.map((product, index) => (
            <div key={index} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Cash</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Cash ex VAT</Label>
                    <Input
                      type="number"
                      value={product.cashPrice}
                      onChange={(e) => updateProduct(index, "cashPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      max="100"
                      value={product.cashDiscount}
                      onChange={(e) => updateProduct(index, "cashDiscount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gross Cash/Month ex VAT</Label>
                    <Input
                      readOnly
                      value={`R ${calculateGrossAmount(product.cashPrice, product.cashDiscount).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Cash/Month ex VAT</Label>
                    <Input
                      readOnly
                      value={`R ${(calculateGrossAmount(product.cashPrice, product.cashDiscount) * product.quantity).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Rental Price</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Rental Price ex VAT</Label>
                    <Input
                      type="number"
                      value={product.rentalPrice}
                      onChange={(e) => updateProduct(index, "rentalPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      max="100"
                      value={product.rentalDiscount}
                      onChange={(e) => updateProduct(index, "rentalDiscount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gross Rental/Month ex VAT</Label>
                    <Input
                      readOnly
                      value={`R ${calculateGrossAmount(product.rentalPrice, product.rentalDiscount).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Rental/Month ex VAT</Label>
                    <Input
                      readOnly
                      value={`R ${(calculateGrossAmount(product.rentalPrice, product.rentalDiscount) * product.quantity).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Once Off Installation</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Once Off Installation</Label>
                    <Input
                      type="number"
                      value={product.installationPrice}
                      onChange={(e) => updateProduct(index, "installationPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installation Discount</Label>
                    <Input
                      type="number"
                      max="100"
                      value={product.installationDiscount}
                      onChange={(e) => updateProduct(index, "installationDiscount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gross Once Off Installation</Label>
                    <Input
                      readOnly
                      value={`R ${calculateGrossAmount(product.installationPrice, product.installationDiscount).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Once Off Installation</Label>
                    <Input
                      readOnly
                      value={`R ${(calculateGrossAmount(product.installationPrice, product.installationDiscount) * product.quantity).toFixed(2)}`}
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-medium">Product Total: R {getProductTotal(product).toFixed(2)}</p>
              </div>
              <Separator />
            </div>
          ))
        )}

        <div className="space-y-2">
          <Label>Extra Notes For Quotes</Label>
          <Textarea
            placeholder="Add any additional notes for the quote..."
            value={formData.extraNotes}
            onChange={(e) => setFormData({ ...formData, extraNotes: e.target.value })}
            className="min-h-20"
          />
        </div>

        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-lg font-semibold">
              Total Quote Amount: R {getTotalQuoteAmount().toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              (VAT: R {(getTotalQuoteAmount() * 0.15).toFixed(2)})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmailForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email Subject *</Label>
          <Input
            placeholder="Enter email subject"
            value={formData.emailSubject}
            onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Email Body *</Label>
          <Textarea
            placeholder="Email body text"
            value={formData.emailBody}
            onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
            className="min-h-40"
          />
        </div>

        <div className="space-y-2">
          <Label>Quote Footer *</Label>
          <Textarea
            value={formData.quoteFooter}
            onChange={(e) => setFormData({ ...formData, quoteFooter: e.target.value })}
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderJobDetailsForm();
      case 1: return renderCustomerDetailsForm();
      case 2: return renderQuoteDetailsForm();
      case 3: return renderEmailForm();
      default: return null;
    }
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "pending";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Quote</h1>
            <p className="text-gray-600">Update quote information</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      status === "completed" ? "bg-blue-600 border-blue-600 text-white" :
                      status === "current" ? "bg-blue-600 border-blue-600 text-white" :
                      "bg-white border-gray-300 text-gray-400"
                    }`}>
                      {status === "completed" ? <CheckCircle className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 ml-4 transition-all ${status === "completed" ? "bg-blue-600" : "bg-gray-300"}`} />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`font-medium ${status === "current" ? "text-blue-600" : status === "completed" ? "text-gray-900" : "text-gray-500"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8">{renderStepContent()}</div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!canProceed() || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        {!canProceed() && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Please complete all required fields to proceed to the next step.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
