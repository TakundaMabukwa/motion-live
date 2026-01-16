'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Activity, FileText, DollarSign, TrendingUp, Eye, ArrowLeft, Package, Camera, Wrench, Search } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  last_sign_in_at: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  quantity: number;
  cash_price: number;
  total_price: number;
}

interface JobCard {
  id: string;
  job_number: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  status: string;
  quotation_total_amount: number;
  job_type: string;
  priority: string;
  special_instructions: string;
  job_description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  quotation_products: Product[];
}

export default function UserActivityPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | { id: string, email: string } | null>(null);
  const [jobCardsLoading, setJobCardsLoading] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showUserStats, setShowUserStats] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [weeklyStats, setWeeklyStats] = useState({ 
    jobCards: 0, 
    quotations: 0, 
    totalAmount: 0, 
    quotationAmount: 0,
    externalQuotes: 0,
    clientQuotes: 0,
    creators: [] as string[] 
  });
  
  const [searchEmail, setSearchEmail] = useState('');
  
  const filteredUsers = users.filter(user => {
    const allowedRoles = ['fc', 'accounts', 'inv', 'admin', 'tech'];
    const matchesRole = allowedRoles.includes(user.role);
    const matchesEmail = searchEmail === '' || user.email.toLowerCase().includes(searchEmail.toLowerCase());
    return matchesRole && matchesEmail;
  }).sort((a, b) => a.email.localeCompare(b.email));

  useEffect(() => {
    fetchUsers();
    fetchWeeklyStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to fetch users: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched users:', data.users?.length);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      const supabase = createClient();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Fetch job cards
      const { data: jobCardsData, error } = await supabase
        .from('job_cards')
        .select('created_by, quotation_total_amount, job_type')
        .gte('created_at', weekAgo.toISOString());
      
      if (error) throw error;
      
      // Fetch external quotes from customer_quotes table
      const { data: externalQuotesData } = await supabase
        .from('customer_quotes')
        .select('created_by, quotation_total_amount')
        .eq('quote_type', 'external')
        .gte('created_at', weekAgo.toISOString());
      
      // Fetch client quotes
      const { data: clientQuotesData } = await supabase
        .from('client_quotes')
        .select('created_by, total_amount')
        .gte('created_at', weekAgo.toISOString());
      
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email');
      
      const userEmailMap = new Map();
      usersData?.forEach(user => userEmailMap.set(user.id, user.email));
      
      const jobCards = jobCardsData?.filter(card => card.job_type !== 'quotation') || [];
      const totalJobAmount = jobCards.reduce((sum, card) => sum + (Number(card.quotation_total_amount) || 0), 0);
      
      const externalQuotes = externalQuotesData || [];
      const clientQuotes = clientQuotesData || [];
      const totalQuotes = externalQuotes.length + clientQuotes.length;
      const totalQuoteAmount = [...externalQuotes, ...clientQuotes].reduce((sum, quote) => sum + (Number(quote.quotation_total_amount || quote.total_amount) || 0), 0);
      
      const allCreatorIds = new Set([
        ...jobCards.map(card => card.created_by),
        ...externalQuotes.map(quote => quote.created_by),
        ...clientQuotes.map(quote => quote.created_by)
      ]);
      const creators = Array.from(allCreatorIds).map(id => userEmailMap.get(id) || 'Unknown').filter(email => email !== 'Unknown');
      
      setWeeklyStats({
        jobCards: jobCards.length,
        quotations: totalQuotes,
        totalAmount: totalJobAmount,
        quotationAmount: totalQuoteAmount,
        externalQuotes: externalQuotes.length,
        clientQuotes: clientQuotes.length,
        creators
      });
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (lastLogin: string | null) => {
    if (!lastLogin) return 'bg-gray-500';
    const diffMs = new Date().getTime() - new Date(lastLogin).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'bg-green-500';
    if (diffDays <= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const fetchUserJobCards = async (userId: string, userEmail: string) => {
    setJobCardsLoading(true);
    setSelectedUser({ id: userId, email: userEmail, role: '', last_sign_in_at: null, created_at: '' });
    setShowUserStats(true);
    
    try {
      const supabase = createClient();
      
      // Fetch job cards created by OR updated by this user
      const { data: jobCardsData, error: jobCardsError } = await supabase
        .from('job_cards')
        .select('*')
        .or(`created_by.eq.${userId},updated_by.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (jobCardsError) throw jobCardsError;
      
      // Fetch quotes created by OR updated by this user
      const { data: quotesData, error: quotesError } = await supabase
        .from('customer_quotes')
        .select('*')
        .or(`created_by.eq.${userId},updated_by.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (quotesError) throw quotesError;
      
      // Combine and format data
      const formattedJobCards = (jobCardsData as any[])?.map(d => ({...d, quotation_products: d.quotation_products || [], item_type: 'job_card'})) || [];
      const formattedQuotes = (quotesData as any[])?.map(d => ({...d, quotation_products: d.quotation_products || [], item_type: 'quote', job_type: 'quote'})) || [];
      
      // Combine and sort by created_at
      const combinedData = [...formattedJobCards, ...formattedQuotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setJobCards(combinedData);
      
      // Fetch user information for created_by and updated_by fields
      const userIds = new Set<string>();
      combinedData.forEach(item => {
        if (item.created_by) userIds.add(item.created_by);
        if (item.updated_by) userIds.add(item.updated_by);
      });
      
      if (userIds.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', Array.from(userIds));
        
        const newUserMap = new Map();
        usersData?.forEach(user => {
          newUserMap.set(user.id, user.email);
        });
        setUserMap(newUserMap);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setJobCards([]);
    } finally {
      setJobCardsLoading(false);
    }
  };

  const calculateStats = () => {
    const totalAmount = jobCards.reduce((sum, card) => sum + (Number(card.quotation_total_amount) || 0), 0);
    const completedCards = jobCards.filter(card => card.status === 'completed');
    const completedAmount = completedCards.reduce((sum, card) => sum + (Number(card.quotation_total_amount) || 0), 0);
    const avgAmount = jobCards.length > 0 ? totalAmount / jobCards.length : 0;
    
    return {
      totalCards: jobCards.length,
      totalAmount,
      completedCards: completedCards.length,
      completedAmount,
      avgAmount,
      pendingCards: jobCards.filter(card => card.status !== 'completed').length
    };
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  };

  const handleJobCardClick = async (jobCard: JobCard) => {
    setSelectedJobCard(jobCard);
    
    // Fetch user emails for created_by and updated_by
    try {
      const supabase = createClient();
      const userIds = [jobCard.created_by, (jobCard as any).updated_by].filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);
        
        const newUserMap = new Map(userMap);
        usersData?.forEach(user => {
          newUserMap.set(user.id, user.email);
        });
        setUserMap(newUserMap);
      }
    } catch (error) {
      console.error('Error fetching user emails:', error);
    }
  };

  const handleBackToUsers = () => {
    setShowUserStats(false);
    setSelectedUser(null);
    setJobCards([]);
    setSelectedJobCard(null);
  };

  const handleBackToJobCards = () => {
    setSelectedJobCard(null);
  };

  if (selectedJobCard) {
    const products = selectedJobCard.quotation_products || [];
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.total_price || 0), 0);
    
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToJobCards} 
                  className="-ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">Job Card Details</h1>
                  <Badge variant="outline" className="text-sm px-2.5 py-0.5 bg-white border-blue-200 text-blue-700 font-mono">
                    {selectedJobCard.job_number}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                className={`px-3 py-1 text-xs uppercase tracking-wide shadow-none ${
                    selectedJobCard.status === 'completed' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                {selectedJobCard.status || 'draft'}
              </Badge>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Quotation</p>
                 <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {formatCurrency(selectedJobCard.quotation_total_amount)}
                    </h3>
                 </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Job Type</p>
                 <Badge variant="secondary" className="text-sm font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                    {selectedJobCard.job_type || 'N/A'}
                 </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</p>
                 <Badge variant="secondary" className="text-sm font-semibold px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 capitalize">
                      {selectedJobCard.priority || 'Normal'}
                 </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Client & Vehicle Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client & Vehicle Details Combined */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-3 px-6">
                  <CardTitle className="text-base font-semibold text-gray-800">Client & Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Customer Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="p-1.5 bg-blue-50 rounded-md">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                         </div>
                         <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider">Customer Details</h4>
                      </div>
                      
                      <div className="space-y-3 pl-1">
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Name</label>
                          <p className="text-sm font-medium text-gray-900">{selectedJobCard.customer_name || 'N/A'}</p>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                          <p className="text-sm text-gray-700">{selectedJobCard.customer_email || 'N/A'}</p>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                          <p className="text-sm text-gray-700 font-mono">{selectedJobCard.customer_phone || 'N/A'}</p>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Address</label>
                          <p className="text-sm text-gray-700">{selectedJobCard.customer_address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="space-y-4 md:border-l md:pl-8 border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-green-50 rounded-md">
                            <Package className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider">Vehicle Details</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-1">
                         <div className="col-span-2 group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Registration</label>
                          <Badge variant="secondary" className="text-sm px-2.5 py-0.5 font-mono bg-gray-100 text-gray-800 border border-gray-200 rounded">
                            {selectedJobCard.vehicle_registration || 'N/A'}
                          </Badge>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Make</label>
                          <p className="text-sm text-gray-700">{selectedJobCard.vehicle_make || 'N/A'}</p>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Model</label>
                          <p className="text-sm text-gray-700">{selectedJobCard.vehicle_model || 'N/A'}</p>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Year</label>
                          <p className="text-sm text-gray-700">{selectedJobCard.vehicle_year || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              {products.length > 0 && (
                <Card className="shadow-sm border-gray-200 overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-200 py-3 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-gray-500" />
                        <CardTitle className="text-base font-semibold text-gray-800">Products & Equipment</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5">
                        {totalProducts} Items
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {products.map((product, index) => (
                            <tr key={product.id || index} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{product.description}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                                  {product.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                                {product.quantity}
                              </td>
                              <td className="px-6 py-3 text-right text-sm text-gray-600 tabular-nums">
                                {formatCurrency(product.cash_price)}
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">
                                {formatCurrency(product.total_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td colSpan={4} className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</td>
                                <td className="px-6 py-3 text-right text-base font-bold text-gray-900 tabular-nums">{formatCurrency(totalValue)}</td>
                            </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Job Description & Scope */}
            <div className="lg:col-span-1 space-y-6">
               <Card className="shadow-sm border-gray-200 h-full">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-3 px-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-base font-semibold text-gray-800">Scope of Work</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed">
                        {selectedJobCard.job_description || 'No description provided.'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Special Instructions</h4>
                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/50 text-sm text-amber-900 leading-relaxed">
                        {selectedJobCard.special_instructions || 'No special instructions.'}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Job History</h4>
                    <div className="space-y-3">
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-800">Created</span>
                          <span className="text-xs text-blue-600">{new Date(selectedJobCard.created_at).toLocaleDateString()} {new Date(selectedJobCard.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs text-blue-700">by {userMap.get(selectedJobCard.created_by) || 'Unknown'}</div>
                      </div>
                      
                      {(selectedJobCard as any).updated_at && (
                        <div className="bg-green-50/50 p-3 rounded-lg border border-green-200/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-green-800">Last Updated</span>
                            <span className="text-xs text-green-600">{new Date((selectedJobCard as any).updated_at).toLocaleDateString()} {new Date((selectedJobCard as any).updated_at).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-xs text-green-700">by {userMap.get((selectedJobCard as any).updated_by) || 'Unknown'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showUserStats) {
    const stats = calculateStats();
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBackToUsers} className="text-gray-600 border-gray-300 hover:bg-gray-50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Cards Statistics</h1>
              <p className="text-gray-600 font-medium">{selectedUser?.email}</p>
            </div>
          </div>

          <div className="max-w-[70vw] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total Job Cards</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalCards}</div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total Quoted Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalAmount)}</div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Completed Jobs</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.completedCards}</div>
                <p className="text-xs text-gray-500 font-medium">{formatCurrency(stats.completedAmount)}</p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Average Job Value</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.avgAmount)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm max-w-[70vw] mx-auto">
            <CardHeader className="bg-slate-700 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Job Cards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {jobCardsLoading ? (
                <div className="text-center py-8">Loading job cards...</div>
              ) : (
                <div className="space-y-4">
                  {jobCards.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No job cards found for this user
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Number</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">Customer</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Job Type</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Amount</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Created</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Modified</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {jobCards.map(jobCard => {
                            const isUpdatedByOther = (jobCard as any).updated_by && (jobCard as any).updated_by !== jobCard.created_by;
                            const createdByEmail = userMap.get(jobCard.created_by) || 'Unknown';
                            const updatedByEmail = (jobCard as any).updated_by ? userMap.get((jobCard as any).updated_by) || 'Unknown' : null;
                            return (
                            <tr key={jobCard.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 w-32">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-blue-600 text-xs truncate">{jobCard.job_number}</span>
                                  {isUpdatedByOther && (
                                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 w-fit px-1 py-0">
                                      Updated by
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 w-40">
                                <span className="font-medium text-xs truncate block">{jobCard.customer_name || 'N/A'}</span>
                              </td>
                              <td className="px-3 py-2 w-24">
                                <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                                  (jobCard as any).item_type === 'quote' 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                  {(jobCard as any).item_type === 'quote' ? 'quote' : (jobCard.job_type || 'N/A')}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 w-24">
                                <span className="font-bold text-green-600 text-xs">{formatCurrency(jobCard.quotation_total_amount)}</span>
                              </td>
                              <td className="px-3 py-2 w-20">
                                <Badge className={`text-[10px] px-1 py-0 ${jobCard.status === 'completed' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'}`}>
                                  {jobCard.status || 'draft'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 w-32">
                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-600 font-medium text-xs">{new Date(jobCard.created_at).toLocaleDateString()}</span>
                                  <span className="text-gray-500 text-[10px] truncate">{createdByEmail}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 w-32">
                                <div className="flex flex-col gap-1">
                                  {(jobCard as any).updated_at ? (
                                    <>
                                      <span className="text-gray-600 font-medium text-xs">{new Date((jobCard as any).updated_at).toLocaleDateString()}</span>
                                      <span className="text-gray-500 text-[10px] truncate">{updatedByEmail}</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Not modified</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 w-20">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleJobCardClick(jobCard)}
                                  className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-700 text-xs px-2 py-1 h-6"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">User Activity Dashboard</h1>
            <p className="text-gray-600 font-medium">Monitor user login activity and job card statistics</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="font-bold text-gray-700">{filteredUsers.length} Users</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Job Cards (7d)</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{weeklyStats.jobCards}</div>
              <p className="text-xs text-gray-500 font-medium mt-1">{formatCurrency(weeklyStats.totalAmount)}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Quotations (7d)</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{weeklyStats.quotations}</div>
              <div className="flex justify-between text-xs text-gray-500 font-medium mt-1">
                <span>External: {weeklyStats.externalQuotes}</span>
                <span>Client: {weeklyStats.clientQuotes}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">{formatCurrency(weeklyStats.quotationAmount || 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="bg-slate-700 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Loading users...</td>
                      </tr>
                    )}

                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(user.last_sign_in_at)} shadow-sm`}></div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white mr-3 shadow-sm">
                              {user.email.split('@')[0].split('.').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className="bg-gray-600 text-white">
                            {user.role || 'No role'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => fetchUserJobCards(user.id, user.email)}
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Stats
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}