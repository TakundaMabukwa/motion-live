"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Layout from "@/components/Layout";

export default function CreateQuote() {
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleError, setVehicleError] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState(null);

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
    quoteFooter:
      "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
    // De-installation specific fields
    selectedVehicles: [],
    selectedStock: [],
    stockReceived: false,
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
      icon: DollarSign,
    },
    { id: 3, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];

  useEffect(() => {
    if (formData.stockType === "new-stock") {
      fetchProducts();
    } else {
      setProducts([]);
      setProductError(null);
    }
  }, [formData.stockType]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError(null);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError(error.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchVehicles = async (companyName) => {
    if (!companyName) return;
    
    setLoadingVehicles(true);
    setVehicleError(null);
    try {
      const res = await fetch(`/api/vehicles-by-company?company=${encodeURIComponent(companyName)}`);
      if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      setVehicleError(error.message);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchStockItems = async (vehicleIds) => {
    if (!vehicleIds || vehicleIds.length === 0) {
      setStockItems([]);
      return;
    }
    
    setLoadingStock(true);
    setStockError(null);
    try {
      const vehicleIdsParam = vehicleIds.join(',');
      const res = await fetch(`/api/inventory/vehicle-stock?vehicleIds=${vehicleIdsParam}`);
      if (!res.ok) throw new Error(`Failed to fetch stock items: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setStockItems(data.stockItems || []);
      } else {
        throw new Error(data.error || 'Failed to fetch stock items');
      }
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
      setStockError(error.message);
      setStockItems([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const addProduct = (product) => {
    const newProduct = {
      id: product.id,
      name: product.product,
      quantity: 1,
      cashPrice: product.price,
      cashDiscount: 0,
      rentalPrice: product.rental,
      rentalDiscount: 0,
      installationPrice: product.installation,
      installationDiscount: 0,
    };
    setSelectedProducts([...selectedProducts, newProduct]);
  };

  const removeProduct = (index) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
  };

  const updateProduct = (index, field, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index][field] = value;
    setSelectedProducts(updatedProducts);
  };

  const calculateGrossAmount = (price, discount) => {
    return price * (1 - discount / 100);
  };

  const getProductTotal = (product) => {
    const grossCash = calculateGrossAmount(
      product.cashPrice,
      product.cashDiscount
    );
    const grossRental = calculateGrossAmount(
      product.rentalPrice,
      product.rentalDiscount
    );
    const grossInstallation = calculateGrossAmount(
      product.installationPrice,
      product.installationDiscount
    );
    return (grossCash + grossRental + grossInstallation) * product.quantity;
  };

  const getTotalQuoteAmount = () => {
    return selectedProducts.reduce(
      (total, product) => total + getProductTotal(product),
      0
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        if (formData.jobType === "deinstall") {
          return formData.jobType && formData.description && formData.selectedVehicles.length > 0;
        }
        return formData.jobType && formData.description;
      case 1:
        return (
          formData.customerName &&
          formData.customerEmail &&
          formData.customerPhone
        );
      case 2:
        if (formData.jobType === "deinstall") {
          return true; // De-installation doesn't require products
        }
        return selectedProducts.length > 0;
      case 3:
        return formData.emailSubject && formData.emailBody;
      default:
        return false;
    }
  };

  const handleSubmitQuote = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const quoteData = {
        ...formData,
        products: selectedProducts,
      };

      // Add de-installation specific data
      if (formData.jobType === "deinstall") {
        quoteData.selectedVehicles = formData.selectedVehicles;
        quoteData.selectedStock = formData.selectedStock;
        quoteData.stockReceived = formData.stockReceived;
        // De-installation pricing is handled by the API
      } else {
        quoteData.subtotal = getTotalQuoteAmount();
        quoteData.vat_amount = getTotalQuoteAmount() * 0.15;
        quoteData.total_amount = getTotalQuoteAmount() * 1.15;
      }

      const response = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create quote");
      }

      alert("Quote created successfully!");
      // Optionally reset form here
    } catch (error) {
      console.error("Error submitting quote:", error);
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
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Job Type *</Label>
          <Select
            value={formData.jobType}
            onValueChange={(value) =>
              setFormData({ ...formData, jobType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="install">Installation</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="deinstall">De-installation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.jobType !== "deinstall" && (
          <div className="space-y-2">
            <Label>Stock Type *</Label>
            <Select
              value={formData.stockType}
              onValueChange={(value) =>
                setFormData({ ...formData, stockType: value })
              }
            >
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
              <Select
                onValueChange={(value) => {
                  const product = products.find((p) => p.id === value);
                  if (product) addProduct(product);
                }}
              >
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

        {/* De-installation Vehicle Selection */}
        {formData.jobType === "deinstall" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Company Name *</Label>
              <Input
                placeholder="Enter customer company name"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  // Fetch vehicles when company name changes
                  if (e.target.value.trim()) {
                    fetchVehicles(e.target.value.trim());
                  }
                }}
              />
            </div>

            {loadingVehicles && (
              <div className="text-sm text-gray-500">Loading vehicles...</div>
            )}

            {vehicleError && (
              <div className="text-red-500 text-sm">{vehicleError}</div>
            )}

            {vehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Select Vehicle(s) for De-installation *</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                        formData.selectedVehicles.includes(vehicle.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        const isSelected = formData.selectedVehicles.includes(vehicle.id);
                        const newSelectedVehicles = isSelected
                          ? formData.selectedVehicles.filter(id => id !== vehicle.id)
                          : [...formData.selectedVehicles, vehicle.id];
                        
                        setFormData({
                          ...formData,
                          selectedVehicles: newSelectedVehicles
                        });
                        
                        // Fetch stock items for selected vehicles
                        fetchStockItems(newSelectedVehicles);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedVehicles.includes(vehicle.id)}
                        onChange={() => {}} // Handled by onClick
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {vehicle.new_registration || vehicle.registration_number || vehicle.registration || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {vehicle.make} {vehicle.model} ({vehicle.manufactured_year})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  Selected: {formData.selectedVehicles.length} vehicle(s)
                </div>
              </div>
            )}

            {formData.selectedVehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Stock Items to De-install</Label>
                
                {loadingStock && (
                  <div className="text-sm text-gray-500">Loading stock items...</div>
                )}

                {stockError && (
                  <div className="text-red-500 text-sm">{stockError}</div>
                )}

                {stockItems.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {stockItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                          formData.selectedStock.includes(item.id)
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          const isSelected = formData.selectedStock.includes(item.id);
                          setFormData({
                            ...formData,
                            selectedStock: isSelected
                              ? formData.selectedStock.filter(id => id !== item.id)
                              : [...formData.selectedStock, item.id]
                          });
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedStock.includes(item.id)}
                          onChange={() => {}} // Handled by onClick
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.name || item.product || 'Unknown Item'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {String(item.description || 'No description')} - Qty: {item.count || 1}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stockItems.length === 0 && !loadingStock && (
                  <div className="text-sm text-gray-500">
                    No stock items found for selected vehicles.
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Selected: {formData.selectedStock.length} item(s)
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="stockReceived"
                  checked={formData.stockReceived}
                  onChange={(e) =>
                    setFormData({ ...formData, stockReceived: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="stockReceived" className="text-sm">
                  Stock items will be returned to Soltrack inventory
                </Label>
              </div>
            </div>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Products</Label>
            <div className="space-y-2">
              {selectedProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span>{product.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(index)}
                  >
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
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="min-h-32"
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
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
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number"
              value={formData.customerPhone}
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              placeholder="Enter customer address"
              value={formData.customerAddress}
              onChange={(e) =>
                setFormData({ ...formData, customerAddress: e.target.value })
              }
            />
          </div>
        </div>
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
        {formData.jobType === "deinstall" ? (
          // De-installation quote details
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">De-installation Summary</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Selected Vehicles:</strong> {formData.selectedVehicles.length}</div>
                <div><strong>Selected Stock Items:</strong> {formData.selectedStock.length}</div>
                <div><strong>Stock Return:</strong> {formData.stockReceived ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">De-installation Fee</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Base Fee per Item</Label>
                  <Input
                    type="number"
                    placeholder="R 500.00"
                    value="500"
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Items</Label>
                  <Input
                    type="number"
                    value={formData.selectedStock.length || 0}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtotal ex VAT</Label>
                  <Input
                    readOnly
                    value={`R ${((formData.selectedStock.length || 0) * 500).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT (15%)</Label>
                  <Input
                    readOnly
                    value={`R ${(((formData.selectedStock.length || 0) * 500) * 0.15).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>R {(((formData.selectedStock.length || 0) * 500) * 1.15).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Regular installation quote details
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
                  onChange={(e) =>
                    updateProduct(
                      index,
                      "quantity",
                      parseInt(e.target.value) || 1
                    )
                  }
                  className="w-20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Cash Price</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Cash Price ex VAT</Label>
                  <Input
                    type="number"
                    placeholder="R 0.00"
                    value={product.cashPrice}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "cashPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    placeholder="0.00 %"
                    max="100"
                    value={product.cashDiscount}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "cashDiscount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gross Cash/Month ex VAT</Label>
                  <Input
                    readOnly
                    value={`R ${calculateGrossAmount(
                      product.cashPrice,
                      product.cashDiscount
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cash/Month ex VAT</Label>
                  <Input
                    readOnly
                    value={`R ${(
                      calculateGrossAmount(
                        product.cashPrice,
                        product.cashDiscount
                      ) * product.quantity
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Rental Price</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Rental Price ex VAT</Label>
                  <Input
                    type="number"
                    placeholder="R 0.00"
                    value={product.rentalPrice}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "rentalPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    placeholder="0.00 %"
                    max="100"
                    value={product.rentalDiscount}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "rentalDiscount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gross Rental/Month ex VAT</Label>
                  <Input
                    readOnly
                    value={`R ${calculateGrossAmount(
                      product.rentalPrice,
                      product.rentalDiscount
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Rental/Month ex VAT</Label>
                  <Input
                    readOnly
                    value={`R ${(
                      calculateGrossAmount(
                        product.rentalPrice,
                        product.rentalDiscount
                      ) * product.quantity
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Once Off Installation</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Once Off Installation</Label>
                  <Input
                    type="number"
                    placeholder="R 0.00"
                    value={product.installationPrice}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "installationPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installation Discount</Label>
                  <Input
                    type="number"
                    placeholder="0.00 %"
                    max="100"
                    value={product.installationDiscount}
                    onChange={(e) =>
                      updateProduct(
                        index,
                        "installationDiscount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gross Once Off Installation</Label>
                  <Input
                    readOnly
                    value={`R ${calculateGrossAmount(
                      product.installationPrice,
                      product.installationDiscount
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Once Off Installation</Label>
                  <Input
                    readOnly
                    value={`R ${(
                      calculateGrossAmount(
                        product.installationPrice,
                        product.installationDiscount
                      ) * product.quantity
                    ).toFixed(2)}`}
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="font-medium">
                Product Total: R {getProductTotal(product).toFixed(2)}
              </p>
            </div>
            <Separator />
          </div>
        ))
        )}

        <div className="space-y-2">
          <Label htmlFor="extraNotes">Extra Notes For Quotes</Label>
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

        <div className="flex justify-end">
          <div className="text-right">
            {formData.jobType === "deinstall" ? (
              <>
                <p className="text-lg font-semibold">
                  Total Quote Amount: R {(((formData.selectedStock.length || 0) * 500) * 1.15).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  (VAT: R {(((formData.selectedStock.length || 0) * 500) * 0.15).toFixed(2)})
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">
                  Total Quote Amount: R {getTotalQuoteAmount().toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  (VAT: R {(getTotalQuoteAmount() * 0.15).toFixed(2)})
                </p>
              </>
            )}
          </div>
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
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Quote</h1>
            <p className="text-gray-600">
              Follow the steps to create a professional quote
            </p>
          </div>

          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="flex items-center w-full">
                      <div
                        className={`
                        flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                        ${
                          status === "completed"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : status === "current"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-300 text-gray-400"
                        }
                      `}
                      >
                        {status === "completed" ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>

                      {index < steps.length - 1 && (
                        <div
                          className={`
                          flex-1 h-0.5 ml-4 transition-all
                          ${
                            status === "completed"
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }
                        `}
                        />
                      )}
                    </div>

                    <div className="mt-2 text-center">
                      <p
                        className={`font-medium ${
                          status === "current"
                            ? "text-blue-600"
                            : status === "completed"
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
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
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuote}
                disabled={!canProceed() || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Creating Quote..." : "Create Quote"}
              </Button>
            )}
          </div>

          {!canProceed() && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Please complete all required fields to proceed to the next
                  step.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
