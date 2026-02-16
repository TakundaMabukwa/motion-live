'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  Search,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Package,
  RefreshCw,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('open-jobs');
  const [assignTechnicianOpen, setAssignTechnicianOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [installationDate, setInstallationDate] = useState('');
  const [installationTime, setInstallationTime] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuotes, setExpandedQuotes] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const formatConflictDate = (value) => {
    if (!value) return 'Not provided';
    const datePart = String(value).split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    }
    return value;
  };

  const formatConflictTime = (value) => {
    if (!value) return 'Not provided';
    const match = String(value).match(/T(\d{2}:\d{2}:\d{2})/);
    if (match?.[1]) return match[1];
    const hhmm = String(value).match(/(\d{2}:\d{2})/);
    if (hhmm?.[1]) return `${hhmm[1]}:00`;
    return value;
  };

  const fetchTechnicians = async () => {
    try {
      console.log('Fetching technicians...');
      const response = await fetch('/api/technicians');
      if (!response.ok) {
        throw new Error('Failed to fetch technicians');
      }
      const data = await response.json();
      console.log('Technicians API response:', data);
      
      if (data.technicians && data.technicians.length > 0) {
        console.log('Setting technicians from database:', data.technicians);
        setTechnicians(data.technicians);
        toast.success(`Loaded ${data.technicians.length} technicians`);
      } else {
        // Fallback to hardcoded technicians if none found in database
        console.log('No technicians found in database, using fallback list');
        const fallbackTechnicians = [
          { id: 1, name: 'John Smith', email: 'john.smith@company.com' },
          { id: 2, name: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
          { id: 3, name: 'Mike Johnson', email: 'mike.johnson@company.com' },
          { id: 4, name: 'Tech Skyflow', email: 'tech.skyflow@company.com' }
        ];
        setTechnicians(fallbackTechnicians);
        toast.info('Using fallback technicians. Add technicians to database for full functionality.');
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      // Fallback to hardcoded technicians on error
      console.log('Error fetching technicians, using fallback list');
      const fallbackTechnicians = [
        { id: 1, name: 'John Smith', email: 'john.smith@company.com' },
        { id: 2, name: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
        { id: 3, name: 'Mike Johnson', email: 'mike.johnson@company.com' },
        { id: 4, name: 'Tech Skyflow', email: 'tech.skyflow@company.com' }
      ];
      setTechnicians(fallbackTechnicians);
      toast.warning('Using fallback technicians due to connection error.');
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'open-jobs' ? 'open' : 'completed';
      console.log(`Fetching ${status} jobs...`);

      let url = `/api/jobs?status=${status}`;
      if (companyFilter) {
        url += `&company=${encodeURIComponent(companyFilter)}`;
      }
      if (roleFilter && roleFilter !== 'all') {
        url += `&role=${encodeURIComponent(roleFilter)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      console.log('Fetched jobs:', data.quotes);

      // Sort jobs: unassigned first, assigned last
      const sortedQuotes = (data.quotes || []).sort((a, b) => {
        const aHasTechnician = a.jobs && a.jobs.some(job => job.technician);
        const bHasTechnician = b.jobs && b.jobs.some(job => job.technician);
        
        if (aHasTechnician && !bHasTechnician) return 1; // a goes to bottom
        if (!aHasTechnician && bHasTechnician) return -1; // b goes to bottom
        return 0; // keep original order
      });

      console.log('Sorted quotes - unassigned first, assigned last:', sortedQuotes.map(q => ({
        id: q.id,
        customer: q.customer_name,
        hasTechnician: q.jobs && q.jobs.some(job => job.technician)
      })));

      setQuotes(sortedQuotes);

      // Initialize expanded state
      const initialExpanded = {};
      sortedQuotes.forEach(quote => {
        initialExpanded[quote.id] = false;
      });
      setExpandedQuotes(initialExpanded);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
    // Set default role filter to admin to show admin jobs
    setRoleFilter('admin');
    fetchJobs();
  }, [activeTab, companyFilter, roleFilter]);

  const refreshJobs = async () => {
    setRefreshing(true);
    await fetchJobs();
  };

  const toggleQuoteExpansion = (quoteId) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.customer_phone?.includes(searchTerm) ||
    quote.jobs.some(job => job.product_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssignTechnician = (quote) => {
    console.log('Selected quote for assignment:', quote);
    setSelectedQuote(quote);
    setSelectedTechnician('');
    
    // For reassignment, populate with current technicians, date, and time
    const currentTechnicians = [];
    let currentDate = '';
    let currentTime = '';
    
    if (quote.jobs.some(job => job.technician)) {
      const technicianNames = quote.jobs[0]?.technician?.split(', ') || [];
      currentTechnicians.push(...technicianNames);
      
      // Get current date and time from the job
      currentDate = quote.jobs[0]?.date || '';
      currentTime = quote.jobs[0]?.time || '';
    }
    
    setSelectedTechnicians(currentTechnicians);
    setInstallationDate(currentDate);
    setInstallationTime(currentTime);
    setAssignTechnicianOpen(true);
  };

  const confirmAssignTechnician = async () => {
    if (selectedTechnicians.length === 0 || !installationDate || !installationTime) {
      toast.error('Please select at least one technician and fill in all fields');
      return;
    }

    try {
      const technicianEmails = selectedTechnicians.map(name => {
        const tech = technicians.find(t => t.name === name);
        return tech ? tech.email : name;
      }).join(', ');

      console.log('Assigning technicians:', selectedTechnicians, 'Emails:', technicianEmails);
      console.log('Job ID being assigned:', selectedQuote.id);

      const response = await fetch(`/api/jobs/${selectedQuote.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technician: technicianEmails,
          date: installationDate,
          time: installationTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409 && errorData.needsOverride) {
          setConflictData(errorData);
          setConflictDialogOpen(true);
          return;
        }
        throw new Error(errorData.error || 'Failed to assign technician');
      }

      const result = await response.json();
      console.log('Assignment result:', result);

      const isReassignment = selectedQuote.jobs.some(job => job.technician);
      toast.success(`Job ${isReassignment ? 're-assigned' : 'assigned'} successfully! ${selectedTechnicians.join(', ')} will handle this installation.`);
      setAssignTechnicianOpen(false);
      setSelectedQuote(null);
      setSelectedTechnician('');
      setSelectedTechnicians([]);
      setInstallationDate('');
      setInstallationTime('');
      
      setTimeout(() => {
        fetchJobs();
      }, 500);
    } catch (error) {
      console.error('Error assigning technician:', error);
      const isReassignment = selectedQuote?.jobs.some(job => job.technician);
      toast.error(`Error: Please alert tech team. ${isReassignment ? 'Re-assignment' : 'Assignment'} failed.`);
    }
  };

  const handleOverrideAssignment = async () => {
    try {
      const technicianEmails = selectedTechnicians.map(name => {
        const tech = technicians.find(t => t.name === name);
        return tech ? tech.email : name;
      }).join(', ');

      const response = await fetch(`/api/jobs/${selectedQuote.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technician: technicianEmails,
          date: installationDate,
          time: installationTime,
          override: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign technician');
      }

      const isReassignment = selectedQuote.jobs.some(job => job.technician);
      toast.success(`Job ${isReassignment ? 're-assigned' : 'assigned'} successfully with override! ${selectedTechnicians.join(', ')} will handle this installation.`);
      
      // Close dialogs and reset form
      setConflictDialogOpen(false);
      setAssignTechnicianOpen(false);
      setSelectedQuote(null);
      setSelectedTechnician('');
      setSelectedTechnicians([]);
      setInstallationDate('');
      setInstallationTime('');
      
      // Refresh jobs list
      setTimeout(() => {
        fetchJobs();
      }, 500);
    } catch (error) {
      console.error('Error overriding assignment:', error);
      toast.error('Failed to override assignment');
    }
  };

  const getJobCountByCompany = () => {
    const companyCounts = {};
    quotes.forEach(quote => {
      const company = quote.customer_name;
      if (!companyCounts[company]) {
        companyCounts[company] = 0;
      }
      companyCounts[company] += quote.jobs.length;
    });
    return companyCounts;
  };

  const companyJobCounts = getJobCountByCompany();

  return (
    <div className="mx-auto p-6 container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Jobs Management</h1>
          <p className="text-gray-600">
            {roleFilter === 'admin' ? 'Admin Jobs' : roleFilter === 'user' ? 'User Jobs' : 'All Jobs'}
          </p>
        </div>
        <Button onClick={refreshJobs} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="company-filter">Filter by Company</Label>
            <Input
                id="company-filter"
                placeholder="Enter company name..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setCompanyFilter('');
                setRoleFilter('all');
              }}
              disabled={!companyFilter && roleFilter === 'all'}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Job Counts */}
      {Object.keys(companyJobCounts).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Active Jobs by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(companyJobCounts).map(([company, count]) => (
                <div key={company} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{company}</p>
                    <p className="text-gray-500 text-sm">{count} active job{count !== 1 ? 's' : ''}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCompanyFilter(company)}
                  >
                    View Jobs
                  </Button>
        </div>
              ))}
      </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="open-jobs" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Open Jobs
          </TabsTrigger>
          <TabsTrigger value="completed-jobs" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open-jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Open Jobs
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="py-8 text-gray-500 text-center">
                  No open jobs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Job Type
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Products
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Technician
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredQuotes.map((quote) => (
                        <>
                          <tr key={quote.id} className="hover:bg-gray-50 border-gray-100 border-b">
                            <td className="px-4 py-3 text-gray-900">
                                <div className="font-medium">{quote.customer_name}</div>
                              <div className="text-gray-500 text-sm">
                                  {quote.customer_email}
                                </div>
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                  <span>{quote.customer_phone}</span>
                                </div>
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                {quote.job_type}
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span>{quote.jobs.length} product(s)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                  className="p-0 w-6 h-6"
                                    onClick={() => toggleQuoteExpansion(quote.id)}
                                  >
                                    {expandedQuotes[quote.id] ? (
                                    <ChevronUp className="w-4 h-4" />
                                    ) : (
                                    <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                              {quote.jobs[0]?.technician || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              R {quote.total_amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex gap-2">
                                {quote.jobs.some(job => job.technician) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAssignTechnician(quote)}
                                    className="flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Re-assign
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignTechnician(quote)}
                                  >
                                    Assign Technician
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                            {expandedQuotes[quote.id] && (
                            <tr>
                              <td colSpan="8" className="bg-gray-50 px-4 py-3">
                                  <div className="space-y-3">
                                  <h4 className="font-medium text-gray-900">Products:</h4>
                                  {quote.jobs.map((job, index) => (
                                    <div key={job.id} className="flex justify-between items-center bg-white p-3 border rounded-lg">
                                      <div className="flex-1">
                                        <p className="font-medium">{job.product_name}</p>
                                        <p className="text-gray-500 text-sm">
                                          Quantity: {job.quantity} | Price: R {job.subtotal?.toFixed(2) || '0.00'}
                                        </p>
                                        </div>
                                      <div className="text-gray-500 text-sm">
                                        {job.date && job.time ? (
                                          <span>{job.date} at {job.time}</span>
                                        ) : (
                                          <span className="text-orange-600">No date set</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed-jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Completed Jobs
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="py-8 text-gray-500 text-center">
                  No completed jobs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Job Type
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Products
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Technician
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredQuotes.map((quote) => (
                        <>
                          <tr key={quote.id} className="hover:bg-gray-50 border-gray-100 border-b">
                            <td className="px-4 py-3 text-gray-900">
                              <div className="font-medium">{quote.customer_name}</div>
                              <div className="text-gray-500 text-sm">
                                {quote.customer_email}
                            </div>
                          </td>
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span>{quote.customer_phone}</span>
                                </div>
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                {quote.job_type}
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span>{quote.jobs.length} product(s)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                  className="p-0 w-6 h-6"
                                    onClick={() => toggleQuoteExpansion(quote.id)}
                                  >
                                    {expandedQuotes[quote.id] ? (
                                    <ChevronUp className="w-4 h-4" />
                                    ) : (
                                    <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                                {quote.jobs[0]?.technician || 'N/A'}
                              </td>
                            <td className="px-4 py-3 text-gray-900">
                              R {quote.total_amount?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                            {expandedQuotes[quote.id] && (
                            <tr>
                              <td colSpan="7" className="bg-gray-50 px-4 py-3">
                                  <div className="space-y-3">
                                  <h4 className="font-medium text-gray-900">Products:</h4>
                                  {quote.jobs.map((job, index) => (
                                    <div key={job.id} className="flex justify-between items-center bg-white p-3 border rounded-lg">
                                      <div className="flex-1">
                                        <p className="font-medium">{job.product_name}</p>
                                        <p className="text-gray-500 text-sm">
                                          Quantity: {job.quantity} | Price: R {job.subtotal?.toFixed(2) || '0.00'}
                                        </p>
                                        </div>
                                      <div className="text-gray-500 text-sm">
                                        {job.date && job.time ? (
                                          <span>{job.date} at {job.time}</span>
                                        ) : (
                                          <span className="text-orange-600">No date set</span>
                                        )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Technician Dialog */}
      <Dialog open={assignTechnicianOpen} onOpenChange={setAssignTechnicianOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedQuote?.jobs.some(job => job.technician) ? 'Re-assign Technician' : 'Assign Technician'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedQuote && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="mb-2 font-medium text-gray-900">Job Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Customer:</strong> {selectedQuote.customer_name}</p>
                  <p><strong>Products:</strong> {selectedQuote.jobs.length} item(s)</p>
                  {selectedQuote.jobs.some(job => job.technician) && (
                    <p><strong>Current Technician:</strong> {selectedQuote.jobs[0]?.technician}</p>
                  )}
                  {selectedQuote.jobs.map((job, index) => (
                    <p key={index} className="text-gray-600">
                      • {job.product_name} (Qty: {job.quantity})
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="technician">Select Technicians</Label>
              <Select value={selectedTechnician} onValueChange={(value) => {
                if (value && !selectedTechnicians.includes(value)) {
                  setSelectedTechnicians(prev => [...prev, value]);
                }
                setSelectedTechnician('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technicians" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.filter(tech => !selectedTechnicians.includes(tech.name)).map((technician) => (
                    <SelectItem key={technician.id} value={technician.name}>
                      {technician.name} ({technician.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTechnicians.length > 0 && (
              <div>
                <Label>Selected Technicians</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTechnicians.map((techName, index) => (
                    <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      <span>{techName}</span>
                      <button
                        onClick={() => setSelectedTechnicians(prev => prev.filter((_, i) => i !== index))}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="installation-date">Installation Date</Label>
              <Input
                id="installation-date"
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="installation-time">Installation Time</Label>
              <Input
                id="installation-time"
                type="time"
                value={installationTime}
                onChange={(e) => setInstallationTime(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignTechnicianOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmAssignTechnician} disabled={selectedTechnicians.length === 0 || !installationDate || !installationTime}>
                {selectedQuote?.jobs.some(job => job.technician) ? 'Re-assign Technician' : 'Assign Technician'}{selectedTechnicians.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-600">⚠️ Scheduling Conflict</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">WARNING: This will create a double booking!</p>
              <p className="text-red-700 text-sm mt-1">
                One or more selected technicians are already assigned to other jobs at this time.
              </p>
            </div>
            
            {conflictData?.conflicts?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="font-semibold text-amber-800">
                  Conflicting Job #{conflictData.conflicts[0].job_number}
                </div>
                <div className="mt-2 text-sm text-amber-700 space-y-1">
                  <p>Customer: {conflictData.conflicts[0].customer_name || 'Not provided'}</p>
                  <p>
                    Time: {formatConflictTime(conflictData.conflicts[0].start_time)}
                  </p>
                  <p>
                    Date: {formatConflictDate(conflictData.conflicts[0].job_date)}
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-gray-600 text-sm">
              Do you want to proceed with the assignment anyway?
            </p>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOverrideAssignment} className="bg-amber-600 hover:bg-amber-700 text-white">
                Assign Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
