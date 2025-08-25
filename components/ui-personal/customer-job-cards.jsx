'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
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
  }, []);

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
        job.quotation_number?.toLowerCase().includes(searchLower)
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
              `Search jobs for ${accountNumber} by job number, customer, type, or address...` : 
              "Search all jobs by job number, customer, type, or address..."
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
        <div className="space-y-4">
          {filteredJobCards.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{job.job_number}</h3>
                      <Badge className={getStatusColor(job.job_status)}>
                        {getStatusText(job.job_status)}
                      </Badge>
                      <Badge variant="outline">
                        {getJobTypeText(job.job_type)}
                      </Badge>
                    </div>
                    
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Customer:</span>
                          <span className="text-gray-700">{job.customer_name || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Address:</span>
                          <span className="text-gray-700">{job.customer_address || 'No address provided'}</span>
                        </div>
                        
                        {job.account_id && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Account:</span>
                            <span className="text-gray-700">{job.account_id}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {job.job_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Job Date:</span>
                            <span className="text-gray-700">{new Date(job.job_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {job.quotation_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Quote:</span>
                            <span className="text-gray-700">{job.quotation_number}</span>
                          </div>
                        )}
                        
                        {job.created_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Created:</span>
                            <span className="text-gray-700">{new Date(job.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {job.job_description && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-gray-600 text-sm">{job.job_description}</p>
                      </div>
                    )}
                    
                    {(job.customer_email || job.customer_phone) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-4 text-sm">
                          {job.customer_email && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Email:</span>
                              <span className="text-gray-700">{job.customer_email}</span>
                            </div>
                          )}
                          {job.customer_phone && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Phone:</span>
                              <span className="text-gray-700">{job.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 