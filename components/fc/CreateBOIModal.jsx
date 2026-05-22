"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Package } from "lucide-react";

const CATEGORIES = [
  "MODULE",
  "PFK CAMERA",
  "SERVICES",
  "MTX CAMERA",
  "DVR CAMERA",
  "FMS",
  "DASHCAM",
  "PTT",
  "INPUT",
  "DATA",
];

export default function CreateBOIModal() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "MODULE",
    product: "",
    description: "",
    category: "MODULE",
    price: "0",
    quantity: "1",
    discount: "0",
    rental: "0",
    installation: "0",
    subscription: "0",
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setOpen(false);
    setForm({
      type: "MODULE",
      product: "",
      description: "",
      category: "MODULE",
      price: "0",
      quantity: "1",
      discount: "0",
      rental: "0",
      installation: "0",
      subscription: "0",
    });
  };

  const handleSubmit = async () => {
    if (!form.product.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/product-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create product item");
      }

      toast.success(`BOI "${form.product}" created successfully`);
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to create product item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Package className="w-4 h-4" />
          <span>Create BOI</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create BOI (Product Item)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="flex w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g. MODULE"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="flex w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name *</label>
            <Input
              value={form.product}
              onChange={(e) => updateField("product", e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (Cash)</label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                step="1"
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount</label>
              <Input
                type="number"
                step="0.01"
                value={form.discount}
                onChange={(e) => updateField("discount", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rental</label>
              <Input
                type="number"
                step="0.01"
                value={form.rental}
                onChange={(e) => updateField("rental", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Installation</label>
              <Input
                type="number"
                step="0.01"
                value={form.installation}
                onChange={(e) => updateField("installation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription</label>
              <Input
                type="number"
                step="0.01"
                value={form.subscription}
                onChange={(e) => updateField("subscription", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 w-4 h-4" />
                  Create BOI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
