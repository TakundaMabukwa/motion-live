"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Trash2,
  Download,
  FileText,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

export default function StockOrderModal({ onOrderSubmitted }) {
  const [orderItems, setOrderItems] = useState([]);
  const [newItem, setNewItem] = useState({
    description: "",
    cost_excl_vat_zar: "",
    quantity: 1,
    purchasing_currency: "ZAR",
    preferred_supplier: "",
    supplier_product_code: "",
  });
  const [supplier, setSupplier] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockPricingData, setStockPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { toast } = useToast();

  const supabase = createClient();

  useEffect(() => {
    if (!isDialogOpen) return;
    fetchStockPricing();
    generateOrderNumber();
  }, [isDialogOpen]);

  const fetchStockPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_pricing")
        .select(
          "id, description, cost_excl_vat_zar, USD, supplier, stock_type, preferred_supplier, supplier_product_code, purchasing_currency, forex_base_price, current_roe, gl_group, requires_serial_number, is_tangible, valuation_method, override_tax_type",
        );

      if (error) throw error;
      setStockPricingData(data || []);
    } catch (error) {
      console.error("Error fetching stock pricing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "We couldn't load stock pricing right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    setOrderNumber(`SO-${timestamp}-${random}`);
  };

  const addToOrder = (item) => {
    const existingItem = orderItems.find(
      (orderItem) => orderItem.id === item.id,
    );
    if (existingItem) {
      setOrderItems(
        orderItems.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        ),
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: item.id,
          description: item.description,
          cost_excl_vat_zar: parseFloat(item.cost_excl_vat_zar || 0),
          USD: parseFloat(item.USD || 0),
          supplier: item.supplier,
          stock_type: item.stock_type,
          preferred_supplier: item.preferred_supplier || item.supplier || "",
          supplier_product_code: item.supplier_product_code || "",
          purchasing_currency: item.purchasing_currency || "ZAR",
          forex_base_price: parseFloat(item.forex_base_price || 0),
          current_roe: parseFloat(item.current_roe || 0),
          gl_group: item.gl_group || "",
          requires_serial_number: Boolean(item.requires_serial_number),
          is_tangible: item.is_tangible ?? true,
          valuation_method: item.valuation_method || "",
          override_tax_type: item.override_tax_type || "",
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((item) => item.id !== itemId));
    } else {
      const existingItem = orderItems.find((item) => item.id === itemId);
      if (existingItem) {
        // Update existing item
        setOrderItems(
          orderItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item,
          ),
        );
      } else {
        // Add new item from stockPricingData
        const stockItem = stockPricingData.find((item) => item.id === itemId);
        if (stockItem) {
          setOrderItems([
            ...orderItems,
            {
              id: stockItem.id,
              description: stockItem.description,
              cost_excl_vat_zar: parseFloat(stockItem.cost_excl_vat_zar || 0),
              USD: parseFloat(stockItem.USD || 0),
              supplier: stockItem.supplier,
              stock_type: stockItem.stock_type,
              preferred_supplier:
                stockItem.preferred_supplier || stockItem.supplier || "",
              supplier_product_code: stockItem.supplier_product_code || "",
              purchasing_currency: stockItem.purchasing_currency || "ZAR",
              forex_base_price: parseFloat(stockItem.forex_base_price || 0),
              current_roe: parseFloat(stockItem.current_roe || 0),
              gl_group: stockItem.gl_group || "",
              requires_serial_number: Boolean(stockItem.requires_serial_number),
              is_tangible: stockItem.is_tangible ?? true,
              valuation_method: stockItem.valuation_method || "",
              override_tax_type: stockItem.override_tax_type || "",
              quantity: quantity,
            },
          ]);
        }
      }
    }
  };

  const addNewItem = () => {
    if (!newItem.description || !newItem.cost_excl_vat_zar) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    const customItem = {
      id: `custom-${Date.now()}`,
      description: newItem.description,
      cost_excl_vat_zar: parseFloat(newItem.cost_excl_vat_zar),
      USD: 0,
      supplier: "Custom",
      stock_type: "Custom",
      preferred_supplier: newItem.preferred_supplier || "Custom",
      supplier_product_code: newItem.supplier_product_code || "",
      purchasing_currency: newItem.purchasing_currency || "ZAR",
      forex_base_price: 0,
      current_roe: 0,
      gl_group: "",
      requires_serial_number: false,
      is_tangible: true,
      valuation_method: "",
      override_tax_type: "",
      quantity: parseInt(newItem.quantity),
    };

    setOrderItems([...orderItems, customItem]);
    setNewItem({
      description: "",
      cost_excl_vat_zar: "",
      quantity: 1,
      purchasing_currency: "ZAR",
      preferred_supplier: "",
      supplier_product_code: "",
    });
    toast({
      variant: "success",
      title: "Success",
      description: "Custom item added",
    });
  };

  const calculateTotal = () => {
    return orderItems.reduce(
      (total, item) => total + item.cost_excl_vat_zar * item.quantity,
      0,
    );
  };

  const calculateVAT = () => {
    return calculateTotal() * 0.15;
  };

  const calculateTotalInclVAT = () => {
    return calculateTotal() + calculateVAT();
  };

  const saveOrderToDatabase = async (invoiceLink) => {
    try {
      const orderData = {
        order_number: orderNumber,
        order_date: new Date().toISOString(),
        supplier: supplier,
        total_amount_ex_vat: calculateTotal(),
        total_amount_usd: orderItems.reduce(
          (total, item) => total + item.USD * item.quantity,
          0,
        ),
        status: "pending",
        created_by: "Inventory User",
        order_items: orderItems,
        invoice_link: invoiceLink,
      };

      const { data, error } = await supabase
        .from("stock_orders")
        .insert([orderData])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save order",
      });
      return null;
    }
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    try {
      const invoiceLink = await downloadPDF();
      if (invoiceLink) {
        const savedOrder = await saveOrderToDatabase(invoiceLink);
        if (savedOrder) {
          toast({
            variant: "success",
            title: "Success",
            description: "Order submitted successfully!",
          });
          setShowInvoice(false);
          setOrderItems([]);
          setSupplier("");
          generateOrderNumber();
          setIsDialogOpen(false);

          // Call the callback to refresh stock orders
          if (onOrderSubmitted) {
            onOrderSubmitted();
          }
        }
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit order",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const element = document.getElementById("invoice-content");
      if (!element) return null;

      const canvas = await import("html2canvas").then((module) =>
        module.default(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
        }),
      );

      const imgData = canvas.toDataURL("image/png");
      const pdf = await import("jspdf").then(
        (module) => new module.default("p", "mm", "a4"),
      );

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output("blob");
      const fileName = `stock-order-${orderNumber}-${Date.now()}.pdf`;

      const { data, error } = await supabase.storage
        .from("invoices")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("invoices").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF",
      });
      return null;
    }
  };

  const filteredStockItems = stockPricingData.filter(
    (item) =>
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier &&
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.preferred_supplier &&
        item.preferred_supplier
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (item.supplier_product_code &&
        item.supplier_product_code
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (item.gl_group &&
        item.gl_group.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const formatCurrency = (amount) =>
    `R ${Number(amount || 0).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsDialogOpen(true)}
        >
          <Package className="mr-2 w-4 h-4" />
          Order Stock
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Stock</DialogTitle>
          <DialogDescription>
            Select stock items, specify quantities, and submit your order. You
            can also add custom items with custom pricing.
          </DialogDescription>
        </DialogHeader>

        {!showInvoice ? (
          <div className="space-y-6">
            {/* Order Details */}
            <div className="gap-4 grid grid-cols-2">
              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Order number"
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            {/* Header with Search and Add Custom Item */}
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-md">
                <Label htmlFor="search">Search Stock Items</Label>
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by description or supplier..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Add Custom Item - moved to top right */}
              <div className="p-4 border rounded-lg min-w-[300px]">
                <h3 className="mb-4 font-semibold text-lg">Add Custom Item</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      placeholder="Item description"
                    />
                  </div>
                  <div className="gap-3 grid grid-cols-2">
                    <div>
                      <Label htmlFor="cost">Cost (ZAR)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={newItem.cost_excl_vat_zar}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            cost_excl_vat_zar: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({ ...newItem, quantity: e.target.value })
                        }
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="gap-3 grid grid-cols-2">
                    <div>
                      <Label htmlFor="customCurrency">Currency</Label>
                      <Input
                        id="customCurrency"
                        value={newItem.purchasing_currency}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            purchasing_currency: e.target.value,
                          })
                        }
                        placeholder="ZAR"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customSupplierCode">Supplier Code</Label>
                      <Input
                        id="customSupplierCode"
                        value={newItem.supplier_product_code}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            supplier_product_code: e.target.value,
                          })
                        }
                        placeholder="Supplier product code"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customPreferredSupplier">
                      Preferred Supplier
                    </Label>
                    <Input
                      id="customPreferredSupplier"
                      value={newItem.preferred_supplier}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          preferred_supplier: e.target.value,
                        })
                      }
                      placeholder="Preferred supplier"
                    />
                  </div>
                  <Button
                    onClick={addNewItem}
                    className="bg-purple-600 hover:bg-purple-700 w-full"
                  >
                    <Plus className="mr-2 w-4 h-4" />
                    Add Custom Item
                  </Button>
                </div>
              </div>
            </div>

            {/* Stock Items List */}
            <div>
              <h3 className="mb-4 font-semibold text-lg">
                Available Stock Items
              </h3>
              {loading ? (
                <div className="py-4 text-center">Loading stock items...</div>
              ) : (
                <div className="space-y-2 p-4 border rounded-lg max-h-96 overflow-y-auto">
                  {filteredStockItems.map((item) => {
                    const orderItem = orderItems.find(
                      (oi) => oi.id === item.id,
                    );
                    const selectedQuantity = orderItem ? orderItem.quantity : 0;

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center hover:bg-gray-50 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.description}</div>
                          <div className="text-gray-600 text-sm">
                            Cost: R{" "}
                            {parseFloat(item.cost_excl_vat_zar || 0).toFixed(2)}{" "}
                            | USD: ${parseFloat(item.USD || 0).toFixed(2)} |
                            Supplier:{" "}
                            {item.preferred_supplier || item.supplier || "N/A"}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Supplier Code: {item.supplier_product_code || "N/A"}{" "}
                            | Currency: {item.purchasing_currency || "ZAR"} |
                            GL: {item.gl_group || "N/A"}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {item.requires_serial_number
                              ? "Serial required"
                              : "No serial required"}{" "}
                            | {item.is_tangible ? "Tangible" : "Non-tangible"} |{" "}
                            {item.valuation_method || "No valuation"} |{" "}
                            {item.override_tax_type || "No tax override"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="min-w-[120px] text-gray-600 text-sm text-right">
                            <div>Selected: {selectedQuantity}</div>
                            {selectedQuantity > 0 && (
                              <div className="font-medium text-blue-600">
                                R{" "}
                                {(
                                  parseFloat(item.cost_excl_vat_zar || 0) *
                                  selectedQuantity
                                ).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`qty-${item.id}`}
                              className="text-sm"
                            >
                              Qty:
                            </Label>
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              value={selectedQuantity}
                              onChange={(e) =>
                                updateQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-20"
                              min="0"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowInvoice(true)}
                disabled={orderItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="mr-2 w-4 h-4" />
                Preview Invoice
              </Button>
            </div>
          </div>
        ) : (
          /* Invoice Preview */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Invoice Preview</h3>
              <Button onClick={downloadPDF} variant="outline">
                <Download className="mr-2 w-4 h-4" />
                Download PDF
              </Button>
            </div>

            <div
              id="invoice-content"
              className="bg-white border rounded-lg overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b p-4">
                <div className="flex items-start gap-4">
                  <img
                    src="/soltrack_logo.png"
                    alt="Soltrack"
                    className="w-24 h-auto"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Soltrack (PTY) LTD
                    </p>
                    <p className="text-xs text-gray-500">
                      Reg No: 2018/095975/07
                    </p>
                    <p className="text-xs text-gray-500">VAT No: 4580161802</p>
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">
                    Stock Order Invoice
                  </p>
                  <p>
                    Invoice: <span className="font-medium">{orderNumber}</span>
                  </p>
                  <p>
                    Date:{" "}
                    <span className="font-medium">
                      {formatDate(new Date().toISOString())}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-b p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Bill To
                  </p>
                  <p className="font-semibold text-gray-900">
                    {supplier || "Stock Procurement"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Purchasing request prepared from Accounts / Inventory
                  </p>
                  <p className="text-sm text-gray-600">
                    Preferred suppliers and pricing metadata included per line
                    item
                  </p>
                </div>
                <div className="text-sm text-gray-700">
                  <p>
                    <span className="text-gray-500">Supplier:</span>{" "}
                    {supplier || "Not specified"}
                  </p>
                  <p>
                    <span className="text-gray-500">Line Items:</span>{" "}
                    {orderItems.length}
                  </p>
                  <p>
                    <span className="text-gray-500">Currencies:</span>{" "}
                    {[
                      ...new Set(
                        orderItems
                          .map((item) => item.purchasing_currency || "ZAR")
                          .filter(Boolean),
                      ),
                    ].join(", ")}
                  </p>
                  <p>
                    <span className="text-gray-500">Prepared For:</span> Stock
                    Order Processing
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b p-3 text-left">Item</th>
                        <th className="border-b p-3 text-left">Description</th>
                        <th className="border-b p-3 text-left">Supplier</th>
                        <th className="border-b p-3 text-left">Commercial</th>
                        <th className="border-b p-3 text-right">Qty</th>
                        <th className="border-b p-3 text-right">Unit Price</th>
                        <th className="border-b p-3 text-right">VAT %</th>
                        <th className="border-b p-3 text-right">VAT</th>
                        <th className="border-b p-3 text-right">Total Incl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-4 text-center text-sm text-gray-500"
                          >
                            No stock items selected for this order yet.
                          </td>
                        </tr>
                      ) : (
                        orderItems.map((item, index) => {
                          const qty = Math.max(1, Number(item.quantity) || 1);
                          const unitPrice = Number(item.cost_excl_vat_zar || 0);
                          const lineSubtotal = unitPrice * qty;
                          const lineVat = lineSubtotal * 0.15;
                          const lineTotal = lineSubtotal + lineVat;

                          return (
                            <tr
                              key={item.id}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="border-b p-3 font-medium">
                                {item.stock_type || "Stock Item"}
                              </td>
                              <td className="border-b p-3 text-gray-600">
                                <div>{item.description}</div>
                                <div className="text-xs text-gray-500">
                                  {item.gl_group || "No GL group"} |{" "}
                                  {item.requires_serial_number
                                    ? "Serial required"
                                    : "No serial required"}{" "}
                                  |{" "}
                                  {item.is_tangible
                                    ? "Tangible"
                                    : "Non-tangible"}
                                </div>
                              </td>
                              <td className="border-b p-3 text-gray-600">
                                <div>
                                  {item.preferred_supplier ||
                                    item.supplier ||
                                    "N/A"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.supplier_product_code || "No code"}
                                </div>
                              </td>
                              <td className="border-b p-3 text-gray-600">
                                <div>
                                  {item.purchasing_currency || "ZAR"}
                                  {item.forex_base_price
                                    ? ` ${Number(item.forex_base_price).toFixed(2)}`
                                    : ""}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ROE:{" "}
                                  {item.current_roe
                                    ? Number(item.current_roe).toFixed(2)
                                    : "N/A"}{" "}
                                  | {item.valuation_method || "No valuation"}
                                </div>
                              </td>
                              <td className="border-b p-3 text-right">{qty}</td>
                              <td className="border-b p-3 text-right">
                                {formatCurrency(unitPrice)}
                              </td>
                              <td className="border-b p-3 text-right">15%</td>
                              <td className="border-b p-3 text-right">
                                {formatCurrency(lineVat)}
                              </td>
                              <td className="border-b p-3 text-right font-semibold">
                                {formatCurrency(lineTotal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t p-4 md:grid-cols-2">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">Notes</p>
                  <p>
                    This invoice preview reflects the exact stock order payload
                    that will be saved, including supplier, product code,
                    currency, GL group, serial requirements, and valuation data.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Excl. VAT</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">VAT (15%)</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(calculateVAT())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-semibold text-gray-900">
                      Total Incl. VAT
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(calculateTotalInclVAT())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowInvoice(false)} variant="outline">
                Back to Order
              </Button>
              <Button
                onClick={submitOrder}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Submitting..." : "Submit Order"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
