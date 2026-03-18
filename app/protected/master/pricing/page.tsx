"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingItem {
  id: string;
  type: string;
  product: string;
  description?: string | null;
  category: string;
  price: number;
  quantity?: number | null;
  discount?: number | null;
  rental?: number | null;
  installation?: number | null;
  subscription?: number | null;
}

interface HierarchicalBillRow extends PricingItem {
  parent_id?: string | null;
  is_main_item?: boolean;
  sort_order?: number | null;
  source_sheet?: string | null;
  source_workbook?: string | null;
  pricing_model?: string | null;
  notes?: string | null;
}

type TableName = "product_items" | "bill_of_items";
type ActiveTab = "bill-of-items";

interface EditState {
  table: TableName;
  row: PricingItem | HierarchicalBillRow;
}

interface MainItemFormState {
  type: string;
  product: string;
  description: string;
  category: string;
  source_sheet: string;
  pricing_model: string;
  price: string;
  quantity: string;
  discount: string;
  rental: string;
  installation: string;
  subscription: string;
}

interface BulkEditRowState {
  id: string;
  product: string;
  description: string;
  category: string;
  quantity: string;
  price: string;
  discount: string;
  rental: string;
  installation: string;
  subscription: string;
}

interface EditPricingBaseState {
  price: number;
  rental: number;
}

const numberValue = (value?: number | null) => Number(value || 0);
const money = (value?: number | null) =>
  `R${numberValue(value).toLocaleString()}`;
const toDiscountedAmount = (baseAmount: number, discountPercent: number) => {
  const safeBase = Number.isFinite(baseAmount) ? baseAmount : 0;
  const safeDiscount = Math.min(
    Math.max(Number.isFinite(discountPercent) ? discountPercent : 0, 0),
    100,
  );
  const discounted = safeBase * (1 - safeDiscount / 100);
  return Number(discounted.toFixed(2));
};

