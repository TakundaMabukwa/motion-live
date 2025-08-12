"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Edit,
  FileText,
  Package,
  BarChart3,
  Scale,
  User,
  Calendar,
  Clock,
  Tool,
} from "lucide-react";
import { PartsSelectionDialog } from "./parts-selection-dialogue";
import { PurchaseManagementDialog } from "./purchase-management-dialogue";
import { AccountsStockDialog } from "./account-stock-dialogue";
import { toast } from "sonner";

const tabs = [
  { key: "jobs", name: "Jobs", icon: FileText },
  {
    key: "serial-number-report",
    name: "Serial Number Report",
    icon: BarChart3,
  },
  {
    key: "goods-received-voucher",
    name: "Goods Received Voucher",
    icon: FileText,
  },
  { key: "stock-ledger", name: "Stock Ledger", icon: Package },
  { key: "stock-balance", name: "Stock Balance", icon: Scale },
];

export default function Jobs({ setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeJobTab, setActiveJobTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/jobs');
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      } else {
        setError(data.error || 'Failed to fetch jobs');
        toast.error(data.error || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to fetch jobs');
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(
    (job) =>
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.product_names?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getJobTypeBadge = (jobType) => {
    const isInstallation = jobType?.toLowerCase().includes('install');
    return (
      <Badge variant={isInstallation ? "default" : "secondary"}>
        {jobType || 'Unknown'}
      </Badge>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Jobs Management
        </h2>
        <PurchaseManagementDialog />
        <AccountsStockDialog />
        <p className="text-gray-600">
          Manage and track all your installation and de-installation jobs
        </p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeJobTab === tab.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Jobs List</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button 
                onClick={fetchJobs}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchJobs} variant="outline" className="mt-2">
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Job ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Job Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Vehicle
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Products
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {job.id?.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        {getJobTypeBadge(job.job_type)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs">
                        <div className="truncate" title={job.customer_name}>
                          {job.customer_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs">
                        <div className="truncate" title={job.vehicle_info}>
                          {job.vehicle_info || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium">
                            {job.total_products} product{job.total_products !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500 truncate" title={job.product_names}>
                            {job.product_names || 'No products'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedJob(job);
                              setPartsDialogOpen(true);
                            }}
                            disabled={job.products?.every(p => p.open === false)}
                          >
                            Assign Parts
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {jobs.length === 0 ? 'No jobs found.' : 'No jobs found matching your search criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parts Selection Dialog */}
      {selectedJob && (
        <PartsSelectionDialog
          isOpen={partsDialogOpen}
          onClose={() => {
            setPartsDialogOpen(false);
            setSelectedJob(null);
            fetchJobs(); // Refresh jobs after assignment
          }}
          job={selectedJob}
        />
      )}
    </div>
  );
}
