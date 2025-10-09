"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, FileText, Home, Eye, Download, CheckCircle, Clock, Loader2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Define stock order type
interface StockOrder {
    id: number;
    orderNumber: string;
    supplier: string;
    totalAmount: number;
    totalAmountUSD?: number;
    orderDate: string;
    approved: boolean;
    status: string;
    notes: string;
    createdBy: string;
    invoiceLink?: string;
    orderItems: Array<Record<string, unknown>>;
    createdAt: string;
    updatedAt: string;
}

interface PricingItem {
    id: number;
    description: string;
    cost_excl_vat_zar?: number;
    USD?: number | string;
    supplier?: string;
    stock_type?: string;
    created_at?: string;
}

export default function StockOrdersPage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'pricing'>('pending');
    const [selectedOrder, setSelectedOrder] = useState<StockOrder | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [editingPricingId, setEditingPricingId] = useState<number | null>(null);
    const [editingPricingData, setEditingPricingData] = useState<Partial<PricingItem> | null>(null);
    const [savingPricingId, setSavingPricingId] = useState<number | null>(null);
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [bulkEditingMap, setBulkEditingMap] = useState<Record<number, Partial<PricingItem>>>({});
    const [savingAll, setSavingAll] = useState(false);
    const { toast } = useToast();

    const pendingOrders = orders.filter(order => !order.approved);
    const approvedOrders = orders.filter(order => order.approved);

    // Fetch all stock orders from API
    const fetchStockOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/master/stock-orders');
            
            if (!response.ok) {
                throw new Error('Failed to fetch stock orders');
            }
            
            const data = await response.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching stock orders:', error);
            toast({
                title: "Error",
                description: "Failed to load stock orders. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch stock pricing from Supabase
    const fetchStockPricing = async () => {
        try {
            setLoadingPricing(true);
            // dynamic import to avoid adding server-only code at top-level
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            const { data, error } = await supabase
                .from('stock_pricing')
                .select('id, description, cost_excl_vat_zar, USD, supplier, stock_type, created_at');

            if (error) throw error;
            setPricingItems(data || []);
        } catch (error) {
            console.error('Error fetching stock pricing:', error);
            toast({
                title: "Error",
                description: "Failed to load pricing items.",
                variant: "destructive"
            });
        } finally {
            setLoadingPricing(false);
        }
    };

    const startEditPricing = (item: PricingItem) => {
        setEditingPricingId(item.id);
        setEditingPricingData({
            description: item.description,
            supplier: item.supplier,
            cost_excl_vat_zar: item.cost_excl_vat_zar,
            USD: item.USD as number | string,
            stock_type: item.stock_type,
        });
    };

    const cancelEditPricing = () => {
        setEditingPricingId(null);
        setEditingPricingData(null);
    };

    const startBulkEdit = () => {
        const map: Record<number, Partial<PricingItem>> = {};
        pricingItems.forEach(p => {
            map[p.id] = {
                description: p.description,
                supplier: p.supplier,
                cost_excl_vat_zar: p.cost_excl_vat_zar,
                USD: p.USD,
                stock_type: p.stock_type,
            };
        });
        setBulkEditingMap(map);
        setBulkEditMode(true);
    };

    const cancelBulkEdit = () => {
        setBulkEditingMap({});
        setBulkEditMode(false);
    };

    const saveBulkEdit = async () => {
        try {
            setSavingAll(true);
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            const updates = Object.keys(bulkEditingMap).map(async (key) => {
                const id = Number(key);
                const data = bulkEditingMap[id];
                const payload: Record<string, unknown> = {};
                if (data.description !== undefined) payload.description = data.description;
                if (data.supplier !== undefined) payload.supplier = data.supplier;
                if (data.cost_excl_vat_zar !== undefined) payload.cost_excl_vat_zar = Number(data.cost_excl_vat_zar || 0);
                if (data.USD !== undefined) payload.USD = data.USD === '' ? null : Number(data.USD);
                if (data.stock_type !== undefined) payload.stock_type = data.stock_type;

                const { data: updated, error } = await supabase.from('stock_pricing').update(payload).eq('id', id).select();
                if (error) throw error;
                return { id, updated: updated && updated[0] };
            });

            const results = await Promise.all(updates);

            // Merge returned updates into local state
            setPricingItems(prev => {
                const copy = [...prev];
                results.forEach(r => {
                    if (!r) return;
                    const idx = copy.findIndex(p => p.id === r.id);
                    if (idx === -1) return;
                    if (r.updated) {
                        copy[idx] = { ...copy[idx], ...(r.updated as Partial<PricingItem>) };
                    } else {
                        // fallback: apply from bulk map
                        copy[idx] = { ...copy[idx], ...(bulkEditingMap[r.id] as Partial<PricingItem>) } as PricingItem;
                    }
                });
                return copy;
            });

            toast({ title: 'Saved', description: 'All pricing items updated', variant: 'default' });
            setBulkEditingMap({});
            setBulkEditMode(false);
        } catch (err: unknown) {
            console.error('Error saving bulk pricing:', err);
            const msg = err instanceof Error ? err.message : String(err);
            toast({ title: 'Error', description: `Failed to save some items: ${msg}`, variant: 'destructive' });
        } finally {
            setSavingAll(false);
        }
    };

    const saveEditPricing = async (id: number) => {
        if (!editingPricingData) return;
        try {
            setSavingPricingId(id);
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            const updatePayload: Record<string, unknown> = {};
            if (editingPricingData.description !== undefined) updatePayload.description = editingPricingData.description;
            if (editingPricingData.supplier !== undefined) updatePayload.supplier = editingPricingData.supplier;
            if (editingPricingData.cost_excl_vat_zar !== undefined) updatePayload.cost_excl_vat_zar = Number(editingPricingData.cost_excl_vat_zar || 0);
            if (editingPricingData.USD !== undefined) updatePayload.USD = editingPricingData.USD === '' ? null : Number(editingPricingData.USD);
            if (editingPricingData.stock_type !== undefined) updatePayload.stock_type = editingPricingData.stock_type;

            const { data, error } = await supabase
                .from('stock_pricing')
                .update(updatePayload)
                .eq('id', id)
                .select();

            if (error) throw error;

            // Update local state with returned row if available, otherwise optimistic update
            if (data && data[0]) {
                setPricingItems(prev => prev.map(p => (p.id === id ? { ...p, ...(data[0] as Partial<PricingItem>) } : p)));
            } else {
                setPricingItems(prev => prev.map(p => (p.id === id ? { ...p, ...editingPricingData } as PricingItem : p)));
            }

            toast({ title: 'Saved', description: 'Pricing item updated', variant: 'default' });
            cancelEditPricing();
        } catch (err: unknown) {
            console.error('Error saving pricing item:', err);
            const msg = err instanceof Error ? err.message : String(err);
            toast({ title: 'Error', description: `Failed to save: ${msg}`, variant: 'destructive' });
        } finally {
            setSavingPricingId(null);
        }
    };

    useEffect(() => {
        fetchStockOrders();
        // also fetch pricing so it's ready when user switches to Pricing tab
        fetchStockPricing();

        // If the URL includes ?tab=pricing (or approved/pending), open that tab
        try {
            const tab = searchParams?.get?.('tab');
            if (tab === 'pricing' || tab === 'approved' || tab === 'pending') {
                const t = tab as 'pending' | 'approved' | 'pricing';
                setActiveTab(t);
            }
            } catch {
                // noop
            }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleViewOrder = (order: StockOrder) => {
        setSelectedOrder(order);
        if (order.invoiceLink) {
            setShowPdfViewer(true);
        } else {
            setShowOrderDetails(true);
        }
    };

    const handleDownloadInvoice = async (order: StockOrder) => {
        if (!order.invoiceLink) {
            toast({
                title: "No Invoice",
                description: "This order doesn't have an invoice attached.",
                variant: "destructive"
            });
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = order.invoiceLink;
            link.download = `order-${order.orderNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
                title: "Download Started",
                description: `Order ${order.orderNumber} invoice is being downloaded.`,
                variant: "default"
            });
        } catch (error) {
            console.error('Error downloading invoice:', error);
            toast({
                title: "Download Failed",
                description: "Failed to download invoice. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleApproveOrder = async (order: StockOrder) => {
        try {
            setApproving(order.id);
            
            const response = await fetch('/api/master/stock-orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: order.id,
                    approved: true
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve order');
            }

            // Update local state
            setOrders(prev => prev.map(ord => 
                ord.id === order.id ? { ...ord, approved: true } : ord
            ));

            toast({
                title: "Order Approved",
                description: `Order ${order.orderNumber} has been approved and moved to approved section.`,
                variant: "default"
            });

            // Refresh data to ensure consistency
            await fetchStockOrders();
            
        } catch (error) {
            console.error('Error approving order:', error);
            toast({
                title: "Error",
                description: "Failed to approve order. Please try again.",
                variant: "destructive"
            });
        } finally {
            setApproving(null);
        }
    };

    const handleUnapproveOrder = async (order: StockOrder) => {
        try {
            setApproving(order.id);
            
            const response = await fetch('/api/master/stock-orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: order.id,
                    approved: false
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to unapprove order');
            }

            // Update local state
            setOrders(prev => prev.map(ord => 
                ord.id === order.id ? { ...ord, approved: false } : ord
            ));

            toast({
                title: "Order Unapproved",
                description: `Order ${order.orderNumber} has been unapproved and moved to pending section.`,
                variant: "default"
            });

            // Refresh data to ensure consistency
            await fetchStockOrders();
            
        } catch (error) {
            console.error('Error unapproving order:', error);
            toast({
                title: "Error",
                description: "Failed to unapprove order. Please try again.",
                variant: "destructive"
            });
        } finally {
            setApproving(null);
        }
    };

    const getStatusBadge = (approved: boolean) => {
        if (approved) {
            return (
                <Badge className="bg-green-100 hover:bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 w-3 h-3" />
                    Approved
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-orange-100 hover:bg-orange-100 text-orange-800">
                    <Clock className="mr-1 w-3 h-3" />
                    Pending
                </Badge>
            );
        }
    };

    const filteredOrders = orders.filter(order => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            order.orderNumber.toLowerCase().includes(searchLower) ||
            order.supplier.toLowerCase().includes(searchLower) ||
            order.createdBy.toLowerCase().includes(searchLower) ||
            order.notes.toLowerCase().includes(searchLower)
        );
    });

    const filteredPendingOrders = filteredOrders.filter(order => !order.approved);
    const filteredApprovedOrders = filteredOrders.filter(order => order.approved);

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const approvedAmount = approvedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    if (loading) {
        return (
            <div className="flex bg-gray-50 min-h-screen">
                <div className="bg-white shadow-lg w-64">
                    <div className="p-6 border-b">
                        <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
                    </div>
                    <nav className="mt-6">
                        <div className="space-y-2 px-4">
                            <Link href="/protected/master" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <Home className="mr-3 w-5 h-5" />
                                Home
                            </Link>
                            {/* <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <Users className="mr-3 w-5 h-5" />
                                Users
                            </Link> */}
                            <Link href="/protected/master/invoices" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <FileText className="mr-3 w-5 h-5" />
                                Invoices
                            </Link>
                            <Link href="/protected/master/stock-orders" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
                                Stock Orders
                            </Link>
                            <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <LogoutButton />
                            </div>
                        </div>
                    </nav>
                </div>
                <div className="flex-1 p-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex justify-center items-center h-64">
                            <div className="flex items-center space-x-2">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                <span className="text-gray-600">Loading stock orders...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Sidebar */}
            <div className="bg-white shadow-lg w-64">
                <div className="p-6 border-b">
                    <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
                </div>
                <nav className="mt-6">
                    <div className="space-y-2 px-4">
                        <Link href="/protected/master" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <Home className="mr-3 w-5 h-5" />
                            Home
                        </Link>
                        <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <Users className="mr-3 w-5 h-5" />
                            Users
                        </Link>
                        <Link href="/protected/master/invoices" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <FileText className="mr-3 w-5 h-5" />
                            Invoices
                        </Link>
                        <Link href="/protected/master/stock-orders" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
                            Stock Orders
                            {pendingOrders.length > 0 && (
                                <span className="bg-orange-100 ml-auto px-2 py-1 rounded-full font-medium text-orange-800 text-xs">
                                    {pendingOrders.length}
                                </span>
                            )}
                        </Link>
                        <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <LogoutButton />
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-bold text-gray-900 text-3xl">Stock Orders Management</h2>
                        <div className="flex items-center gap-2">
                            <Button onClick={fetchStockOrders} variant="outline" size="sm">
                                <RefreshCw className="mr-2 w-4 h-4" />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Stock Orders Stats */}
                    <div className="gap-6 grid grid-cols-1 md:grid-cols-4 mb-8">
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Total Orders</h3>
                            <p className="font-bold text-gray-900 text-2xl">{orders.length}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Total Amount</h3>
                            <p className="font-bold text-gray-900 text-2xl">R{totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Pending Approval</h3>
                            <p className="font-bold text-orange-600 text-2xl">{pendingOrders.length}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Approved Amount</h3>
                            <p className="font-bold text-green-600 text-2xl">R{approvedAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative max-w-md">
                            <input
                                type="text"
                                placeholder="Search orders by number, supplier, creator, or notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                            />
                            <div className="left-0 absolute inset-y-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
                        <div className="border-b">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className={`px-6 py-4 font-medium text-sm transition-colors ${
                                        activeTab === 'pending'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Pending Approval ({filteredPendingOrders.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('approved')}
                                    className={`px-6 py-4 font-medium text-sm transition-colors ${
                                        activeTab === 'approved'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Approved ({filteredApprovedOrders.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('pricing')}
                                    className={`px-6 py-4 font-medium text-sm transition-colors ${
                                        activeTab === 'pricing'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Pricing ({pricingItems.length})
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Orders / Pricing Table */}
                            <div className="overflow-x-auto">
                                {activeTab === 'pricing' ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <div />
                                            <div className="flex items-center space-x-2">
                                                {!bulkEditMode ? (
                                                    <button onClick={startBulkEdit} className="bg-white border px-3 py-2 rounded text-sm">Edit All</button>
                                                ) : (
                                                    <>
                                                        <button onClick={saveBulkEdit} disabled={savingAll} className="bg-green-600 text-white px-3 py-2 rounded text-sm">{savingAll ? 'Saving…' : 'Save All'}</button>
                                                        <button onClick={cancelBulkEdit} disabled={savingAll} className="bg-gray-100 px-3 py-2 rounded text-sm">Cancel</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {loadingPricing ? (
                                            <div className="flex items-center space-x-2 p-6">
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                                <span className="text-gray-600">Loading pricing items...</span>
                                            </div>
                                        ) : (
                                            <table className="divide-y divide-gray-200 min-w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Description</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Supplier</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Cost (ZAR)</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Cost (USD)</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Stock Type</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Created</th>
                                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {pricingItems.map(item => (
                                                                <tr key={item.id} className="hover:bg-gray-50">
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        { (bulkEditMode && bulkEditingMap[item.id]) || editingPricingId === item.id ? (
                                                                            <input value={(bulkEditMode ? (bulkEditingMap[item.id]?.description ?? '') : (editingPricingData?.description ?? ''))} onChange={(e) => {
                                                                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), description: e.target.value } }));
                                                                                else setEditingPricingData(prev => ({ ...(prev || {}), description: e.target.value }));
                                                                            }} className="w-full border px-2 py-1 rounded" />
                                                                        ) : (
                                                                            <div className="font-medium text-gray-900 text-sm">{item.description}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        { (bulkEditMode && bulkEditingMap[item.id]) || editingPricingId === item.id ? (
                                                                            <input value={(bulkEditMode ? (bulkEditingMap[item.id]?.supplier ?? '') : (editingPricingData?.supplier ?? ''))} onChange={(e) => {
                                                                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), supplier: e.target.value } }));
                                                                                else setEditingPricingData(prev => ({ ...(prev || {}), supplier: e.target.value }));
                                                                            }} className="w-full border px-2 py-1 rounded" />
                                                                        ) : (
                                                                            <div className="text-gray-900 text-sm">{item.supplier || '—'}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        { (bulkEditMode && bulkEditingMap[item.id]) || editingPricingId === item.id ? (
                                                                            <input value={String(bulkEditMode ? (bulkEditingMap[item.id]?.cost_excl_vat_zar ?? '') : (editingPricingData?.cost_excl_vat_zar ?? ''))} onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const num = val === '' ? 0 : Number(val);
                                                                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), cost_excl_vat_zar: num } }));
                                                                                else setEditingPricingData(prev => ({ ...(prev || {}), cost_excl_vat_zar: num }));
                                                                            }} className="w-28 border px-2 py-1 rounded" />
                                                                        ) : (
                                                                            <div className="font-medium text-gray-900 text-sm">R{(item.cost_excl_vat_zar || 0).toLocaleString()}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        { (bulkEditMode && bulkEditingMap[item.id]) || editingPricingId === item.id ? (
                                                                            <input value={(bulkEditMode ? (bulkEditingMap[item.id]?.stock_type ?? '') : (editingPricingData?.stock_type ?? ''))} onChange={(e) => {
                                                                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), stock_type: e.target.value } }));
                                                                                else setEditingPricingData(prev => ({ ...(prev || {}), stock_type: e.target.value }));
                                                                            }} className="w-28 border px-2 py-1 rounded" />
                                                                        ) : (
                                                                            <div className="text-gray-900 text-sm">{item.stock_type || '—'}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        {editingPricingId === item.id ? (
                                                                            <div className="flex items-center space-x-2">
                                                                                <button onClick={() => saveEditPricing(item.id)} disabled={savingPricingId === item.id} className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                                                                                    {savingPricingId === item.id ? 'Saving…' : 'Save'}
                                                                                </button>
                                                                                <button onClick={cancelEditPricing} className="bg-gray-100 px-3 py-1 rounded text-xs">Cancel</button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center space-x-2">
                                                                                <button onClick={() => startEditPricing(item)} className="bg-white border px-3 py-1 rounded text-xs">Edit</button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                            </table>
                                        )}
                                    </>
                                ) : (
                                    <table className="divide-y divide-gray-200 min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Order Number
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Supplier
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Created By
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {(activeTab === 'pending' ? filteredPendingOrders : filteredApprovedOrders).map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900 text-sm">{order.orderNumber}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-gray-900 text-sm">{order.supplier}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900 text-sm">R{order.totalAmount.toLocaleString()}</div>
                                                        {order.totalAmountUSD && (
                                                            <div className="text-gray-500 text-xs">${order.totalAmountUSD.toLocaleString()}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-gray-500 text-sm">{order.orderDate}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-gray-900 text-sm">{order.createdBy}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(order.approved)}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-sm whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleViewOrder(order)}
                                                                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-white text-xs"
                                                            >
                                                                <Eye className="mr-1 w-3 h-3" />
                                                                View
                                                            </button>
                                                            {order.invoiceLink && (
                                                                <button
                                                                    onClick={() => handleDownloadInvoice(order)}
                                                                    className="inline-flex items-center bg-white hover:bg-gray-50 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-gray-700 text-xs"
                                                                >
                                                                    <Download className="mr-1 w-3 h-3" />
                                                                    Invoice
                                                                </button>
                                                            )}
                                                            {!order.approved ? (
                                                                <button
                                                                    onClick={() => handleApproveOrder(order)}
                                                                    disabled={approving === order.id}
                                                                    className="inline-flex items-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium text-white text-xs"
                                                                >
                                                                    {approving === order.id ? (
                                                                        <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle className="mr-1 w-3 h-3" />
                                                                    )}
                                                                    {approving === order.id ? 'Approving...' : 'Approve'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUnapproveOrder(order)}
                                                                    disabled={approving === order.id}
                                                                    className="inline-flex items-center bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium text-white text-xs"
                                                                >
                                                                    {approving === order.id ? (
                                                                        <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <XCircle className="mr-1 w-3 h-3" />
                                                                    )}
                                                                    {approving === order.id ? 'Unapproving...' : 'Unapprove'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            
                            {orders.length === 0 && (
                                <div className="py-12 text-center">
                                    <FileText className="mx-auto w-12 h-12 text-gray-400" />
                                    <h3 className="mt-2 font-medium text-gray-900 text-sm">No stock orders found</h3>
                                    <p className="mt-1 text-gray-500 text-sm">
                                        Stock orders will appear here once they are created.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Details Modal */}
            <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Order Details: {selectedOrder?.orderNumber}</span>
                            <div className="flex items-center space-x-2">
                                {selectedOrder?.invoiceLink && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => selectedOrder && handleDownloadInvoice(selectedOrder)}
                                    >
                                        <Download className="mr-2 w-4 h-4" />
                                        Download Invoice
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowOrderDetails(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {selectedOrder && (
                            <div className="space-y-6">
                                {/* Order Information */}
                                <div className="gap-6 grid grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 font-medium text-gray-900">Order Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">Order Number:</span> {selectedOrder.orderNumber}</div>
                                            <div><span className="font-medium">Supplier:</span> {selectedOrder.supplier}</div>
                                            <div><span className="font-medium">Order Date:</span> {selectedOrder.orderDate}</div>
                                            <div><span className="font-medium">Status:</span> {getStatusBadge(selectedOrder.approved)}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 font-medium text-gray-900">Financial Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">Total Amount (ZAR):</span> R{selectedOrder.totalAmount.toLocaleString()}</div>
                                            {selectedOrder.totalAmountUSD && (
                                                <div><span className="font-medium">Total Amount (USD):</span> ${selectedOrder.totalAmountUSD.toLocaleString()}</div>
                                            )}
                                            <div><span className="font-medium">Created By:</span> {selectedOrder.createdBy}</div>
                                            <div><span className="font-medium">Created At:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.notes && (
                                    <div>
                                        <h3 className="mb-2 font-medium text-gray-900">Notes</h3>
                                        <p className="bg-gray-50 p-3 rounded-lg text-gray-600 text-sm">{selectedOrder.notes}</p>
                                    </div>
                                )}

                                {/* Order Items */}
                                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                                    <div>
                                        <h3 className="mb-2 font-medium text-gray-900">Order Items</h3>
                                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                                            <table className="divide-y divide-gray-200 min-w-full">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="px-4 py-2 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Item</th>
                                                        <th className="px-4 py-2 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Quantity</th>
                                                        <th className="px-4 py-2 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Price</th>
                                                        <th className="px-4 py-2 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedOrder.orderItems.map((rawItem, index) => {
                                                        const item = rawItem as Record<string, unknown>;
                                                        const description = (item.description as string) || (item.name as string) || 'Unknown Item';
                                                        const quantity = Number(item.quantity ?? 1);
                                                        const price = Number(item.price ?? 0);
                                                        const total = Number(item.total ?? 0);
                                                        return (
                                                            <tr key={index}>
                                                                <td className="px-4 py-2 text-gray-900 text-sm">{description}</td>
                                                                <td className="px-4 py-2 text-gray-900 text-sm">{quantity}</td>
                                                                <td className="px-4 py-2 text-gray-900 text-sm">R{price.toLocaleString()}</td>
                                                                <td className="px-4 py-2 text-gray-900 text-sm">R{total.toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Approval Actions */}
                                <div className="pt-4 border-t">
                                    <h3 className="mb-3 font-medium text-gray-900">Approval Actions</h3>
                                    <div className="flex space-x-3">
                                        {!selectedOrder.approved ? (
                                            <Button
                                                onClick={() => handleApproveOrder(selectedOrder)}
                                                disabled={approving === selectedOrder.id}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {approving === selectedOrder.id ? (
                                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="mr-2 w-4 h-4" />
                                                )}
                                                {approving === selectedOrder.id ? 'Approving...' : 'Approve Order'}
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleUnapproveOrder(selectedOrder)}
                                                disabled={approving === selectedOrder.id}
                                                variant="destructive"
                                            >
                                                {approving === selectedOrder.id ? (
                                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="mr-2 w-4 h-4" />
                                                )}
                                                {approving === selectedOrder.id ? 'Unapproving...' : 'Unapprove Order'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PDF Viewer Modal */}
            <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Invoice PDF: {selectedOrder?.orderNumber}</span>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectedOrder && handleDownloadInvoice(selectedOrder)}
                                >
                                    <Download className="mr-2 w-4 h-4" />
                                    Download
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPdfViewer(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        {selectedOrder?.invoiceLink ? (
                            <iframe
                                src={selectedOrder.invoiceLink}
                                className="border-0 rounded-lg w-full h-[80vh]"
                                title={`Invoice for Order ${selectedOrder.orderNumber}`}
                                onError={() => {
                                    toast({
                                        title: "Error",
                                        description: "Failed to load PDF. Please try downloading instead.",
                                        variant: "destructive"
                                    });
                                }}
                            />
                        ) : (
                            <div className="flex justify-center items-center h-64">
                                <div className="text-center">
                                    <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
                                    <h3 className="mt-2 font-medium text-gray-900 text-sm">No PDF Available</h3>
                                    <p className="mt-1 text-gray-500 text-sm">
                                        This order doesn&apos;t have an invoice PDF attached.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
