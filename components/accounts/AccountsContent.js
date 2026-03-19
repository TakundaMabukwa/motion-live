"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  Download,
  AlertTriangle,
  Car,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Wrench,
  Receipt,
  DollarSign,
  FileText,
  Settings,
  CreditCard,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OverdueAccountsWidget } from "@/components/overdue/OverdueAccountsWidget";
import InternalAccountDashboard from "./InternalAccountDashboard";
import AccountDashboard from "@/components/accounts/AccountDashboard";
import OrdersContent from "./OrdersContent";
import PurchasesContent from "./PurchasesContent";
import AccountsClientsSection from "./AccountsClientsSection";

export default function AccountsContent({ activeSection }) {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [paymentData, setPaymentData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountVehicles, setAccountVehicles] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [completedJobsLoading, setCompletedJobsLoading] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [showFinancialDetails, setShowFinancialDetails] = useState(false);
  const [selectedFinancialAccount, setSelectedFinancialAccount] =
    useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    paymentTerms: "30 days",
    dueDate: "",
    notes: "",
  });
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState({});

  // Overdue section state
  const [refreshKey, setRefreshKey] = useState(0);

  // Payment totals state
  const [paymentTotals, setPaymentTotals] = useState(null);
  const [paymentTotalsLoading, setPaymentTotalsLoading] = useState(false);

  const router = useRouter();
  const VAT_RATE = 0.15;
  const BILLING_STATUS_KEYS = ["invoice"];

  // Check if payment is due (after 21st of month)
  const isPaymentDue = () => {
    const today = new Date();
    const currentDay = today.getDate();
    return currentDay >= 21;
  };

  // Get appropriate label for monthly amounts
  const getMonthlyLabel = () => {
    return isPaymentDue() ? "Amount Due" : "Monthly Amount";
  };

  // Fetch payment totals for all payment records
  const fetchPaymentTotals = useCallback(async () => {
    try {
      setPaymentTotalsLoading(true);

      console.log("Fetching payment totals for all records...");

      const response = await fetch("/api/payments/totals");

      if (!response.ok) {
        throw new Error("Failed to fetch payment totals");
      }

      const data = await response.json();
      console.log("Payment totals API response:", data);
      setPaymentTotals(data.totals);
    } catch (error) {
      console.error("Error fetching payment totals:", error);
      // Set default values on error
      setPaymentTotals({
        totalDueAmount: 0,
        totalPaidAmount: 0,
        totalBalanceDue: 0,
        totalOverdueAmount: 0,
        totalAccounts: 0,
      });
    } finally {
      setPaymentTotalsLoading(false);
    }
  }, []);

  // Fetch customers data from customers_grouped table
  const fetchCustomers = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const currentPage = loadMore ? page + 1 : 1;
        const response = await fetch(
          `/api/accounts/customers-grouped?page=${currentPage}&limit=50&search=${searchTerm}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }

        const data = await response.json();

        if (loadMore) {
          setCustomers((prev) => [...prev, ...data.companyGroups]);
          setPaymentData({ ...paymentData, ...data.paymentData });
          setPage(currentPage);
          setHasMore(data.companyGroups.length === 50);
        } else {
          setCustomers(data.companyGroups);
          setAllCustomers(data.companyGroups);
          setPaymentData(data.paymentData || {});
          setPage(1);
          setHasMore(data.companyGroups.length === 50);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Failed to load customers");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchTerm, page],
  );

  // Initial data fetch
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch payment totals when component loads
  useEffect(() => {
    fetchPaymentTotals();
  }, [fetchPaymentTotals]);

  // Real-time search filtering
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setCustomers(allCustomers);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = allCustomers.filter((customer) => {
        const legalNamesLower = (customer.legal_names || "").toLowerCase();
        const companyGroupLower = (customer.company_group || "").toLowerCase();
        const accountNumbersLower = (
          customer.all_account_numbers || ""
        ).toLowerCase();

        return (
          legalNamesLower.includes(searchLower) ||
          companyGroupLower.includes(searchLower) ||
          accountNumbersLower.includes(searchLower)
        );
      });
      setCustomers(filtered);
    }
  }, [searchTerm, allCustomers]);

  // Check for account parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accountParam = urlParams.get("account");

    if (accountParam) {
      console.log("Account parameter found:", accountParam);
      fetchAccountData(accountParam);
    }
  }, []);

  // Fetch completed jobs when section changes
  useEffect(() => {
    if (activeSection === "completed-jobs") {
      fetchCompletedJobs();
    }
  }, [activeSection]);

  const fetchCompletedJobs = async () => {
    try {
      setCompletedJobsLoading(true);

      const response = await fetch("/api/accounts/completed-jobs");

      if (!response.ok) {
        throw new Error("Failed to fetch completed jobs");
      }

      const data = await response.json();
      setCompletedJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching completed jobs:", error);
      toast.error("Failed to load completed jobs");
    } finally {
      setCompletedJobsLoading(false);
    }
  };

  const handleInvoiceClient = async (job) => {
    setSelectedJobForInvoice(job);
    // Pre-fill form with available job data
    setInvoiceFormData({
      clientName: job.customer_name || "",
      clientEmail: job.customer_email || "",
      clientPhone: job.customer_phone || "",
      clientAddress: job.customer_address || "",
      paymentTerms: "30 days",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days from now
      notes: "",
    });
    setShowInvoiceModal(true);
  };

  const handleViewJobDetails = (job) => {
    setSelectedJobDetails(job);
    setShowJobDetailsModal(true);
  };

  const generateInvoice = async () => {
    if (!selectedJobForInvoice) return;

    setIsGeneratingInvoice(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const invoiceData = {
        invoiceNumber: `INV-${Date.now()}`,
        jobNumber: selectedJobForInvoice.job_number,
        clientInfo: invoiceFormData,
        jobDetails: selectedJobForInvoice,
        generatedAt: new Date().toISOString(),
        pdfUrl: `#invoice-${Date.now()}`, // Placeholder for actual PDF URL
      };

      setGeneratedInvoice(invoiceData);
      const equipmentResponse = await fetch(
        "/api/vehicles/sync-job-equipment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job: selectedJobForInvoice,
          }),
        },
      );

      if (!equipmentResponse.ok) {
        const equipmentError = await equipmentResponse.json().catch(() => ({}));
        throw new Error(
          equipmentError?.details ||
            equipmentError?.error ||
            "Failed to update vehicle equipment",
        );
      }

      const equipmentResult = await equipmentResponse.json();

      if (selectedJobForInvoice?.new_account_number) {
        const products = parseQuotationProducts(
          selectedJobForInvoice.quotation_products,
        );
        if (products.length > 0) {
          const billingResponse = await fetch(
            "/api/vehicles/apply-quote-billing",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cost_code: selectedJobForInvoice.new_account_number,
                quotation_products: products,
                vehicle_registration:
                  selectedJobForInvoice.vehicle_registration,
                vehicle_make: selectedJobForInvoice.vehicle_make,
                vehicle_model: selectedJobForInvoice.vehicle_model,
                vehicle_year: selectedJobForInvoice.vehicle_year,
                customer_name: selectedJobForInvoice.customer_name,
              }),
            },
          );

          if (!billingResponse.ok) {
            const billingError = await billingResponse.json().catch(() => ({}));
            throw new Error(
              billingError?.details ||
                billingError?.error ||
                "Failed to apply quotation billing",
            );
          }
        }
      }

      await updateBillingStatus(selectedJobForInvoice, "invoice");
      if (equipmentResult?.warnings?.length) {
        toast.success(
          `Invoice generated. Vehicle equipment updated with ${equipmentResult.warnings.length} warning(s).`,
        );
      } else {
        toast.success("Invoice generated successfully!");
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(error?.message || "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!generatedInvoice || !invoiceFormData.clientEmail) {
      toast.error("Please provide client email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const totals = getInvoiceTotals(selectedJobForInvoice);
      const items =
        totals.products.length > 0
          ? totals.products.map((product) => {
              const qty = Math.max(1, toNumber(product?.quantity) || 1);
              const unitPrice = getProductUnitPrice(product);
              return {
                description: product?.description || product?.name || "Item",
                quantity: qty,
                unitPrice,
                total: unitPrice * qty,
                vehicleRegistration:
                  selectedJobForInvoice.vehicle_registration || "N/A",
              };
            })
          : [
              {
                description: `${selectedJobForInvoice.job_type || "Service"} - ${selectedJobForInvoice.job_description || "Job completion"}`,
                quantity: 1,
                unitPrice: totals.subtotal,
                total: totals.subtotal,
                vehicleRegistration:
                  selectedJobForInvoice.vehicle_registration || "N/A",
              },
            ];

      // Prepare invoice data for email
      const invoiceEmailData = {
        invoiceNumber: generatedInvoice.invoiceNumber,
        clientName: invoiceFormData.clientName,
        clientEmail: invoiceFormData.clientEmail,
        clientPhone: invoiceFormData.clientPhone,
        clientAddress: invoiceFormData.clientAddress,
        invoiceDate: generatedInvoice.generatedAt,
        dueDate: invoiceFormData.dueDate,
        totalAmount: totals.total,
        vatAmount: totals.vat,
        subtotal: totals.subtotal,
        items,
        paymentTerms: invoiceFormData.paymentTerms,
        notes: invoiceFormData.notes,
      };

      // Send email via API
      const response = await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceEmailData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Invoice sent successfully to ${invoiceFormData.clientEmail}`,
        );
        setShowInvoiceModal(false);
        setGeneratedInvoice(null);
        setSelectedJobForInvoice(null);
        setInvoiceFormData({
          clientName: "",
          clientEmail: "",
          clientPhone: "",
          clientAddress: "",
          paymentTerms: "30 days",
          dueDate: "",
          notes: "",
        });
      } else {
        throw new Error(result.error || "Failed to send invoice email");
      }
    } catch (error) {
      console.error("Error sending invoice email:", error);
      toast.error(`Failed to send invoice email: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      paymentTerms: "30 days",
      dueDate: "",
      notes: "",
    });
    setGeneratedInvoice(null);
    setSelectedJobForInvoice(null);
  };

  const fetchAccountData = async (accountNumber) => {
    try {
      setAccountLoading(true);
      console.log("Fetching account data for:", accountNumber);

      const response = await fetch(
        `/api/vehicle-invoices/account/${encodeURIComponent(accountNumber)}`,
      );
      console.log("API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("API response data:", data);

        if (data.success) {
          const accountData = {
            company: data.company,
            accountNumber: data.accountNumber,
            totalMonthlyAmount: data.summary.totalMonthlyAmount,
            totalOverdue: data.summary.totalOverdueAmount,
            vehicleCount: data.summary.totalVehicles,
          };
          console.log("Setting selected account:", accountData);
          setSelectedAccount(accountData);
          setAccountVehicles(data.vehicles || []);
        } else {
          console.error("API returned success: false:", data);
        }
      } else {
        console.error("API request failed with status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCustomers();
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCustomers(true);
    }
  };

  const handleCompanyGroupClick = (companyGroup) => {
    console.log("Clicking on company group:", companyGroup);
    // For now, just show a toast since we don't have individual account details
    toast.success(`Selected company group: ${companyGroup}`);
  };

  const handleShowFinancialDetails = (customer) => {
    setSelectedFinancialAccount(customer);
    setShowFinancialDetails(true);
  };

  const handleViewClients = (customer) => {
    console.log("handleViewClients called with:", customer);
    // Navigate to the new client cost centers page using company_group
    const url = `/protected/client-cost-centers/${customer.company_group}`;
    console.log("Redirecting to:", url);
    window.location.href = url;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "R 0.00";
    }

    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      return "R 0.00";
    }

    // Use consistent formatting to avoid hydration errors
    return `R ${numAmount.toFixed(2)}`;
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const toNumber = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const parseQuotationProducts = (products) => {
    if (!products) return [];
    if (Array.isArray(products)) return products;
    if (typeof products === "string") {
      try {
        const parsed = JSON.parse(products);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const getProductUnitPrice = (product) => {
    const qty = Math.max(1, toNumber(product?.quantity) || 1);
    const directUnitPrice = [
      product?.unit_price,
      product?.subscription_price,
      product?.cash_price,
      product?.rental_price,
      product?.installation_price,
      product?.de_installation_price,
      product?.price,
    ]
      .map(toNumber)
      .find((price) => price > 0);

    if (directUnitPrice) return directUnitPrice;

    const totalPrice =
      toNumber(product?.total_price) ||
      toNumber(product?.subscription_gross) ||
      toNumber(product?.cash_gross) ||
      toNumber(product?.rental_gross) ||
      toNumber(product?.installation_gross) ||
      toNumber(product?.de_installation_gross);

    if (totalPrice > 0) {
      return totalPrice / qty;
    }

    return 0;
  };

  const getJobTotal = (job) => {
    return (
      toNumber(job?.quotation_total_amount) ||
      toNumber(job?.actual_cost) ||
      toNumber(job?.estimated_cost) ||
      0
    );
  };

  const getBillingStatusValue = (job, key) => {
    const raw = job?.billing_statuses?.[key];
    if (raw === true) return true;
    if (raw && typeof raw === "object" && raw.done === true) return true;
    return false;
  };

  const updateBillingStatus = async (job, key = "invoice") => {
    if (!job?.id || !BILLING_STATUS_KEYS.includes(key)) return;
    const loadingKey = `${job.id}:${key}`;
    setBillingActionLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const currentStatuses =
        job?.billing_statuses && typeof job.billing_statuses === "object"
          ? job.billing_statuses
          : {};

      const nextStatuses = {
        ...currentStatuses,
        [key]: {
          done: true,
          at: new Date().toISOString(),
        },
      };

      const shouldMarkInvoiced = key === "invoice";
      const patchPayload = {
        billing_statuses: nextStatuses,
        ...(shouldMarkInvoiced
          ? {
              job_status: "Invoiced",
              status: "completed",
            }
          : {}),
      };

      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to update billing status");
      }

      const updated = await response.json();
      setCompletedJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                billing_statuses: updated.billing_statuses,
                job_status: updated.job_status ?? item.job_status,
                status: updated.status ?? item.status,
              }
            : item,
        ),
      );
      setSelectedJobDetails((prev) =>
        prev?.id === job.id
          ? {
              ...prev,
              billing_statuses: updated.billing_statuses,
              job_status: updated.job_status ?? prev.job_status,
              status: updated.status ?? prev.status,
            }
          : prev,
      );
      toast.success(
        `${key.charAt(0).toUpperCase() + key.slice(1)} marked as done`,
      );
    } catch (error) {
      console.error("Error updating billing status:", error);
      toast.error(`Failed to update ${key} status`);
    } finally {
      setBillingActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const openInvoicePdf = (mode = "view") => {
    const preview = document.getElementById("invoice-preview");
    if (!preview) {
      toast.error("Invoice preview not available");
      return;
    }

    const invoiceHtml = preview.outerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to view the invoice.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              margin: 24px;
              color: #111827;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            img { max-width: 120px; height: auto; }
            .border { border: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .rounded-lg { border-radius: 12px; }
            .p-4 { padding: 16px; }
            .pt-2 { padding-top: 8px; }
            .pt-4 { padding-top: 16px; }
            .mt-4 { margin-top: 16px; }
            .w-full { width: 100%; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .gap-4 { gap: 16px; }
            .grid { display: grid; gap: 16px; }
            .grid-cols-1 { grid-template-columns: 1fr; }
            .space-y-2 > * + * { margin-top: 8px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .text-right { text-align: right; }
            .text-sm { font-size: 13px; }
            .text-xs { font-size: 12px; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .bg-white { background: #ffffff; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
            th { font-weight: 600; color: #6b7280; }
            @media (min-width: 768px) {
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
              .md\\:flex-row { flex-direction: row; }
              .md\\:items-start { align-items: flex-start; }
              .md\\:justify-between { justify-content: space-between; }
            }
            @media print {
              body { margin: 12mm; }
            }
          </style>
        </head>
        <body>${invoiceHtml}</body>
      </html>
    `);
    printWindow.document.close();

    if (mode === "download") {
      printWindow.focus();
      printWindow.print();
    }
  };

  const getInvoiceVehicles = (job) => {
    const jobType = (
      job?.job_type ||
      job?.quotation_job_type ||
      ""
    ).toLowerCase();
    const products = parseQuotationProducts(job?.quotation_products);

    if (
      jobType.includes("deinstall") ||
      jobType.includes("de-install") ||
      jobType.includes("decomm")
    ) {
      const plates = products
        .map((product) => product?.vehicle_plate)
        .filter(
          (plate) => typeof plate === "string" && plate.trim().length > 0,
        );
      return Array.from(new Set(plates));
    }

    const reg = job?.vehicle_registration?.trim();
    if (!reg) return [];
    const make = (job?.vehicle_make || "").trim();
    const model = (job?.vehicle_model || "").trim();
    const descriptor = [reg, make, model].filter(Boolean).join(" ");
    return [descriptor];
  };

  const getInvoiceVehiclePayloads = (job) => {
    const jobType = (
      job?.job_type ||
      job?.quotation_job_type ||
      ""
    ).toLowerCase();
    const products = parseQuotationProducts(job?.quotation_products);

    if (
      jobType.includes("deinstall") ||
      jobType.includes("de-install") ||
      jobType.includes("decomm")
    ) {
      const plates = products
        .map((product) => product?.vehicle_plate)
        .filter(
          (plate) => typeof plate === "string" && plate.trim().length > 0,
        );
      return Array.from(new Set(plates)).map((plate) => ({
        reg: plate.trim(),
        company: job?.customer_name || null,
      }));
    }

    const reg = job?.vehicle_registration?.trim();
    if (!reg) return [];
    return [
      {
        reg,
        make: job?.vehicle_make || null,
        model: job?.vehicle_model || null,
        year: job?.vehicle_year || null,
        company: job?.customer_name || null,
      },
    ];
  };

  const getInvoiceTotals = (job) => {
    const products = parseQuotationProducts(job?.quotation_products);
    const computedSubtotal = products.reduce((sum, product) => {
      const qty = Math.max(1, toNumber(product?.quantity) || 1);
      const unitPrice = getProductUnitPrice(product);
      return sum + unitPrice * qty;
    }, 0);

    const subtotal = toNumber(job?.quotation_subtotal) || computedSubtotal;
    const vat = toNumber(job?.quotation_vat_amount) || subtotal * VAT_RATE;
    const total = toNumber(job?.quotation_total_amount) || subtotal + vat;

    return { products, subtotal, vat, total };
  };

  const formatBilledItems = (job) => {
    const products = parseQuotationProducts(job?.quotation_products);
    if (!products.length) return "No billed items";
    const labels = products.map((product) => {
      const qty = Math.max(1, toNumber(product?.quantity) || 1);
      const name = product?.name || product?.item_code || "Item";
      return `${name} x${qty}`;
    });
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
  };

  const getOverdueStatus = (totalOverdue) => {
    if (totalOverdue === 0) return "current";
    if (totalOverdue < 1000) return "low";
    if (totalOverdue < 5000) return "medium";
    return "high";
  };

  const getOverdueColor = (status) => {
    switch (status) {
      case "current":
        return "bg-green-100 text-green-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Dashboard Section
  if (activeSection === "dashboard") {
    console.log("Dashboard section active, selectedAccount:", selectedAccount);
    console.log("Customers data:", customers);

    if (selectedAccount) {
      console.log(
        "Showing internal dashboard for account:",
        selectedAccount.accountNumber,
      );
      return (
        <InternalAccountDashboard
          accountNumber={selectedAccount.accountNumber}
          onBack={() => {
            console.log("Going back to accounts");
            setSelectedAccount(null);
            setAccountVehicles([]);
          }}
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Company Groups Overview
            </h1>
            <p className="text-gray-600">
              All company groups from customers_grouped table
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Company Groups
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customers.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active company groups
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Monthly
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  customers.reduce((sum, customer) => {
                    const paymentInfo = paymentData[customer.id];
                    return sum + (paymentInfo?.totalDue || 0);
                  }, 0),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Full monthly amounts due
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount Due
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  customers.reduce((sum, customer) => {
                    const paymentInfo = paymentData[customer.id];
                    return sum + (paymentInfo?.totalBalance || 0);
                  }, 0),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding amounts
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vehicles
              </CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {customers.reduce((sum, c) => sum + (c.vehicleCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Fleet size</p>
            </CardContent>
          </Card>

          {/* Total Due Amount Card */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Due Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {paymentTotalsLoading
                  ? "..."
                  : formatCurrency(paymentTotals?.totalDueAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Sum of all due_amount columns
              </p>
            </CardContent>
          </Card>

          {/* Total Paid Amount Card */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Paid Amount
              </CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {paymentTotalsLoading
                  ? "..."
                  : formatCurrency(paymentTotals?.totalPaidAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Sum of all paid_amount columns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Company Groups Table */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">All Company Groups</CardTitle>
                <p className="text-sm text-gray-600">
                  Click on any company group to view detailed information
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search company groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button
                  onClick={() => fetchCustomers()}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
                <span>Loading company groups...</span>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-8 text-muted-foreground text-center">
                <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <p className="font-medium text-lg">No company groups found</p>
                <p>No company groups match your search criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customers.map((customer, index) => {
                  const paymentInfo = paymentData[customer.id] || {};
                  const totalDue = paymentInfo.totalDue || 0;
                  const totalBalance = paymentInfo.totalBalance || 0;

                  return (
                    <div
                      key={customer.id || index}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        handleCompanyGroupClick(customer.company_group)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {customer.company_group || "Unknown Company"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Legal Names: {customer.legal_names || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.vehicleCount || 0} vehicles •{" "}
                            {customer.uniqueClientCount || 0} clients
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">
                            {formatCurrency(totalDue)}
                          </div>
                          <p className="text-xs text-gray-500">Monthly</p>
                          <div className="text-sm font-medium text-orange-600">
                            {formatCurrency(totalBalance)}
                          </div>
                          <p className="text-xs text-gray-500">Amount Due</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => fetchCustomers(true)}
                  variant="outline"
                  disabled={loadingMore}
                  className="px-8"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Company Groups"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Clients Section
  if (activeSection === "clients") {
    return <AccountsClientsSection />;
  }

  if (activeSection === "purchases") {
    console.log("Rendering purchases section");
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Purchase History</h2>
        <PurchasesContent />
      </div>
    );
  }

  if (activeSection === "job-cards") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Job Cards</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Job Card Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Job card management functionality coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === "orders") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Pending Stock Orders
        </h2>
        <OrdersContent />
      </div>
    );
  }

  if (activeSection === "completed-jobs") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Completed Job Cards
          </h2>
          <Button
            onClick={fetchCompletedJobs}
            variant="outline"
            size="sm"
            disabled={completedJobsLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {completedJobsLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {completedJobsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
            <span className="ml-2">Loading completed jobs...</span>
          </div>
        ) : completedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                No Completed Jobs
              </p>
              <p className="text-gray-600">No completed job cards found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">
                Completed Jobs Table
              </CardTitle>
              <p className="text-sm text-gray-600">
                Quick scan view for billing and finance follow-up.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-3 text-xs">
                      Job Number
                    </TableHead>
                    <TableHead className="h-10 px-3 text-xs">
                      Customer
                    </TableHead>
                    <TableHead className="h-10 px-3 text-xs">Vehicle</TableHead>
                    <TableHead className="h-10 px-3 text-xs">
                      Billed Items
                    </TableHead>
                    <TableHead className="h-10 px-3 text-xs text-right">
                      Total
                    </TableHead>
                    <TableHead className="h-10 px-3 text-xs text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedJobs.map((job) => (
                    <TableRow key={job.id} className="h-12">
                      <TableCell className="py-2 px-3 font-semibold text-gray-900">
                        <div className="text-sm">{job.job_number}</div>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-gray-700">
                        <div className="text-sm font-medium">
                          {job.customer_name || "Unknown Customer"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.customer_email || "No email"}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="text-sm font-medium">
                          {job.vehicle_registration || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.vehicle_make || "Unknown"}{" "}
                          {job.vehicle_model || ""}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-gray-700">
                        <div className="text-sm">{formatBilledItems(job)}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(
                            job.completion_date ||
                              job.end_time ||
                              job.updated_at,
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(getJobTotal(job))}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            onClick={() => handleInvoiceClient(job)}
                            size="sm"
                            className={`bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs ${getBillingStatusValue(job, "invoice") ? "opacity-70 cursor-not-allowed" : ""}`}
                            disabled={getBillingStatusValue(job, "invoice")}
                          >
                            {getBillingStatusValue(job, "invoice")
                              ? "Invoiced"
                              : "Invoice"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Job Details Modal */}
        <Dialog
          open={showJobDetailsModal}
          onOpenChange={setShowJobDetailsModal}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Job Details - {selectedJobDetails?.job_number}
              </DialogTitle>
            </DialogHeader>

            {selectedJobDetails && (
              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Basic Job Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Job Number:
                      </span>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedJobDetails.job_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Status:
                      </span>
                      {(() => {
                        const isInvoiced = getBillingStatusValue(
                          selectedJobDetails,
                          "invoice",
                        );
                        const statusLabel = isInvoiced
                          ? "Invoiced"
                          : selectedJobDetails.job_status ||
                            selectedJobDetails.status ||
                            "Completed";
                        const statusClass = isInvoiced
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800";
                        return (
                          <Badge variant="default" className={statusClass}>
                            {statusLabel}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Customer:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.customer_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Vehicle Registration:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.vehicle_registration || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Technician:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.technician_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Job Type:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.job_type || "Repair"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Timeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Start Date:
                      </span>
                      <p className="font-medium text-gray-900">
                        {formatDate(
                          selectedJobDetails.start_time ||
                            selectedJobDetails.job_date,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        End Date:
                      </span>
                      <p className="font-medium text-gray-900">
                        {formatDate(
                          selectedJobDetails.end_time ||
                            selectedJobDetails.completion_date,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Duration:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.start_time &&
                        selectedJobDetails.end_time
                          ? `${Math.max(1, Math.ceil((new Date(selectedJobDetails.end_time) - new Date(selectedJobDetails.start_time)) / (1000 * 60 * 60 * 24)))} days`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Financial Snapshot
                  </h3>
                  {(() => {
                    const totals = getInvoiceTotals(selectedJobDetails);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Quote Number:
                          </span>
                          <p className="font-semibold text-gray-900">
                            {selectedJobDetails.quotation_number || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Quote Status:
                          </span>
                          <p className="font-semibold text-gray-900 capitalize">
                            {selectedJobDetails.quote_status || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Purchase Type:
                          </span>
                          <p className="font-semibold text-gray-900 capitalize">
                            {selectedJobDetails.purchase_type || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Quote Date:
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatDate(selectedJobDetails.quote_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Quote Expiry:
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatDate(selectedJobDetails.quote_expiry_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Account Number:
                          </span>
                          <p className="font-medium text-gray-900">
                            {selectedJobDetails.new_account_number || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Subtotal (Excl. VAT):
                          </span>
                          <p className="font-semibold text-gray-900 text-lg">
                            {formatCurrency(totals.subtotal)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            VAT (15%):
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(totals.vat)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Total (Incl. VAT):
                          </span>
                          <p className="font-semibold text-green-700 text-lg">
                            {formatCurrency(totals.total)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Estimated Cost:
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(selectedJobDetails.estimated_cost)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Actual Cost:
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(selectedJobDetails.actual_cost)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Annuity End Date:
                          </span>
                          <p className="font-medium text-gray-900">
                            {formatDate(selectedJobDetails.annuity_end_date)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Billing Items */}
                <div className="bg-white border p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Billing Items
                  </h3>
                  {(() => {
                    const totals = getInvoiceTotals(selectedJobDetails);
                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">
                              Unit Price
                            </TableHead>
                            <TableHead className="text-right">
                              Total Excl.
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {totals.products.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-sm text-gray-500"
                              >
                                No quotation products found for this job.
                              </TableCell>
                            </TableRow>
                          ) : (
                            totals.products.map((product, index) => {
                              const qty = Math.max(
                                1,
                                toNumber(product?.quantity) || 1,
                              );
                              const unitPrice = getProductUnitPrice(product);
                              const lineSubtotal = unitPrice * qty;
                              return (
                                <TableRow
                                  key={`${product?.id || product?.name || "item"}-${index}`}
                                >
                                  <TableCell className="font-medium">
                                    {product?.name ||
                                      product?.item_code ||
                                      "Item"}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {product?.description ||
                                      product?.category ||
                                      "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {qty}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(lineSubtotal)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </div>

                {/* Job Description & Notes */}
                {(selectedJobDetails.description ||
                  selectedJobDetails.notes) && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-yellow-600" />
                      Job Details
                    </h3>
                    <div className="space-y-4">
                      {selectedJobDetails.description && (
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Description:
                          </span>
                          <p className="text-gray-900 mt-1 p-3 bg-white rounded border">
                            {selectedJobDetails.description}
                          </p>
                        </div>
                      )}
                      {selectedJobDetails.notes && (
                        <div>
                          <span className="text-gray-500 text-sm font-medium">
                            Notes:
                          </span>
                          <p className="text-gray-900 mt-1 p-3 bg-white rounded border">
                            {selectedJobDetails.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Parts Used */}
                {selectedJobDetails.parts_used &&
                  selectedJobDetails.parts_used.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                        Parts Used
                      </h3>
                      <div className="space-y-2">
                        {selectedJobDetails.parts_used.map((part, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-white rounded border"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {part.name}
                              </span>
                              {part.part_number && (
                                <p className="text-sm text-gray-500">
                                  Part #: {part.part_number}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-gray-600">
                                Qty: {part.quantity}
                              </span>
                              {part.unit_price && (
                                <p className="text-sm font-medium text-gray-900">
                                  R {parseFloat(part.unit_price).toFixed(2)}{" "}
                                  each
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Additional Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Priority Level:
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {selectedJobDetails.priority || "Normal"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Warranty:
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {selectedJobDetails.warranty ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Created By:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.created_by || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm font-medium">
                        Last Updated:
                      </span>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.updated_at
                          ? new Date(
                              selectedJobDetails.updated_at,
                            ).toLocaleDateString("en-GB")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowJobDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() =>
                  selectedJobDetails && handleInvoiceClient(selectedJobDetails)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Invoice Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Modal */}
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Generate Invoice - {selectedJobForInvoice?.job_number}
              </DialogTitle>
            </DialogHeader>

            {selectedJobForInvoice && (
              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Job Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Job Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Job Number:</span>
                      <p className="font-medium">
                        {selectedJobForInvoice.job_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <p className="font-medium">
                        {selectedJobForInvoice.vehicle_registration || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Cost:</span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(getJobTotal(selectedJobForInvoice))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Information Form */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="client-name"
                        className="text-sm font-medium text-gray-700"
                      >
                        Client Name *
                      </Label>
                      <Input
                        id="client-name"
                        value={invoiceFormData.clientName}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            clientName: e.target.value,
                          }))
                        }
                        placeholder="Enter client name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="client-email"
                        className="text-sm font-medium text-gray-700"
                      >
                        Email Address *
                      </Label>
                      <Input
                        id="client-email"
                        type="email"
                        value={invoiceFormData.clientEmail}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            clientEmail: e.target.value,
                          }))
                        }
                        placeholder="client@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="client-phone"
                        className="text-sm font-medium text-gray-700"
                      >
                        Phone Number
                      </Label>
                      <Input
                        id="client-phone"
                        value={invoiceFormData.clientPhone}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            clientPhone: e.target.value,
                          }))
                        }
                        placeholder="+27 12 345 6789"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="payment-terms"
                        className="text-sm font-medium text-gray-700"
                      >
                        Payment Terms
                      </Label>
                      <select
                        id="payment-terms"
                        value={invoiceFormData.paymentTerms}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            paymentTerms: e.target.value,
                          }))
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="7 days">7 days</option>
                        <option value="14 days">14 days</option>
                        <option value="30 days">30 days</option>
                        <option value="60 days">60 days</option>
                        <option value="90 days">90 days</option>
                      </select>
                    </div>
                    <div>
                      <Label
                        htmlFor="due-date"
                        className="text-sm font-medium text-gray-700"
                      >
                        Due Date
                      </Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={invoiceFormData.dueDate}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label
                        htmlFor="client-address"
                        className="text-sm font-medium text-gray-700"
                      >
                        Client Address
                      </Label>
                      <textarea
                        id="client-address"
                        value={invoiceFormData.clientAddress}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            clientAddress: e.target.value,
                          }))
                        }
                        placeholder="Enter full client address"
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label
                        htmlFor="invoice-notes"
                        className="text-sm font-medium text-gray-700"
                      >
                        Invoice Notes
                      </Label>
                      <textarea
                        id="invoice-notes"
                        value={invoiceFormData.notes}
                        onChange={(e) =>
                          setInvoiceFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Additional notes for the invoice..."
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Invoice Preview */}
                {(() => {
                  const totals = getInvoiceTotals(selectedJobForInvoice);
                  const invoiceVehicles = getInvoiceVehicles(
                    selectedJobForInvoice,
                  );
                  const vehicleSummary =
                    invoiceVehicles.length > 0
                      ? invoiceVehicles.join(", ")
                      : "N/A";
                  const invoiceNumber =
                    selectedJobForInvoice.quotation_number ||
                    generatedInvoice?.invoiceNumber ||
                    "INV-PENDING";
                  const invoiceDate =
                    generatedInvoice?.generatedAt || new Date().toISOString();
                  return (
                    <div
                      id="invoice-preview"
                      className="bg-white border rounded-lg"
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
                            <p className="text-xs text-gray-500">
                              VAT No: 4580161802
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">
                          <p className="font-semibold text-gray-900">
                            Tax Invoice
                          </p>
                          <p>
                            Invoice:{" "}
                            <span className="font-medium">{invoiceNumber}</span>
                          </p>
                          <p>
                            Date:{" "}
                            <span className="font-medium">
                              {formatDate(invoiceDate)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Bill To
                          </p>
                          <p className="font-semibold text-gray-900">
                            {selectedJobForInvoice.customer_name || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedJobForInvoice.customer_address ||
                              "No address provided"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedJobForInvoice.customer_email ||
                              "No email provided"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedJobForInvoice.customer_phone ||
                              "No phone provided"}
                          </p>
                        </div>
                        <div className="text-sm text-gray-700">
                          <p>
                            <span className="text-gray-500">Account:</span>{" "}
                            {selectedJobForInvoice.new_account_number || "N/A"}
                          </p>
                          <p>
                            <span className="text-gray-500">Vehicle(s):</span>{" "}
                            {vehicleSummary}
                          </p>
                          <p>
                            <span className="text-gray-500">Job Type:</span>{" "}
                            {selectedJobForInvoice.job_type || "N/A"}
                          </p>
                          <p>
                            <span className="text-gray-500">Technician:</span>{" "}
                            {selectedJobForInvoice.technician_name || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Vehicle</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">
                                Unit Price
                              </TableHead>
                              <TableHead className="text-right">
                                VAT %
                              </TableHead>
                              <TableHead className="text-right">VAT</TableHead>
                              <TableHead className="text-right">
                                Total Incl.
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {totals.products.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  className="text-center text-sm text-gray-500"
                                >
                                  No quotation products found for this job.
                                </TableCell>
                              </TableRow>
                            ) : (
                              totals.products.map((product, index) => {
                                const qty = Math.max(
                                  1,
                                  toNumber(product?.quantity) || 1,
                                );
                                const unitPrice = getProductUnitPrice(product);
                                const lineSubtotal = unitPrice * qty;
                                const lineVat = lineSubtotal * VAT_RATE;
                                const lineTotal = lineSubtotal + lineVat;
                                const vehicleLabel =
                                  product?.vehicle_plate || vehicleSummary;
                                return (
                                  <TableRow
                                    key={`${product?.id || product?.name || "item"}-${index}`}
                                  >
                                    <TableCell className="font-medium">
                                      {product?.name ||
                                        product?.item_code ||
                                        "Item"}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {product?.description ||
                                        product?.category ||
                                        "—"}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {vehicleLabel || "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {qty}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(unitPrice)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      15%
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(lineVat)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatCurrency(lineTotal)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="border-t p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-sm text-gray-600">
                          <p className="font-semibold text-gray-900">Notes</p>
                          <p>
                            {selectedJobForInvoice.special_instructions ||
                              "No special instructions."}
                          </p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">
                              Total Excl. VAT
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(totals.subtotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">VAT (15%)</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(totals.vat)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-2">
                            <span className="font-semibold text-gray-900">
                              Total Incl. VAT
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(totals.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Generated Invoice Preview */}
                {generatedInvoice && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      Invoice Generated Successfully!
                    </h3>
                    <div className="bg-white p-4 rounded border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Invoice Number:</span>
                          <p className="font-medium">
                            {generatedInvoice.invoiceNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Generated:</span>
                          <p className="font-medium">
                            {new Date(
                              generatedInvoice.generatedAt,
                            ).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Client:</span>
                          <p className="font-medium">
                            {generatedInvoice.clientInfo.clientName}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <p className="font-medium">
                            {generatedInvoice.clientInfo.clientEmail}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600 mb-2">
                          Invoice Summary:
                        </p>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm">
                            <strong>Job:</strong> {generatedInvoice.jobNumber} |
                            <strong> Amount:</strong>{" "}
                            {formatCurrency(getJobTotal(selectedJobForInvoice))}{" "}
                            |<strong> Due:</strong>{" "}
                            {generatedInvoice.clientInfo.dueDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  {!generatedInvoice ? (
                    <Button
                      onClick={generateInvoice}
                      disabled={
                        !invoiceFormData.clientName ||
                        !invoiceFormData.clientEmail ||
                        isGeneratingInvoice
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isGeneratingInvoice ? (
                        <>
                          <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                          Generating Invoice...
                        </>
                      ) : (
                        <>Generate Invoice PDF</>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => openInvoicePdf("view")}
                        variant="outline"
                        className="flex-1"
                      >
                        View Invoice PDF
                      </Button>
                      <Button
                        onClick={() => openInvoicePdf("download")}
                        variant="outline"
                        className="flex-1"
                      >
                        Download PDF
                      </Button>
                      <Button
                        onClick={sendInvoiceEmail}
                        disabled={
                          !invoiceFormData.clientEmail || isSendingEmail
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isSendingEmail ? (
                          <>
                            <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                            Sending Email...
                          </>
                        ) : (
                          <>Send Invoice via Email</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceModal(false);
                  resetInvoiceForm();
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (activeSection === "overdue") {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Overdue Accounts</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Overdue
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                <OverdueAccountsWidget
                  key={`overdue-total-${refreshKey}`}
                  autoRefresh={false}
                  refreshInterval={300000}
                  showAllAccounts={false}
                  maxAccounts={1}
                  showSummaryOnly={true}
                  onAccountClick={(accountNumber) => {
                    router.push(
                      `/protected/accounts?section=vehicles&account=${accountNumber}`,
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accounts Affected
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                <OverdueAccountsWidget
                  key={`overdue-count-${refreshKey}`}
                  autoRefresh={false}
                  refreshInterval={300000}
                  showAllAccounts={false}
                  maxAccounts={1}
                  showSummaryOnly={true}
                  showAccountCount={true}
                  onAccountClick={(accountNumber) => {
                    router.push(
                      `/protected/accounts?section=vehicles&account=${accountNumber}`,
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                <OverdueAccountsWidget
                  key={`overdue-status-${refreshKey}`}
                  autoRefresh={false}
                  refreshInterval={300000}
                  showAllAccounts={false}
                  maxAccounts={1}
                  showSummaryOnly={true}
                  showStatus={true}
                  onAccountClick={(accountNumber) => {
                    router.push(
                      `/protected/accounts?section=vehicles&account=${accountNumber}`,
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Overdue Accounts with Expandable Cards */}
        <OverdueAccountsWidget
          key={`overdue-expandable-${refreshKey}`}
          autoRefresh={false}
          refreshInterval={300000}
          showAllAccounts={true}
          maxAccounts={50}
          expandableCards={true}
          onAccountClick={(accountNumber) => {
            router.push(
              `/protected/accounts?section=vehicles&account=${accountNumber}`,
            );
          }}
        />
      </div>
    );
  }

  if (activeSection === "vehicles") {
    if (selectedAccount) {
      return (
        <InternalAccountDashboard
          accountNumber={selectedAccount.accountNumber}
          defaultTab="vehicles"
          onBack={() => {
            setSelectedAccount(null);
            setAccountVehicles([]);
            router.push("/protected/accounts?section=vehicles");
          }}
        />
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Vehicles</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Vehicle Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Select an account to view vehicles and monthly costs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback
  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Select a Section</h2>
        <p className="text-gray-600">
          Please select a section from the sidebar to get started.
        </p>
      </div>
    </>
  );
}
