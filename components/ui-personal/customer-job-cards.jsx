'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Search, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerJobCards({ accountNumber }) {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      let url = '/api/job-cards';
      
      // Add account number filter if provided
      if (accountNumber) {
        url += `?account_number=${encodeURIComponent(accountNumber)}`;
      }
      
      console.log('Fetching job cards for account:', accountNumber || 'all accounts');
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error('Failed to fetch job cards');
      }
      const data = await response.json();
      console.log('Job cards response:', data);
      setJobCards(data.job_cards || []);
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, [accountNumber]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobCards();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      case 'cancelled':
        return 'Cancelled';
      case 'on_hold':
        return 'On Hold';
      default:
        return status || 'Unknown';
    }
  };

  const getJobTypeText = (jobType) => {
    switch (jobType) {
      case 'installation':
        return 'Installation';
      case 'deinstall':
        return 'De-installation';
      default:
        return jobType || 'Unknown';
    }
  };

  const getVehicleRegistration = (job) => {
    if (job?.vehicle_registration) return job.vehicle_registration;
    if (Array.isArray(job?.quotation_products) && job.quotation_products.length > 0) {
      const firstProduct = job.quotation_products[0];
      return firstProduct?.vehicle_plate || firstProduct?.registration || 'No registration';
    }
    return 'No registration';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredJobCards = jobCards.filter(job => {
    // Handle status filter
    if (searchTerm.startsWith('status:')) {
      const status = searchTerm.substring(7); // Remove 'status:' prefix
      return job.job_status === status;
    }
    
    // Handle regular search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.customer_address?.toLowerCase().includes(searchLower) ||
        job.job_type?.toLowerCase().includes(searchLower) ||
        job.quotation_number?.toLowerCase().includes(searchLower) ||
        getVehicleRegistration(job).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
                  <h2 className="font-bold text-2xl">
          All Job Cards
        </h2>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`mr-2 w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading job cards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-2xl">
          {accountNumber ? `Job Cards for ${accountNumber}` : 'All Job Cards'}
        </h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`mr-2 w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder={accountNumber ? 
              `Search jobs for ${accountNumber} by job number, customer, quote, reg, type, or address...` : 
              "Search all jobs by job number, customer, quote, reg, type, or address..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select 
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          onChange={(e) => {
            const status = e.target.value;
            if (status === 'all') {
              setSearchTerm('');
            } else {
              setSearchTerm(`status:${status}`);
            }
          }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-gray-600 text-sm">
        <span>
          {accountNumber ? 
            `Showing ${filteredJobCards.length} of ${jobCards.length} job cards for ${accountNumber}` :
            `Showing ${filteredJobCards.length} of ${jobCards.length} job cards`
          }
          {searchTerm && !searchTerm.startsWith('status:') && (
            <span className="ml-2">filtered by "{searchTerm}"</span>
          )}
          {searchTerm.startsWith('status:') && (
            <span className="ml-2">with status "{searchTerm.substring(7)}"</span>
          )}
        </span>
      </div>

      {/* Job Cards */}
      {filteredJobCards.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No job cards found</h3>
          <p className="text-gray-500">
            {accountNumber ? 
              (searchTerm ? `No job cards for ${accountNumber} match your search criteria.` : 
               `No job cards have been created for ${accountNumber} yet.`) :
              (searchTerm ? 'No job cards match your search criteria.' : 
               'No job cards have been created yet.')
            }
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {accountNumber ? `Job Cards for Account ${accountNumber}` : 'All Job Cards'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Vehicle Reg</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobCards.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.job_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.customer_name || 'N/A'}</div>
                          <div className="text-gray-500 text-sm">{job.customer_email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {job.new_account_number || job.account_id || 'N/A'}
                      </TableCell>
                      <TableCell>{getJobTypeText(job.job_type)}</TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{getVehicleRegistration(job)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[220px] truncate" title={job.quotation_number || ''}>
                          {job.quotation_number || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.job_status)}>
                          {getStatusText(job.job_status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
