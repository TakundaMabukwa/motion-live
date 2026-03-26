'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { checkAuthSession, handleAuthError } from '@/lib/auth-session-utils';
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  Eye,
  Package,
  Play,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import StartJobModal from './components/StartJobModal';
import CreateRepairJobModal from './components/CreateRepairJobModal';
import NewStockNotification from './components/NewStockNotification';
import BootStock from './boot-stock/page';

interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  vehicle_registration: string;
  job_description: string;
  job_date: string;
  start_time: string;
  job_status: string;
  job_type: string;
  technician_phone: string;
  [key: string]: any;
}

interface UserInfo {
  user: {
    id: string;
    email: string;
    role: string;
  };
  isTechAdmin: boolean;
}

const sortJobsNewestFirst = <T extends { created_at?: string; job_date?: string; start_time?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const aDate = new Date(a.created_at || a.job_date || a.start_time || 0).getTime();
    const bDate = new Date(b.created_at || b.job_date || b.start_time || 0).getTime();
    return bDate - aDate;
  });

const isCompletedJob = (job: { job_status?: string; status?: string }) => {
  const jobStatus = String(job.job_status || '').toLowerCase();
  const status = String(job.status || '').toLowerCase();
  return jobStatus === 'completed' || status === 'completed';
};

export default function Dashboard() {
  const [userRole, setUserRole] = useState('technician');
  const [userEmail, setUserEmail] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showStartJobModal, setShowStartJobModal] = useState(false);
  const [showCreateRepairJobModal, setShowCreateRepairJobModal] = useState(false);
  const [activeJobsView, setActiveJobsView] = useState<'my-jobs' | 'available-jobs'>('my-jobs');
  const [movingJobId, setMovingJobId] = useState<string | null>(null);
  const [jobStats, setJobStats] = useState([
    { title: 'New Jobs', value: 0, change: '+0 today', color: 'bg-blue-500', icon: Plus },
    { title: 'Open Jobs', value: 0, change: '+0 since yesterday', color: 'bg-orange-500', icon: Clock },
    { title: 'Jobs Completed', value: 0, change: '+0 this week', color: 'bg-green-500', icon: CheckCircle },
    { title: 'Awaiting Parts', value: 0, change: '+0 since yesterday', color: 'bg-yellow-500', icon: AlertCircle }
  ]);

  const router = useRouter();

  const fetchUserInfoAndJobs = async () => {
    try {
      setLoading(true);
      
      const hasValidSession = await checkAuthSession(router);
      if (!hasValidSession) {
        return;
      }
      
      const userResponse = await fetch('/api/tech-user-info');
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      const userData = await userResponse.json();
      setUserInfo(userData);
      setUserRole(userData.user.role);
      setUserEmail(userData.user.email);
      
      let jobsUrl = '/api/jobs';
      const jobsResponse = await fetch(jobsUrl);
      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const jobsData = await jobsResponse.json();
      
      const transformedJobs = (jobsData.quotes || []).map(quote => ({
        ...quote,
        jobs: [{
          id: quote.id,
          date: quote.job_date,
          time: quote.start_time,
          technician: quote.technician_phone,
          product_name: quote.job_description || 'Job Service'
        }]
      }));

      const sortedJobs = sortJobsNewestFirst(transformedJobs);
      setUserJobs(sortedJobs);
      setJobs(sortedJobs);
      
      const newJobs = sortedJobs.filter(job => job.job_status === 'created' && !job.technician_phone).length;
      const openJobs = sortedJobs.filter(job => job.job_status === 'created' && job.technician_phone).length;
      const completedJobs = sortedJobs.filter(job => job.job_status === 'completed').length;
      const awaitingParts = sortedJobs.filter(job => job.job_status === 'awaiting_parts').length;

      setJobStats([
        { title: 'New Jobs', value: newJobs, change: `+${newJobs} today`, color: 'bg-blue-500', icon: Plus },
        { title: 'Open Jobs', value: openJobs, change: `+${openJobs} since yesterday`, color: 'bg-orange-500', icon: Clock },
        { title: 'Jobs Completed', value: completedJobs, change: `+${completedJobs} this week`, color: 'bg-green-500', icon: CheckCircle },
        { title: 'Awaiting Parts', value: awaitingParts, change: `+${awaitingParts} since yesterday`, color: 'bg-yellow-500', icon: AlertCircle }
      ]);
      
    } catch (error) {
      console.error('Error fetching user info and jobs:', error);
      const handled = await handleAuthError(error, router);
      if (!handled) {
        sonnerToast.error('Failed to load jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      const hasValidSession = await checkAuthSession(router);
      if (hasValidSession) {
        fetchUserInfoAndJobs();
      }
    };
    
    initializePage();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'created':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      const fullJobData = await response.json();
      
      sonnerToast.success(`Job ${job.job_number} loaded successfully!`);
      
      setSelectedJob(fullJobData);
      setShowStartJobModal(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      sonnerToast.error('Failed to load job details');
    }
  };

  const handleJobStarted = (jobData: Job) => {
    setUserJobs(prev => prev.map(job => 
      job.id === jobData.id ? { ...job, ...jobData } : job
    ));
    
    sonnerToast.success(`Job ${jobData.job_number} started successfully! Status: Active`);
    setShowStartJobModal(false);
    
    fetchUserInfoAndJobs();
  };

  const handleCompleteRepairJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_status: 'Completed',
          completion_date: new Date().toISOString(),
          end_time: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        sonnerToast.success(`Repair job ${job.job_number} completed successfully! Vehicle will be automatically added to vehicles table.`);
        fetchUserInfoAndJobs();
      } else {
        throw new Error(`Failed to complete job: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing repair job:', error);
      sonnerToast.error(`Failed to complete repair job: ${error.message}`);
    }
  };

  const handleAddVehicleToInventory = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}/add-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        sonnerToast.success(`Vehicle added to inventory successfully!`);
        fetchUserInfoAndJobs();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add vehicle: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding vehicle to inventory:', error);
      sonnerToast.error(`Failed to add vehicle to inventory: ${error.message}`);
    }
  };

  const handleMoveJob = async (job: Job, destination: string) => {
    if (!job?.id || !destination) return;

    setMovingJobId(job.id);
    const destinationLabel = destination === 'inv' ? 'Inventory' : 'Admin Awaiting Technician';
    const loadingToast = sonnerToast.loading(`Moving job to ${destinationLabel}...`);

    try {
      const payload =
        destination === 'inv'
          ? {
              role: 'inv',
              move_to: 'inv',
              status: 'pending',
              job_status: 'pending',
              completion_date: null,
              end_time: null,
            }
          : {
              role: 'admin',
              move_to: 'admin',
              status: 'admin_created',
              job_status: 'created',
              assigned_technician_id: null,
              technician_name: null,
              technician_phone: null,
            };

      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to move job to ${destinationLabel}`);
      }

      sonnerToast.dismiss(loadingToast);
      sonnerToast.success(`Job moved to ${destinationLabel}`);
      fetchUserInfoAndJobs();
    } catch (error) {
      console.error('Error moving technician job:', error);
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error(error instanceof Error ? error.message : `Failed to move job to ${destinationLabel}`);
    } finally {
      setMovingJobId(null);
    }
  };

  const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

  const splitCsv = (value: string | null | undefined) =>
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const getUserNameCandidates = () => {
    const prefix = (userEmail || '').split('@')[0] || '';
    const cleaned = prefix.replace(/[._-]/g, ' ');
    return [prefix, cleaned, ...cleaned.split(' ')].filter(Boolean).map(normalizeToken);
  };

  const isJobAssignedToCurrentUser = (job: Job) => {
    const emailTokens = splitCsv(job.technician_phone).map((token) => token.toLowerCase());
    const nameTokens = splitCsv(job.technician_name).map((token) => normalizeToken(token));

    const emailMatch = !!userEmail && emailTokens.includes(userEmail.toLowerCase());
    if (emailMatch) return true;

    const candidates = getUserNameCandidates();
    return candidates.some((candidate) => nameTokens.includes(candidate));
  };

  const parseQuotationProducts = (quotationProducts: unknown): Array<Record<string, unknown>> => {
    if (!quotationProducts) return [];
    if (Array.isArray(quotationProducts)) return quotationProducts as Array<Record<string, unknown>>;
    if (typeof quotationProducts === 'string') {
      try {
        const parsed = JSON.parse(quotationProducts);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parsePartsRequired = (partsRequired: unknown): Array<Record<string, unknown>> => {
    if (!partsRequired) return [];
    if (Array.isArray(partsRequired)) return partsRequired as Array<Record<string, unknown>>;
    if (typeof partsRequired === 'string') {
      try {
        const parsed = JSON.parse(partsRequired);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getQuotationProductItems = (job: Job) => {
    return parseQuotationProducts(job.quotation_products).map((item) => {
      const name = String(item.name || item.description || item.product_name || 'Item');
      const qty = Number(item.quantity || 1);
      return `${name}${qty > 1 ? ` x${qty}` : ''}`;
    });
  };

  const getPartsRequiredItems = (job: Job) => {
    return parsePartsRequired(job.parts_required).map((item) => {
      const name = String(item.description || item.name || item.code || 'Part');
      const qty = Number(item.quantity || 1);
      return `${name}${qty > 1 ? ` x${qty}` : ''}`;
    });
  };

  const getInstallSummary = (job: Job) => {
    const items = getQuotationProductItems(job);
    if (!items.length) return 'No quotation products';
    return items.length > 3 ? `${items.slice(0, 3).join(', ')} +${items.length - 3} more` : items.join(', ');
  };

  const getAssignedPartsSummary = (job: Job) => {
    const items = getPartsRequiredItems(job);
    if (!items.length) return 'No parts assigned';
    return items.length > 3 ? `${items.slice(0, 3).join(', ')} +${items.length - 3} more` : items.join(', ');
  };

  const formatSchedule = (job: Job) => {
    const source = job.start_time || job.job_date || job.created_at;
    if (!source) return 'N/A';
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  const activeUserJobs = userJobs.filter((job) => !isCompletedJob(job));
  const myJobs = activeUserJobs.filter((job) => isJobAssignedToCurrentUser(job));
  const availableJobs = activeUserJobs.filter((job) => !isJobAssignedToCurrentUser(job));
  const displayedJobs = activeJobsView === 'my-jobs' ? myJobs : availableJobs;

  const JobTable = ({ jobs }: { jobs: Job[] }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Mobile Card View */}
      <div className="block sm:hidden">
        {jobs.length === 0 ? (
          <div className="py-12 text-slate-500 text-center">
            No jobs found
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {jobs.map((job, index) => (
              <div key={job.id || index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-base truncate">{job.job_number || 'No Job #'}</h3>
                    <p className="text-slate-600 text-sm mt-1">{job.customer_name || 'No customer'}</p>
                    <p className="text-slate-500 text-sm mt-1">Reg: {job.vehicle_registration || 'N/A'}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(job.job_status)} text-xs ml-2 shrink-0`}>
                    {job.job_status === 'created' ? 'New' : job.job_status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Quotation Products</p>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">{getInstallSummary(job)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Parts Required</p>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">{getAssignedPartsSummary(job)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  {job.job_type === 'repair' && job.job_status === 'created' ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleStartJob(job)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-10 rounded-lg"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start Job
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleCompleteRepairJob(job)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ) : job.job_type === 'repair' && job.job_status === 'Active' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleCompleteRepairJob(job)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete Job
                    </Button>
                  ) : job.job_status === 'Completed' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleAddVehicleToInventory(job)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm h-10 rounded-lg"
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Add to Vehicles
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleStartJob(job)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-10 rounded-lg"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start Job
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job #</th>
              <th className="p-4 font-medium text-slate-700 text-left">Reg</th>
              <th className="p-4 font-medium text-slate-700 text-left">Customer</th>
              <th className="p-4 font-medium text-slate-700 text-left">Quotation Products</th>
              <th className="p-4 font-medium text-slate-700 text-left">Parts Required</th>
              <th className="p-4 font-medium text-slate-700 text-left">Schedule</th>
              <th className="p-4 font-medium text-slate-700 text-left">Status</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-slate-500 text-center">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr key={job.id || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{job.job_number || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-slate-700">
                    {job.vehicle_registration || 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{job.customer_name || 'N/A'}</div>
                    <div className="text-slate-600 text-xs">{job.job_description || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[280px] rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs text-slate-700">
                      {getInstallSummary(job)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[280px] rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs text-slate-700">
                      {getAssignedPartsSummary(job)}
                    </div>
                  </td>
                  <td className="p-4 text-slate-700 text-sm">
                    {formatSchedule(job)}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getStatusColor(job.job_status)}>
                      {job.job_status === 'created' ? 'New' : job.job_status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Select
                        disabled={movingJobId === job.id}
                        onValueChange={(value) => handleMoveJob(job, value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder={movingJobId === job.id ? 'Moving...' : 'Move to'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inv">Inventory</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {job.job_type === 'repair' && job.job_status === 'created' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStartJob(job)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCompleteRepairJob(job)}
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </Button>
                        </>
                      ) : job.job_type === 'repair' && job.job_status === 'Active' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCompleteRepairJob(job)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </Button>
                      ) : job.job_status === 'Completed' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddVehicleToInventory(job)}
                          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Package className="w-4 h-4" />
                          Add Vehicle
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartJob(job)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="font-bold text-gray-900 text-3xl mb-2">Technician Dashboard</h1>
          <p className="text-gray-600">Welcome to your technician portal</p>
        </div>
        {/* Job Statistics */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                  <div className="bg-slate-200 rounded w-20 h-4 animate-pulse"></div>
                  <div className="bg-slate-200 p-2 rounded-full animate-pulse">
                    <div className="w-4 h-4"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-200 mb-2 rounded w-16 h-8 animate-pulse"></div>
                  <div className="bg-slate-200 rounded w-24 h-3 animate-pulse"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            jobStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-full ${stat.color}`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stat.value}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* All Jobs Table */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-2xl font-bold tracking-tight">Jobs</CardTitle>
              <div className="bg-slate-100 p-1 rounded-xl w-full sm:w-fit grid grid-cols-2 sm:flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveJobsView('my-jobs')}
                  className={`h-10 rounded-lg px-4 text-sm font-medium transition-all ${
                    activeJobsView === 'my-jobs'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Jobs ({myJobs.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveJobsView('available-jobs')}
                  className={`h-10 rounded-lg px-4 text-sm font-medium transition-all ${
                    activeJobsView === 'available-jobs'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Available Jobs ({availableJobs.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JobTable jobs={displayedJobs} />
          </CardContent>
        </Card>

      {/* Modals */}
      {selectedJob && (
        <StartJobModal
          isOpen={showStartJobModal}
          onClose={() => setShowStartJobModal(false)}
          job={selectedJob}
          userJobs={userJobs}
          onJobStarted={handleJobStarted}
          onJobCompleted={(jobData) => {
            sonnerToast.success(`Job ${jobData.job_number} completed successfully!`);
            setShowStartJobModal(false);
            fetchUserInfoAndJobs();
          }}
        />
      )}

      <CreateRepairJobModal
        isOpen={showCreateRepairJobModal}
        onClose={() => setShowCreateRepairJobModal(false)}
        userInfo={userInfo}
        onJobCreated={(jobData) => {
          sonnerToast.success(`Repair job ${jobData.job_number} created successfully!`);
          setShowCreateRepairJobModal(false);
          fetchUserInfoAndJobs();
        }}
      />

      {/* New Stock Notification */}
      <NewStockNotification userEmail={userEmail} />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
    </div >
  );
}