export default function PricingPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [activeTab] = useState<ActiveTab>("bill-of-items");
  const [productItems, setProductItems] = useState<PricingItem[]>([]);
  const [billItems, setBillItems] = useState<HierarchicalBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [billSheetFilter, setBillSheetFilter] = useState("all");
  const [showAddMainDialog, setShowAddMainDialog] = useState(false);
  const [savingMainItem, setSavingMainItem] = useState(false);
  const [addChildSelections, setAddChildSelections] = useState<
    Record<string, string>
  >({});
  const [addingChildGroupId, setAddingChildGroupId] = useState<string | null>(
    null,
  );
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [bulkEditState, setBulkEditState] = useState<{
    groupKey: string;
    mainItem: HierarchicalBillRow;
    rows: BulkEditRowState[];
  } | null>(null);
  const [savingBulkEdit, setSavingBulkEdit] = useState(false);
  const [editPricingBase, setEditPricingBase] = useState<EditPricingBaseState>({
    price: 0,
    rental: 0,
  });
  const [editForm, setEditForm] = useState({
    type: "",
    product: "",
    description: "",
    category: "",
    price: "0",
    quantity: "1",
    discount: "0",
    rental: "0",
    installation: "0",
    subscription: "0",
  });
  const [mainItemForm, setMainItemForm] = useState<MainItemFormState>({
    type: "",
    product: "",
    description: "",
    category: "",
    source_sheet: "",
    pricing_model: "",
    price: "0",
    quantity: "1",
    discount: "0",
    rental: "0",
    installation: "0",
    subscription: "0",
  });

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const [
        { data: productData, error: productError },
        { data: billData, error: billError },
      ] = await Promise.all([
        supabase
          .from("product_items")
          .select(
            "id, type, product, description, category, price, quantity, discount, rental, installation, subscription",
          )
          .order("product", { ascending: true }),
        supabase
          .from("bill_of_items")
          .select(
            "id, parent_id, is_main_item, sort_order, source_sheet, source_workbook, pricing_model, notes, type, product, description, category, price, quantity, discount, rental, installation, subscription",
          )
          .order("source_sheet", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("product", { ascending: true }),
      ]);
      if (productError) throw productError;
      if (billError) throw billError;
      setProductItems(productData || []);
      setBillItems(billData || []);
    } catch (err) {
      console.error("Failed to fetch pricing items", err);
      toast({ title: "Failed to load pricing", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const groupedBillItems = useMemo(() => {
    const mainRows = billItems
      .filter((row) => row.is_main_item)
      .sort((a, b) => {
        const sheetCompare = String(a.source_sheet || "").localeCompare(
          String(b.source_sheet || ""),
        );
        if (sheetCompare !== 0) return sheetCompare;
        return numberValue(a.sort_order) - numberValue(b.sort_order);
      });

    return mainRows.map((mainRow) => {
      const rows = billItems
        .filter((row) => row.parent_id === mainRow.id)
        .sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order));
      return {
        key: mainRow.id,
        primaryRow: mainRow,
        rows,
        totals: {
          price: rows.reduce((sum, row) => sum + numberValue(row.price), 0),
          rental: rows.reduce((sum, row) => sum + numberValue(row.rental), 0),
          installation: rows.reduce(
            (sum, row) => sum + numberValue(row.installation),
            0,
          ),
          subscription: rows.reduce(
            (sum, row) => sum + numberValue(row.subscription),
            0,
          ),
        },
      };
    });
  }, [billItems]);

  const billSheetOptions = useMemo(
    () =>
      Array.from(
        new Set(billItems.map((item) => item.source_sheet).filter(Boolean)),
      ) as string[],
    [billItems],
  );

  const filteredProductItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return productItems;
    return productItems.filter((item) =>
      [item.type, item.product, item.description, item.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [productItems, searchTerm]);

  const filteredBillGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return groupedBillItems.filter((group) => {
      const matchesSheet =
        billSheetFilter === "all" ||
        group.primaryRow.source_sheet === billSheetFilter;
      if (!matchesSheet) return false;
      if (!query) return true;
      const haystack = [
        group.primaryRow.product,
        group.primaryRow.description,
        group.primaryRow.source_sheet,
        group.primaryRow.pricing_model,
        ...group.rows.flatMap((row) => [
          row.product,
          row.description,
          row.category,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [groupedBillItems, searchTerm, billSheetFilter]);
  const openEditDialog = (
    table: TableName,
    row: PricingItem | HierarchicalBillRow,
  ) => {
    const basePrice = numberValue(row.price);
    const baseRental = numberValue(row.rental);
    setEditState({ table, row });
    setEditPricingBase({
      price: basePrice,
      rental: baseRental,
    });
    setEditForm({
      type: row.type || "",
      product: row.product || "",
      description: row.description || "",
      category: row.category || "",
      price: String(basePrice),
      quantity: String(row.quantity ?? 1),
      discount: String(row.discount ?? 0),
      rental: String(baseRental),
      installation: String(row.installation ?? 0),
      subscription: String(row.subscription ?? 0),
    });
  };

  const closeEditDialog = () => setEditState(null);

  const handleEditDiscountChange = (discountValue: string) => {
    const discountPercent = Number(discountValue || 0);
    setEditForm((prev) => ({
      ...prev,
      discount: discountValue,
      price: String(toDiscountedAmount(editPricingBase.price, discountPercent)),
      rental: String(
        toDiscountedAmount(editPricingBase.rental, discountPercent),
      ),
    }));
  };

  const saveEdit = async () => {
    if (!editState) return;
    try {
      setSaving(true);
      const payload = {
        type: editForm.type.trim(),
        product: editForm.product.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category.trim(),
        price: Number(editForm.price || 0),
        quantity: Number(editForm.quantity || 1),
        discount: Number(editForm.discount || 0),
        rental: Number(editForm.rental || 0),
        installation: Number(editForm.installation || 0),
        subscription: Number(editForm.subscription || 0),
      };
      const { error } = await supabase
        .from(editState.table)
        .update(payload)
        .eq("id", editState.row.id);
      if (error) throw error;
      toast({
        title: "Pricing updated",
        description: `${payload.product} was updated successfully.`,
      });
      closeEditDialog();
      await fetchPricing();
    } catch (error) {
      console.error("Failed to update pricing", error);
      toast({ title: "Failed to update pricing", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupKey: string) =>
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));

  const openAddMainDialog = () => {
    setMainItemForm({
      type: "",
      product: "",
      description: "",
      category: "",
      source_sheet: billSheetFilter === "all" ? "" : billSheetFilter,
      pricing_model: "",
      price: "0",
      quantity: "1",
      discount: "0",
      rental: "0",
      installation: "0",
      subscription: "0",
    });
    setShowAddMainDialog(true);
  };

  const handleAddMainItem = async () => {
    try {
      setSavingMainItem(true);
      const payload = {
        type: mainItemForm.type.trim(),
        product: mainItemForm.product.trim(),
        description: mainItemForm.description.trim() || null,
        category: mainItemForm.category.trim(),
        source_sheet: mainItemForm.source_sheet.trim() || null,
        pricing_model: mainItemForm.pricing_model.trim() || null,
        source_workbook: "Ituran Costings.xlsx",
        is_main_item: true,
        parent_id: null,
        sort_order: billItems.filter((item) => !item.parent_id).length + 1,
        price: Number(mainItemForm.price || 0),
        quantity: Number(mainItemForm.quantity || 1),
        discount: Number(mainItemForm.discount || 0),
        rental: Number(mainItemForm.rental || 0),
        installation: Number(mainItemForm.installation || 0),
        subscription: Number(mainItemForm.subscription || 0),
      };
      if (!payload.type || !payload.product || !payload.category) {
        toast({
          title: "Missing main item details",
          description:
            "Type, product, and category are required before saving.",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase.from("bill_of_items").insert(payload);
      if (error) throw error;
      toast({
        title: "Main item added",
        description: `${payload.product} is now available in Bill Of Items.`,
      });
      setShowAddMainDialog(false);
      await fetchPricing();
    } catch (error) {
      console.error("Failed to add main item", error);
      toast({
        title: "Failed to add main item",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingMainItem(false);
    }
  };

  const handleDeleteMainItem = async (mainItem: HierarchicalBillRow) => {
    try {
      setDeletingRowId(mainItem.id);
      const { error: childDeleteError } = await supabase
        .from("bill_of_items")
        .delete()
        .eq("parent_id", mainItem.id);
      if (childDeleteError) throw childDeleteError;
      const { error } = await supabase
        .from("bill_of_items")
        .delete()
        .eq("id", mainItem.id);
      if (error) throw error;
      toast({
        title: "Main item deleted",
        description: `${mainItem.product} and its sub items were removed.`,
      });
      await fetchPricing();
    } catch (error) {
      console.error("Failed to delete main item", error);
      toast({
        title: "Failed to delete main item",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingRowId(null);
    }
  };

  const handleDeleteSubItem = async (row: HierarchicalBillRow) => {
    try {
      setDeletingRowId(row.id);
      const { error } = await supabase
        .from("bill_of_items")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      toast({
        title: "Sub item deleted",
        description: `${row.product} was removed from the main item.`,
      });
      await fetchPricing();
    } catch (error) {
      console.error("Failed to delete sub item", error);
      toast({
        title: "Failed to delete sub item",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingRowId(null);
    }
  };

  const handleAddChildItem = async (group: {
    key: string;
    primaryRow: HierarchicalBillRow;
    rows: HierarchicalBillRow[];
  }) => {
    const selectedItem = productItems.find(
      (item) => item.id === addChildSelections[group.key],
    );
    if (!selectedItem) {
      toast({
        title: "Choose an item first",
        description:
          "Select a product item from the dropdown before adding it.",
        variant: "destructive",
      });
      return;
    }
    try {
      setAddingChildGroupId(group.key);
      const nextSortOrder =
        group.rows.reduce(
          (max, row) => Math.max(max, numberValue(row.sort_order)),
          0,
        ) + 1;
      const payload = {
        parent_id: group.primaryRow.id,
        is_main_item: false,
        sort_order: nextSortOrder,
        source_sheet: group.primaryRow.source_sheet || null,
        source_workbook:
          group.primaryRow.source_workbook || "Ituran Costings.xlsx",
        pricing_model: group.primaryRow.pricing_model || null,
        type: selectedItem.type,
        product: selectedItem.product,
        description: selectedItem.description || null,
        category: selectedItem.category,
        price: numberValue(selectedItem.price),
        quantity: numberValue(selectedItem.quantity) || 1,
        discount: numberValue(selectedItem.discount),
        rental: numberValue(selectedItem.rental),
        installation: numberValue(selectedItem.installation),
        subscription: numberValue(selectedItem.subscription),
      };
      const { error } = await supabase.from("bill_of_items").insert(payload);
      if (error) throw error;
      toast({
        title: "Sub item added",
        description: `${selectedItem.product} was added under ${group.primaryRow.product}.`,
      });
      setAddChildSelections((prev) => ({ ...prev, [group.key]: "" }));
      await fetchPricing();
      setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
    } catch (error) {
      console.error("Failed to add sub item", error);
      toast({
        title: "Failed to add sub item",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingChildGroupId(null);
    }
  };

  const openBulkEditDialog = (group: {
    key: string;
    primaryRow: HierarchicalBillRow;
    rows: HierarchicalBillRow[];
  }) => {
    setBulkEditState({
      groupKey: group.key,
      mainItem: group.primaryRow,
      rows: group.rows.map((row) => ({
        id: row.id,
        product: row.product || "",
        description: row.description || "",
        category: row.category || "",
        quantity: String(row.quantity ?? 1),
        price: String(row.price ?? 0),
        discount: String(row.discount ?? 0),
        rental: String(row.rental ?? 0),
        installation: String(row.installation ?? 0),
        subscription: String(row.subscription ?? 0),
      })),
    });
  };

  const updateBulkEditRow = (
    rowId: string,
    field: keyof BulkEditRowState,
    value: string,
  ) => {
    setBulkEditState((prev) =>
      prev
        ? {
            ...prev,
            rows: prev.rows.map((row) =>
              row.id === rowId ? { ...row, [field]: value } : row,
            ),
          }
        : prev,
    );
  };

  const saveBulkEdit = async () => {
    if (!bulkEditState) return;
    try {
      setSavingBulkEdit(true);
      for (const row of bulkEditState.rows) {
        const { error } = await supabase
          .from("bill_of_items")
          .update({
            product: row.product.trim(),
            description: row.description.trim() || null,
            category: row.category.trim(),
            quantity: Number(row.quantity || 1),
            price: Number(row.price || 0),
            discount: Number(row.discount || 0),
            rental: Number(row.rental || 0),
            installation: Number(row.installation || 0),
            subscription: Number(row.subscription || 0),
          })
          .eq("id", row.id);
        if (error) throw error;
      }
      const currentGroupKey = bulkEditState.groupKey;
      toast({
        title: "Sub items updated",
        description: `${bulkEditState.rows.length} sub items were saved for ${bulkEditState.mainItem.product}.`,
      });
      setBulkEditState(null);
      await fetchPricing();
      setExpandedGroups((prev) => ({ ...prev, [currentGroupKey]: true }));
    } catch (error) {
      console.error("Failed to update sub items", error);
      toast({
        title: "Failed to update sub items",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBulkEdit(false);
    }
  };
  return (
    <div className="min-w-0 p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Pricing</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage pricing in a way that is easy to update and easy to verify.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openAddMainDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Main Item
            </Button>
            <Button variant="outline" onClick={fetchPricing} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search main item, child item, or sheet..."
              className="pl-9"
            />
          </div>
          <select
            value={billSheetFilter}
            onChange={(e) => setBillSheetFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Sheets</option>
            {billSheetOptions.map((sheet) => (
              <option key={sheet} value={sheet}>
                {sheet}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Visible Groups
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {filteredBillGroups.length}
            </div>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Visible Child Items
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {filteredBillGroups.reduce(
                (sum, group) => sum + group.rows.length,
                0,
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Current Sheet Filter
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {billSheetFilter === "all"
                ? "All imported sheets"
                : billSheetFilter}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {`Bill Of Items Groups (${filteredBillGroups.length})`}
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Loading pricing...
            </div>
          ) : filteredBillGroups.length === 0 ? (
            <div className="p-8 text-sm text-gray-500">
              No bill-of-items rows found for the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Main Item
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Sheet
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Model
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Verify Pricing
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Sub Items
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredBillGroups.map((group) => {
                    const isExpanded = !!expandedGroups[group.key];
                    return (
                      <Fragment key={group.key}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-5 py-4 text-sm text-gray-900">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.key)}
                              className="flex items-center gap-2 font-medium"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                              <span>{group.primaryRow.product}</span>
                            </button>
                            {group.primaryRow.description ? (
                              <div className="mt-1 text-xs text-gray-500">
                                {group.primaryRow.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                            {group.primaryRow.source_sheet || "Manual"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                            <Badge variant="outline">
                              {group.primaryRow.pricing_model || "standard"}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                            <div>Once-off: {money(group.primaryRow.price)}</div>
                            <div className="text-xs text-gray-500">
                              Monthly:{" "}
                              {money(
                                numberValue(group.primaryRow.rental) +
                                  numberValue(group.primaryRow.subscription),
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                            <Badge variant="outline">{group.rows.length}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openEditDialog(
                                    "bill_of_items",
                                    group.primaryRow,
                                  )
                                }
                              >
                                <PencilLine className="mr-2 h-4 w-4" />
                                Edit Main
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() =>
                                  handleDeleteMainItem(group.primaryRow)
                                }
                                disabled={deletingRowId === group.primaryRow.id}
                              >
                                {deletingRowId === group.primaryRow.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50">
                            <td colSpan={6} className="px-5 py-4">
                              <div className="mb-4 grid gap-3 md:grid-cols-4">
                                <div className="rounded-lg border bg-white px-4 py-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Main Price
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {money(group.primaryRow.price)}
                                  </div>
                                </div>
                                <div className="rounded-lg border bg-white px-4 py-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Rental + Subs
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {money(
                                      numberValue(group.primaryRow.rental) +
                                        numberValue(
                                          group.primaryRow.subscription,
                                        ),
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg border bg-white px-4 py-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Installation
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {money(group.primaryRow.installation)}
                                  </div>
                                </div>
                                <div className="rounded-lg border bg-white px-4 py-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Child Items
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {group.rows.length}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4 rounded-lg border bg-white p-4">
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                                  <div className="grid gap-2 xl:min-w-[420px] xl:flex-1">
                                    <Label
                                      htmlFor={`add-sub-item-${group.key}`}
                                    >
                                      Add item under this main item
                                    </Label>
                                    <div className="flex flex-col gap-2 md:flex-row">
                                      <select
                                        id={`add-sub-item-${group.key}`}
                                        value={
                                          addChildSelections[group.key] || ""
                                        }
                                        onChange={(e) =>
                                          setAddChildSelections((prev) => ({
                                            ...prev,
                                            [group.key]: e.target.value,
                                          }))
                                        }
                                        className="h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      >
                                        <option value="">
                                          Select product item...
                                        </option>
                                        {productItems.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.product} ({item.category})
                                          </option>
                                        ))}
                                      </select>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleAddChildItem(group)
                                        }
                                        disabled={
                                          addingChildGroupId === group.key
                                        }
                                      >
                                        {addingChildGroupId === group.key ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Plus className="mr-2 h-4 w-4" />
                                        )}
                                        Add Sub Item
                                      </Button>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openBulkEditDialog(group)}
                                    disabled={group.rows.length === 0}
                                  >
                                    <PencilLine className="mr-2 h-4 w-4" />
                                    Edit All Sub Items
                                  </Button>
                                </div>
                              </div>
                              <div className="overflow-x-auto rounded-md border bg-white">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Item
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Description
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Qty
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Once-Off
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Monthly
                                      </th>
                                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {group.rows.map((row) => (
                                      <tr
                                        key={row.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          {row.product}
                                        </td>
                                        <td className="max-w-[260px] px-4 py-3 text-sm text-gray-700">
                                          {row.description || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          {numberValue(row.quantity)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          <div>Price: {money(row.price)}</div>
                                          <div className="text-xs text-gray-500">
                                            Install: {money(row.installation)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Discount: {money(row.discount)}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          <div>Rental: {money(row.rental)}</div>
                                          <div className="text-xs text-gray-500">
                                            Subs: {money(row.subscription)}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                openEditDialog(
                                                  "bill_of_items",
                                                  row,
                                                )
                                              }
                                            >
                                              <PencilLine className="mr-2 h-4 w-4" />
                                              Edit
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                              onClick={() =>
                                                handleDeleteSubItem(row)
                                              }
                                              disabled={
                                                deletingRowId === row.id
                                              }
                                            >
                                              {deletingRowId === row.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              ) : (
                                                <Trash2 className="mr-2 h-4 w-4" />
                                              )}
                                              Delete
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-slate-50 font-medium">
                                      <td
                                        className="px-4 py-3 text-sm text-gray-900"
                                        colSpan={3}
                                      >
                                        Group Totals
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        <div>
                                          Price: {money(group.totals.price)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Install:{" "}
                                          {money(group.totals.installation)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        <div>
                                          Rental: {money(group.totals.rental)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Subs:{" "}
                                          {money(group.totals.subscription)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3" />
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={!!editState}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pricing Row</DialogTitle>
            <DialogDescription>
              Update pricing values for {editState?.row.product || "this item"}{" "}
              and save to verify the totals again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, type: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Product</Label>
              <Input
                id="product"
                value={editForm.product}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, product: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={editForm.quantity}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={editForm.discount}
                onChange={(e) => handleEditDiscountChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rental">Rental</Label>
              <Input
                id="rental"
                type="number"
                step="0.01"
                value={editForm.rental}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, rental: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installation">Installation</Label>
              <Input
                id="installation"
                type="number"
                step="0.01"
                value={editForm.installation}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    installation: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subscription">Subscription</Label>
              <Input
                id="subscription"
                type="number"
                step="0.01"
                value={editForm.subscription}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    subscription: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddMainDialog}
        onOpenChange={(open) => !open && setShowAddMainDialog(false)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Main Item</DialogTitle>
            <DialogDescription>
              Create a new top-level bill-of-items row, then add sub items under
              it from the dropdown.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="main-type">Type</Label>
              <Input
                id="main-type"
                value={mainItemForm.type}
                onChange={(e) =>
                  setMainItemForm((prev) => ({ ...prev, type: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-product">Main Item Name</Label>
              <Input
                id="main-product"
                value={mainItemForm.product}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    product: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="main-description">Description</Label>
              <Input
                id="main-description"
                value={mainItemForm.description}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-category">Category</Label>
              <Input
                id="main-category"
                value={mainItemForm.category}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-source-sheet">Sub Category / Sheet</Label>
              <Input
                id="main-source-sheet"
                value={mainItemForm.source_sheet}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    source_sheet: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-pricing-model">Pricing Model</Label>
              <Input
                id="main-pricing-model"
                value={mainItemForm.pricing_model}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    pricing_model: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-quantity">Quantity</Label>
              <Input
                id="main-quantity"
                type="number"
                step="0.01"
                value={mainItemForm.quantity}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-price">Price</Label>
              <Input
                id="main-price"
                type="number"
                step="0.01"
                value={mainItemForm.price}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    price: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-discount">Discount</Label>
              <Input
                id="main-discount"
                type="number"
                step="0.01"
                value={mainItemForm.discount}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    discount: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-rental">Rental</Label>
              <Input
                id="main-rental"
                type="number"
                step="0.01"
                value={mainItemForm.rental}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    rental: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-installation">Installation</Label>
              <Input
                id="main-installation"
                type="number"
                step="0.01"
                value={mainItemForm.installation}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    installation: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-subscription">Subscription</Label>
              <Input
                id="main-subscription"
                type="number"
                step="0.01"
                value={mainItemForm.subscription}
                onChange={(e) =>
                  setMainItemForm((prev) => ({
                    ...prev,
                    subscription: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddMainDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddMainItem}
              disabled={savingMainItem}
            >
              {savingMainItem ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Main Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!bulkEditState}
        onOpenChange={(open) => !open && setBulkEditState(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit All Sub Items</DialogTitle>
            <DialogDescription>
              Update all sub items for{" "}
              {bulkEditState?.mainItem.product || "this main item"} in one pass,
              then save once.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto py-4">
            <div className="min-w-[980px] overflow-hidden rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Item
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Price
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Discount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Rental
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Install
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Subscription
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {bulkEditState?.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3">
                        <Input
                          value={row.product}
                          onChange={(e) =>
                            updateBulkEditRow(row.id, "product", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "description",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={row.category}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "category",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "quantity",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.price}
                          onChange={(e) =>
                            updateBulkEditRow(row.id, "price", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.discount}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "discount",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.rental}
                          onChange={(e) =>
                            updateBulkEditRow(row.id, "rental", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.installation}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "installation",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.subscription}
                          onChange={(e) =>
                            updateBulkEditRow(
                              row.id,
                              "subscription",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkEditState(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveBulkEdit}
              disabled={savingBulkEdit}
            >
              {savingBulkEdit ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save All Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
