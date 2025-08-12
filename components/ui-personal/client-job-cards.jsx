"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Eye,
  Check,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Car,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientJobCards({ accountNumber, onQuoteCreated }) {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [approvingJob, setApprovingJob] = useState(null);

  // Fetch job cards for this client
  const fetchJobCards = useCallback(async () => {
    if (!accountNumber) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/job-cards?account_number=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job cards');
      }
      const result = await response.json();
      setJobCards(result.job_cards || []);
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to fetch job cards', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    fetchJobCards();
  }, [fetchJobCards]);

  const filteredJobCards = jobCards.filter(job => {
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.job_type?.toLowerCase().includes(searchLower) ||
        job.quotation_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (selectedFilter !== "all") {
      return job.status === selectedFilter;
    }
    
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
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

  const formatCurrency = (amount) => {
    if (!amount) return 'R0.00';
    return `R${parseFloat(amount).toFixed(2)}`;
  };

  const handleApproveJob = async (job) => {
    // Confirm before approving
    if (!confirm(`Are you sure you want to approve job ${job.job_number}?`)) {
      return;
    }
    
    try {
      setApprovingJob(job.id);
      
      // Update the job status to approved
      const response = await fetch(`/api/job-cards/${job.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve job');
      }

      toast.success('Job approved successfully!', {
        description: `Job ${job.job_number} has been approved.`
      });

      // Refresh the job cards list
      fetchJobCards();

    } catch (error) {
      console.error('Error approving job:', error);
      toast.error('Failed to approve job', {
        description: error.message
      });
    } finally {
      setApprovingJob(null);
    }
  };

  // Calculate statistics
  const totalJobs = jobCards.length;
  const pendingJobs = jobCards.filter(j => j.status === 'pending').length;
  const activeJobs = jobCards.filter(j => j.status === 'active').length;
  const totalValue = jobCards.reduce((sum, j) => sum + (parseFloat(j.quotation_total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading job cards...</p>
        </div>
      </div>
    );
  }

  if (jobCards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No job cards yet</h3>
          <p className="text-gray-500">Create a new client quotation to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Jobs</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalJobs}</div>
            <p className="text-muted-foreground text-xs">All time jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Pending</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-orange-600 text-2xl">{pendingJobs}</div>
            <p className="text-muted-foreground text-xs">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{activeJobs}</div>
            <p className="text-muted-foreground text-xs">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-purple-600 text-2xl">
              {totalValue >= 1000000 ? `R${(totalValue / 1000000).toFixed(1)}M` : `R${(totalValue / 1000).toFixed(1)}K`}
            </div>
            <p className="text-muted-foreground text-xs">Combined value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex sm:flex-row flex-col gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search jobs by job number, customer, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
          {isFilterOpen && (
            <div className="right-0 z-10 absolute bg-white shadow-lg mt-2 border border-gray-200 rounded-lg w-48">
              <div className="p-2">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "all" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  All Jobs
                </button>
                <button
                  onClick={() => setSelectedFilter("draft")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "draft" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setSelectedFilter("pending")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "pending" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setSelectedFilter("active")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "active" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setSelectedFilter("completed")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "completed" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          )}
        </div>
        <Button onClick={fetchJobCards} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Job Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobCards.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.customer_name || 'N/A'}</div>
                        <div className="text-gray-500 text-sm">{job.customer_email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{job.job_type || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(job.quotation_total_amount)}</TableCell>
                    <TableCell>{formatDate(job.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusText(job.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/protected/fc/jobs/${job.id}`, '_blank')}
                        >
                          <Eye className="mr-1 w-4 h-4" />
                          View
                        </Button>
                        {job.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveJob(job)}
                            disabled={approvingJob === job.id}
                          >
                            {approvingJob === job.id ? (
                              <RefreshCw className="mr-1 w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="mr-1 w-4 h-4" />
                            )}
                            {approvingJob === job.id ? 'Approving...' : 'Approve'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredJobCards.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No job cards found</h3>
              <p className="mb-4 text-gray-500">
                {searchTerm || selectedFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "No job cards have been created for this client yet."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
