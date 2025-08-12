"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wrench, 
  Truck, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Plus,
  Minus,
  DollarSign,
  FileText,
  Car
} from "lucide-react";
import { toast } from "sonner";

export default function DeInstallationForm({ companyName, accountInfo, onDeInstallationComplete }) {
  const [step, setStep] = useState(1);
  const [stockReceived, setStockReceived] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [vehicleProducts, setVehicleProducts] = useState({}); // Map of vehicleId to products
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quoteData, setQuoteData] = useState({
    customerName: accountInfo?.company_trading_name || accountInfo?.company || companyName || "",
    customerEmail: accountInfo?.email || "",
    customerPhone: accountInfo?.landline_no || "",
    customerAddress: accountInfo?.address || "",
    description: "",
    extraNotes: "",
    emailSubject: "",
    emailBody: "",
    quoteFooter: "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
  });

  // Fetch available vehicles for this account using new_account_number
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
        
        // Use new_account_number from accountInfo
        const accountNumber = accountInfo?.new_account_number || accountInfo?.account_number;
        
        if (!accountNumber) {
          setError("No account number available");
          return;
        }

        const response = await fetch(`${baseUrl}/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableVehicles(data.vehicles || []);
          } else {
            setError("No vehicles found for this account");
          }
        } else {
          setError("Failed to fetch vehicles");
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setError("Error fetching vehicles");
      } finally {
        setLoading(false);
      }
    };

    if (accountInfo?.new_account_number || accountInfo?.account_number) {
      fetchVehicles();
    }
  }, [accountInfo]);

  const handleStockReceivedChange = (value) => {
    setStockReceived(value === 'yes');
    setStep(2);
  };

  const handleVehicleSelection = (vehicleId, checked) => {
    if (checked) {
      setSelectedVehicles(prev => [...prev, vehicleId]);
      // Initialize vehicle products if not already set
      if (!vehicleProducts[vehicleId]) {
        setVehicleProducts(prev => ({
          ...prev,
          [vehicleId]: [{
            id: `deinstall-${vehicleId}`,
            name: "De-installation Service",
            description: "Standard de-installation service",
            quantity: 1,
            price: 0, // User will fill this in
            vehicleId: vehicleId,
            vehiclePlate: availableVehicles.find(v => v.id === vehicleId)?.plate_number || 'Unknown'
          }]
        }));
      }
    } else {
      setSelectedVehicles(prev => prev.filter(id => id !== vehicleId));
      // Remove vehicle products
      setVehicleProducts(prev => {
        const newProducts = { ...prev };
        delete newProducts[vehicleId];
        return newProducts;
      });
    }
  };

  const updateVehicleProductPrice = (vehicleId, price) => {
    setVehicleProducts(prev => ({
      ...prev,
      [vehicleId]: prev[vehicleId].map(product => ({
        ...product,
        price: parseFloat(price) || 0
      }))
    }));
  };

  const updateVehicleProductQuantity = (vehicleId, quantity) => {
    setVehicleProducts(prev => ({
      ...prev,
      [vehicleId]: prev[vehicleId].map(product => ({
        ...product,
        quantity: Math.max(1, parseInt(quantity) || 1)
      }))
    }));
  };

  const calculateVehicleProductTotal = (vehicleId) => {
    const products = vehicleProducts[vehicleId] || [];
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  };

  const calculateTotalAmount = () => {
    return Object.keys(vehicleProducts).reduce((total, vehicleId) => {
      return total + calculateVehicleProductTotal(vehicleId);
    }, 0);
  };

  const handleCreateQuote = async () => {
    try {
      setLoading(true);
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

      // Flatten all vehicle products into a single array
      const allProducts = Object.values(vehicleProducts).flat();

      const quotePayload = {
        jobType: "deinstall",
        description: quoteData.description,
        stockType: "de-installation",
        customerName: quoteData.customerName,
        customerEmail: quoteData.customerEmail,
        customerPhone: quoteData.customerPhone,
        customerAddress: quoteData.customerAddress,
        extraNotes: quoteData.extraNotes,
        emailSubject: quoteData.emailSubject,
        emailBody: quoteData.emailBody,
        quoteFooter: quoteData.quoteFooter,
        products: allProducts.map(product => ({
          product_id: product.id,
          quantity: product.quantity,
          cashPrice: product.price,
          cashDiscount: 0,
          rentalPrice: 0,
          rentalDiscount: 0,
          installationPrice: 0,
          installationDiscount: 0,
          total: product.price * product.quantity,
          vehicleId: product.vehicleId,
          vehiclePlate: product.vehiclePlate
        })),
        vehicles: selectedVehicles,
        stockReceived: stockReceived
      };

      const response = await fetch(`${baseUrl}/api/quotation`, {
        method: 'POST',
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("De-installation quote created successfully!");
          if (onDeInstallationComplete) {
            onDeInstallationComplete();
          }
        } else {
          toast.error(data.error || "Failed to create quote");
        }
      } else {
        toast.error("Failed to create quote");
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      toast.error("Error creating quote");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          De-Installation Process
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center items-center bg-blue-100 mx-auto rounded-full w-16 h-16">
            <Wrench className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-xl">Stock Received?</h3>
          <p className="text-gray-600">Has stock been received for de-installation?</p>
        </div>

        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => handleStockReceivedChange('yes')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 w-4 h-4" />
            Yes, Stock Received
          </Button>
          <Button 
            onClick={() => handleStockReceivedChange('no')}
            variant="outline"
          >
            <X className="mr-2 w-4 h-4" />
            No Stock Received
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Vehicle Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading vehicles...</p>
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : availableVehicles.length === 0 ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>No vehicles available for this account</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="mb-4 text-gray-600 text-sm">
                Select vehicles to be de-installed:
              </p>
              {availableVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`vehicle-${vehicle.id}`}
                    checked={selectedVehicles.includes(vehicle.id)}
                    onCheckedChange={(checked) => handleVehicleSelection(vehicle.id, checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`vehicle-${vehicle.id}`} className="font-medium">
                      {vehicle.plate_number || vehicle.new_registration || 'No Registration'}
                    </Label>
                    <p className="text-gray-500 text-sm">
                      {vehicle.make} {vehicle.model} - {vehicle.vehicle_type || 'Vehicle'}
                    </p>
                  </div>
                  <Badge variant="outline">{vehicle.vehicle_type || 'Vehicle'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              De-installation Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Set the de-installation price for each selected vehicle:
              </p>
              {selectedVehicles.map(vehicleId => {
                const vehicle = availableVehicles.find(v => v.id === vehicleId);
                const products = vehicleProducts[vehicleId] || [];
                return (
                  <div key={vehicleId} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-semibold">
                          {vehicle?.plate_number || vehicle?.new_registration || 'Unknown Vehicle'}
                        </h4>
                        <p className="text-gray-500 text-sm">
                          {vehicle?.make} {vehicle?.model}
                        </p>
                      </div>
                      <Badge variant="secondary">De-installation</Badge>
                    </div>
                    
                    {products.map((product, index) => (
                      <div key={product.id} className="space-y-3">
                        <div className="gap-4 grid grid-cols-3">
                          <div>
                            <Label className="text-xs">Service</Label>
                            <Input
                              value={product.name}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateVehicleProductQuantity(vehicleId, e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price (R)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => updateVehicleProductPrice(vehicleId, e.target.value)}
                              placeholder="Enter price"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-blue-600">
                            Total: R {calculateVehicleProductTotal(vehicleId).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button 
          onClick={() => setStep(3)}
          disabled={selectedVehicles.length === 0}
        >
          Continue to Quote
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            De-Installation Quote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold">Selected Vehicles</h4>
              <div className="space-y-2">
                {selectedVehicles.map(vehicleId => {
                  const vehicle = availableVehicles.find(v => v.id === vehicleId);
                  return vehicle ? (
                    <div key={vehicleId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{vehicle.plate_number || vehicle.new_registration || 'No Registration'}</p>
                        <p className="text-gray-500 text-sm">{vehicle.make} {vehicle.model}</p>
                      </div>
                      <Badge variant="secondary">To be deactivated</Badge>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">De-installation Services</h4>
              <div className="space-y-3">
                {Object.entries(vehicleProducts).map(([vehicleId, products]) => {
                  const vehicle = availableVehicles.find(v => v.id === vehicleId);
                  return products.map((product, index) => (
                    <div key={`${vehicleId}-${index}`} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-gray-500 text-sm">
                            Vehicle: {vehicle?.plate_number || vehicle?.new_registration || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="gap-2 grid grid-cols-3">
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <p className="font-medium text-sm">{product.quantity}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Price</Label>
                          <p className="font-medium text-sm">R {product.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <p className="font-medium text-sm">R {(product.price * product.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ));
                })}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Quote Details</h4>
              <div className="text-right">
                <p className="font-bold text-blue-600 text-2xl">R {calculateTotalAmount().toFixed(2)}</p>
                <p className="text-gray-500 text-sm">Total Amount</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Description</Label>
                <textarea
                  value={quoteData.description}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, description: e.target.value }))}
                  className="p-2 border rounded-md w-full"
                  rows={3}
                  placeholder="Describe the de-installation requirements..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button 
          onClick={handleCreateQuote}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="mr-2 border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
              Creating Quote...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 w-4 h-4" />
              Create De-Installation Quote
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">De-Installation for {companyName}</h1>
        <p className="text-gray-600">Process de-installation and create quotes</p>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
} 