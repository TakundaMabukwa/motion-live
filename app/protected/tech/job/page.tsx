'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Package,
  Wrench,
  Settings,
  Eye,
  Edit,
  FileText,
  TrendingUp,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Shield,
  Car,
  Play,
  Camera,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { toast } from 'sonner';
import StartJobModal from '../components/StartJobModal';
import CreateRepairJobModal from '../components/CreateRepairJobModal';

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

export default function Jobs() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availability, setAvailability] = useState({
    isAvailable: true,
    todaysJobs: [],
    totalJobs: 0
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showStartJobModal, setShowStartJobModal] = useState(false);
  const [showCreateRepairJobModal, setShowCreateRepairJobModal] = useState(false);

  const itemsPerPage = 50;
  const pathname = usePathname();
  const router = useRouter();

  // Define fetchUserInfoAndJobs at component level so it can be called from handleJobStarted
    const fetchUserInfoAndJobs = async () => {
      try {
        setLoading(true);
        
        // First, get user info
        const userResponse = await fetch('/api/tech-user-info');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user info');
        }
        const userData = await userResponse.json();
        setUserInfo(userData);
        
        console.log('User info:', userData);
        
        // Then fetch jobs - load all jobs based on email address, except if user is admin where role is "tech"
        let jobsUrl = '/api/jobs?role=tech';
        if (!userData.isTechAdmin) {
          // Regular tech users see only their jobs by email
          jobsUrl += `&technician=${encodeURIComponent(userData.user.email)}`;
        }
        // Tech admins see all jobs where role is "tech"
        
        const jobsResponse = await fetch(jobsUrl);
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const jobsData = await jobsResponse.json();
        
        console.log('API Response:', jobsData);
        console.log('User jobs:', jobsData.quotes);
        console.log('Jobs URL:', jobsUrl);
        console.log('User data:', userData);
        // Transform the data to match the expected structure
        const transformedJobs = (jobsData.quotes || []).map(quote => ({
          ...quote,
          // Add a jobs array to maintain compatibility with existing code
          jobs: [{
            id: quote.id,
            date: quote.job_date,
            time: quote.start_time,
            technician: quote.technician_phone,
            product_name: quote.job_description || 'Job Service'
          }]
        }));
        
        setUserJobs(transformedJobs);
        
        // Calculate availability
        calculateAvailability(transformedJobs);
        
      } catch (error) {
        console.error('Error fetching user info and jobs:', error);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch user info and jobs
  useEffect(() => {
    fetchUserInfoAndJobs();
  }, []);

  // Calculate availability based on jobs
  const calculateAvailability = (jobs: Job[]) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const todaysJobs = jobs.filter(job => {
      if (!job.job_date) return false;
      const jobDate = job.job_date.split('T')[0];
      return jobDate === todayString;
    });

    setAvailability({
      isAvailable: todaysJobs.length < 5, // Available if less than 5 jobs today
      todaysJobs,
      totalJobs: jobs.length
    });
  };

  // Get job statistics
  const getJobStats = () => {
    const totalNew = userJobs.filter(job => job.job_status === 'created' && !job.technician_phone).length;
    const totalOpen = userJobs.filter(job => job.job_status === 'created' && job.technician_phone).length;
    const totalCompleted = userJobs.filter(job => job.job_status === 'completed').length;
    const totalRepair = userJobs.filter(job => job.repair === true).length;
    const serviceUpcoming = userJobs.filter(job => {
      if (!job.job_date) return false;
      const jobDate = new Date(job.job_date);
      const today = new Date();
      return jobDate >= today;
    }).length;

    return {
      totalNew,
      totalOpen,
      totalCompleted,
      totalRepair,
      serviceUpcoming
    };
  };

  // Get status color for badges
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

  const handleStartJob = (job: Job) => {
    console.log('🎯 Job clicked!');
    console.log('📋 Job details:', job);
    console.log('🆔 Job ID:', job.id);
    console.log('🔢 Job Number:', job.job_number);
    console.log('👤 Customer:', job.customer_name);
    console.log('🚗 Vehicle:', job.vehicle_registration);
    console.log('📝 Description:', job.job_description);
    console.log('📅 Date:', job.job_date);
    console.log('⏰ Start Time:', job.start_time);
    console.log('📊 Status:', job.job_status);
    console.log('🏷️ Job Type:', job.job_type);
    
    // Verify this job exists in our current jobs list by job_number (more reliable)
    const existingJob = userJobs.find(j => j.job_number === job.job_number);
    if (existingJob) {
      console.log('✅ Job verified in current jobs list');
      console.log('📊 Current job status:', existingJob.job_status);
      console.log('🔍 Verification method: job_number match');
      toast.success(`Job ${job.job_number} verified successfully!`);
        } else {
      console.log('⚠️ Job not found in current jobs list by job_number');
      // Fallback: try to find by ID
      const existingJobById = userJobs.find(j => j.id === job.id);
      if (existingJobById) {
        console.log('✅ Job found by ID instead');
        console.log('🔍 Verification method: ID match');
        toast.success(`Job ${job.job_number || job.id} verified by ID!`);
      } else {
        console.log('❌ Job not found by either job_number or ID');
        toast.error(`Job verification failed! Job not found in current list.`);
        return; // Don't proceed if job can't be verified
      }
    }
    
    // Show the exact job number for manual input testing
    if (job.job_number) {
      console.log('📋 COPY THIS JOB NUMBER FOR TESTING:', job.job_number);
      console.log('📋 COPY THIS JOB ID FOR TESTING:', job.id);
      toast.info(`Job Number: ${job.job_number} - Copy this for testing!`);
    }
    
    setSelectedJob(job);
    setShowStartJobModal(true);
  };

  const handleJobStarted = (jobData: Job) => {
    // Update the job in the local state
    setUserJobs(prev => prev.map(job => 
      job.id === jobData.id ? { ...job, ...jobData } : job
    ));
    
    toast.success(`Job ${jobData.job_number} started successfully! Status: Active`);
    setShowStartJobModal(false);
    
    // Refresh the jobs data
    fetchUserInfoAndJobs();
  };

  const handleCompleteRepairJob = async (job: Job) => {
    try {
      // Update job status to completed
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
        toast.success(`Repair job ${job.job_number} completed successfully!`);
        // Refresh the jobs data
        fetchUserInfoAndJobs();
      } else {
        throw new Error(`Failed to complete job: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing repair job:', error);
      toast.error(`Failed to complete repair job: ${error.message}`);
    }
  };

  const stats = getJobStats();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-3 text-slate-600">Loading jobs...</span>
        </div>
      </div>
    );
  }

  const JobTable = ({ jobs, showProgress = false }: { jobs: Job[], showProgress?: boolean }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job Type</th>
              <th className="p-4 font-medium text-slate-700 text-left">Customer</th>
              {/* <th className="p-4 font-medium text-slate-700 text-left">Products</th> */}
              {/* <th className="p-4 font-medium text-slate-700 text-left">Scheduled Date</th> */}
              <th className="p-4 font-medium text-slate-700 text-left">Status</th>
              <th className="p-4 font-medium text-slate-700 text-left">Photos</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-slate-500 text-center">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => {
                const jobPhotoCount = 0; // No photos to display here
                const isVerified = job.job_status === 'in_progress' || job.job_status === 'assigned' || job.job_status === 'completed';
                
                return (
                  <tr key={job.id || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getStatusColor(job.job_status)}>
                          {job.job_status === 'created' ? 'New' : job.job_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-900">{job.customer_name}</td>
                    <td className="p-4 text-slate-600">
                      {job.job_description || 'N/A'}
                    </td>
                    {/* <td className="p-4 text-slate-600">
                      {job.job_date && job.start_time 
                        ? `${job.job_date.split('T')[0]} at ${job.start_time.split('T')[1]?.split('.')[0] || 'No time'}`
                        : 'Not scheduled'
                      }
                    </td> */}
                    <td className="p-4">
                      <Badge variant="outline" className={getStatusColor(job.job_status)}>
                        {job.job_status === 'created' ? 'New' : job.job_status}
                      </Badge>
                    </td>
                    {/* <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {isVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartJob(job)}
                            className="flex items-center gap-1 hover:bg-blue-50 border-blue-200 text-blue-600"
                            disabled={false} // No photosLoading state
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td> */}
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {job.job_type === 'repair' && job.job_status === 'created' ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStartJob(job)}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Play className="w-4 h-4" />
                              Start Job
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
                            Complete Job
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStartJob(job)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="w-4 h-4" />
                            Start Job
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const OnHandTable = ({ jobs }: { jobs: any[] }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job Card</th>
              <th className="p-4 font-medium text-slate-700 text-left">Odo Reading</th>
              <th className="p-4 font-medium text-slate-700 text-left">Registration</th>
              <th className="p-4 font-medium text-slate-700 text-left">Opened</th>
              <th className="p-4 font-medium text-slate-700 text-left">Last Updated</th>
              <th className="p-4 font-medium text-slate-700 text-left">Description</th>
              <th className="p-4 font-medium text-slate-700 text-left">Technician</th>
              <th className="p-4 font-medium text-slate-700 text-left">Created By</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-slate-500 text-center">
                  No results
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr key={job.jobCard || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                  <td className="p-4 font-medium text-slate-900">{job.jobCard}</td>
                  <td className="p-4 text-slate-600">{job.odoReading}</td>
                  <td className="p-4 text-slate-600">{job.registration}</td>
                  <td className="p-4 text-slate-600">{job.opened}</td>
                  <td className="p-4 text-slate-600">{job.lastUpdated}</td>
                  <td className="p-4 text-slate-600">{job.description}</td>
                  <td className="p-4 text-slate-600">{job.technician}</td>
                  <td className="p-4 text-slate-600">{job.createdBy}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="mb-2 font-bold text-slate-900 text-2xl">My Jobs</h2>
              {userInfo && (
                <p className="text-slate-600">
                  {userInfo.isTechAdmin 
                    ? "Viewing all assigned jobs (Admin Access)" 
                    : `Viewing your assigned jobs (${userInfo.user.email})`
                  }
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowCreateRepairJobModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 w-4 h-4" />
              Create Repair Job
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="new">New Jobs</TabsTrigger>
            <TabsTrigger value="open">Open Jobs</TabsTrigger>
            <TabsTrigger value="repair">Repair Jobs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Today's Jobs
                    </CardTitle>
                    <Clock className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.serviceUpcoming}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Scheduled for today
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      New Jobs
                    </CardTitle>
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalNew}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Awaiting assignment
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Active Jobs
                    </CardTitle>
                    <Wrench className="w-4 h-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalOpen}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Currently assigned
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Completed
                    </CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalCompleted}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Successfully completed
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Repair Jobs
                    </CardTitle>
                    <Wrench className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalRepair}</div>
                    <p className="flex items-center mt-1 text-purple-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Total repair jobs
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* All Jobs Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All My Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'created' && !job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="open" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'created' && job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="repair" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Repair Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const filteredJobs = userJobs.filter(job => {
                      // Filter for repair jobs
                      if (job.repair !== true) return false;
                      
                      // Tech admins can see all repair jobs
                      if (userInfo?.isTechAdmin) return true;
                      
                      // Regular technicians can only see their own repair jobs
                      return job.technician_phone === userInfo?.user?.email;
                    });
                    
                    console.log('🔧 Repair Jobs Filtering:', {
                      totalJobs: userJobs.length,
                      repairJobs: userJobs.filter(job => job.repair === true).length,
                      filteredJobs: filteredJobs.length,
                      userEmail: userInfo?.user?.email,
                      isTechAdmin: userInfo?.isTechAdmin,
                      sampleJob: userJobs.find(job => job.repair === true)
                    });
                    
                    return <JobTable jobs={filteredJobs} />;
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'completed')} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

      {/* QR Code Scanner */}
      <StartJobModal
        isOpen={showStartJobModal}
        onClose={() => setShowStartJobModal(false)}
        job={selectedJob}
        userJobs={userJobs}
        onJobStarted={handleJobStarted}
        onJobCompleted={(jobData) => {
          // Handle job completion if needed
          toast.success(`Job ${jobData.job_number} completed successfully!`);
          setShowStartJobModal(false);
          fetchUserInfoAndJobs();
        }}
      />

      {/* Create Repair Job Modal */}
      <CreateRepairJobModal
        isOpen={showCreateRepairJobModal}
        onClose={() => setShowCreateRepairJobModal(false)}
        userInfo={userInfo}
        onJobCreated={(jobData) => {
          toast.success(`Repair job ${jobData.job_number} created successfully!`);
          setShowCreateRepairJobModal(false);
          fetchUserInfoAndJobs();
        }}
      />
    </div>
  );
}