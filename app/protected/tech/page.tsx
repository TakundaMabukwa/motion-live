'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Camera,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Eye,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Car,
  DollarSign,
  Tag,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Checkmark from '@/components/checkmark';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'react-hot-toast';

export default function Dashboard() {
  const [userRole, setUserRole] = useState('technician');
  const [userEmail, setUserEmail] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState([
    { title: 'New Jobs', value: 0, change: '+0 today', color: 'bg-blue-500', icon: Plus },
    { title: 'Open Jobs', value: 0, change: '+0 since yesterday', color: 'bg-orange-500', icon: Clock },
    { title: 'Jobs Completed', value: 0, change: '+0 this week', color: 'bg-green-500', icon: CheckCircle },
    { title: 'Awaiting Parts', value: 0, change: '+0 since yesterday', color: 'bg-yellow-500', icon: AlertCircle }
  ]);
  
  const router = useRouter();
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [showJobInfoModal, setShowJobInfoModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch user data and jobs on component mount
  useEffect(() => {
    const fetchUserAndJobs = async () => {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Authentication error:', authError);
          setLoading(false);
          return;
        }
        
        if (user) {
          // Fetch jobs from our API
          const response = await fetch('/api/technicians/jobs');
          if (response.ok) {
            const data = await response.json();
            setJobs(data.jobs || []);
            setUserRole(data.userRole);
            setUserEmail(data.userEmail);
            
            // Update job stats based on real data
            const newJobs = data.jobs.filter(job => job.status === 'New' || job.job_status === 'New').length;
            const openJobs = data.jobs.filter(job => 
              job.status === 'In Progress' || 
              job.job_status === 'In Progress' || 
              job.status === 'Pending' || 
              job.job_status === 'Pending'
            ).length;
            const completedJobs = data.jobs.filter(job => 
              job.status === 'Completed' || 
              job.job_status === 'Completed'
            ).length;
            const awaitingParts = data.jobs.filter(job => 
              job.status === 'Awaiting Parts' || 
              job.job_status === 'Awaiting Parts'
            ).length;

            setJobStats([
              { title: 'New Jobs', value: newJobs, change: `+${newJobs} today`, color: 'bg-blue-500', icon: Plus },
              { title: 'Open Jobs', value: openJobs, change: `+${openJobs} since yesterday`, color: 'bg-orange-500', icon: Clock },
              { title: 'Jobs Completed', value: completedJobs, change: `+${completedJobs} this week`, color: 'bg-green-500', icon: CheckCircle },
              { title: 'Awaiting Parts', value: awaitingParts, change: `+${awaitingParts} since yesterday`, color: 'bg-yellow-500', icon: AlertCircle }
            ]);
          } else {
            console.error('Failed to fetch jobs:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error details:', errorData);
            toast.error('Failed to fetch jobs');
          }
        } else {
          console.error('No authenticated user found');
          toast.error('Authentication failed');
        }
      } catch (error) {
        console.error('Error fetching user and jobs:', error);
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndJobs();
  }, []);

  const handleInputChange = (e) => {
    // Function removed - no longer needed
  };

  const handleImageUpload = (files) => {
    // Function removed - no longer needed
  };

  const removeImage = (id) => {
    // Function removed - no longer needed
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Function removed - no longer needed
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Function removed - no longer needed
  };

  const isVehicleInfoComplete = () => {
    return false; // No form data to check
  };

  const isCustomerInfoComplete = () => {
    return false; // No form data to check
  };

  const areImagesUploaded = () => {
    return false; // No images state
  };

  const handleNextStep = () => {
    // Function removed - no longer needed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Function removed - no longer needed
      toast.success('Repair job functionality removed');
      
    } catch (error) {
      toast.error('Failed to create repair job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewJobDetails = (job) => {
    setSelectedJob(job);
    setShowJobInfoModal(true);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Job Statistics */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {loading ? (
            // Loading skeleton for job stats
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

        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">Role:</span>
                  <div className="bg-slate-200 rounded w-20 h-5 animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">Email:</span>
                  <div className="bg-slate-200 rounded w-32 h-5 animate-pulse"></div>
                </div>
                <div className="bg-slate-200 rounded w-48 h-3 animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">Role:</span>
                  <Badge variant={userRole === 'tech_admin' ? 'default' : 'secondary'}>
                    {userRole === 'tech_admin' ? 'Tech Admin' : 'Technician'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">Email:</span>
                  <span className="text-slate-600 text-sm">{userEmail || 'N/A'}</span>
                </div>
                {userRole === 'technician' && (
                  <div className="text-slate-500 text-xs">
                    Showing jobs assigned to your email address
                  </div>
                )}
                {userRole === 'tech_admin' && (
                  <div className="text-slate-500 text-xs">
                    Showing all jobs in the system
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Recent Jobs
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setLoading(true);
                      // Re-fetch data
                      const fetchUserAndJobs = async () => {
                        try {
                          const supabase = createClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const response = await fetch('/api/technicians/jobs');
                            if (response.ok) {
                              const data = await response.json();
                              setJobs(data.jobs || []);
                              setUserRole(data.userRole);
                              setUserEmail(data.userEmail);
                              
                              // Update job stats
                              const newJobs = data.jobs.filter(job => job.status === 'New' || job.job_status === 'New').length;
                              const openJobs = data.jobs.filter(job => 
                                job.status === 'In Progress' || 
                                job.job_status === 'In Progress' || 
                                job.status === 'Pending' || 
                                job.job_status === 'Pending'
                              ).length;
                              const completedJobs = data.jobs.filter(job => 
                                job.status === 'Completed' || 
                                job.job_status === 'Completed'
                              ).length;
                              const awaitingParts = data.jobs.filter(job => 
                                job.status === 'Awaiting Parts' || 
                                job.job_status === 'Awaiting Parts'
                              ).length;

                                                          setJobStats([
                { title: 'New Jobs', value: newJobs, change: `+${newJobs} today`, color: 'bg-blue-500', icon: Plus },
                { title: 'Open Jobs', value: openJobs, change: `+${openJobs} since yesterday`, color: 'bg-orange-500', icon: Clock },
                { title: 'Jobs Completed', value: completedJobs, change: `+${completedJobs} this week`, color: 'bg-green-500', icon: CheckCircle },
                { title: 'Awaiting Parts', value: awaitingParts, change: `+${awaitingParts} since yesterday`, color: 'bg-yellow-500', icon: AlertCircle }
              ]);
              
              toast.success(`Loaded ${data.jobs.length} jobs successfully`);
                            } else {
                              toast.error('Failed to refresh jobs');
                            }
                          }
                        } catch (error) {
                          console.error('Error refreshing data:', error);
                          toast.error('Error refreshing data');
                        } finally {
                          setLoading(false);
                        }
                      };
                      fetchUserAndJobs();
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowJobInfoModal(true)}>
                    <Eye className="mr-2 w-4 h-4" />
                    View All Job Info
                  </Button>
                  <Button size="sm" onClick={() => setShowRepairForm(true)}>
                    <Plus className="mr-2 w-4 h-4" />
                    New Repair Job
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-slate-500 text-center">No recent jobs found.</p>
                ) : (
                  <>
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex justify-between items-center hover:bg-slate-50 p-4 border border-slate-200 rounded-lg transition-colors">
                        <div className="flex items-center space-x-4">
                          <Badge variant={
                            (job.status === 'Completed' || job.job_status === 'Completed') ? 'default' :
                            (job.status === 'In Progress' || job.job_status === 'In Progress') ? 'secondary' :
                            (job.status === 'Pending' || job.job_status === 'Pending') ? 'outline' : 'secondary'
                          }>
                            {job.status || job.job_status || 'New'}
                          </Badge>
                          <div>
                            <p className="font-medium text-slate-900">{job.job_number || job.id}</p>
                            <p className="text-slate-500 text-sm">{job.customer_name || 'N/A'}</p>
                            <p className="text-slate-400 text-xs">{job.job_type || 'N/A'} • {job.priority || 'Medium'} Priority</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-900 text-sm">{job.vehicle_registration || 'No Vehicle'}</p>
                          <p className="text-slate-500 text-xs">Due: {job.due_date ? new Date(job.due_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleViewJobDetails(job)}
                            className="text-xs"
                          >
                            <Eye className="mr-1 w-3 h-3" />
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                    {jobs.length > 5 && (
                      <div className="pt-2 text-center">
                        <Button variant="outline" size="sm" onClick={() => router.push('/protected/tech/job')}>
                          View All {jobs.length} Jobs
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Process Flow Overview */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Job Process Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="flex justify-center items-center bg-blue-500 mb-2 rounded-full w-12 h-12 font-semibold text-white">1</div>
                <p className="font-medium text-sm">Job Created</p>
                <p className="text-slate-500 text-xs">New jobs from helpdesk</p>
              </div>
              <div className="flex-1 bg-slate-200 mx-4 h-0.5"></div>
              <div className="text-center">
                <div className="flex justify-center items-center bg-orange-500 mb-2 rounded-full w-12 h-12 font-semibold text-white">2</div>
                <p className="font-medium text-sm">Assigned</p>
                <p className="text-slate-500 text-xs">Technician assigned</p>
              </div>
              <div className="flex-1 bg-slate-200 mx-4 h-0.5"></div>
              <div className="text-center">
                <div className="flex justify-center items-center bg-yellow-500 mb-2 rounded-full w-12 h-12 font-semibold text-white">3</div>
                <p className="font-medium text-sm">In Progress</p>
                <p className="text-slate-500 text-xs">Install/Repair/De-install</p>
              </div>
              <div className="flex-1 bg-slate-200 mx-4 h-0.5"></div>
              <div className="text-center">
                <div className="flex justify-center items-center bg-green-500 mb-2 rounded-full w-12 h-12 font-semibold text-white">4</div>
                <p className="font-medium text-sm">Completed</p>
                <p className="text-slate-500 text-xs">Job card to helpdesk</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </main>

      {/* Repair Job Form Modal */}
      {showRepairForm && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-xl">New Repair Job</h2>
              <button
                onClick={() => {
                  setShowRepairForm(false);
                  // setCurrentStep(1); // No currentStep state
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-gray-500">Repair job functionality has been removed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Job View Modal */}
      {selectedJob && !showJobInfoModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-xl">Job Details: {selectedJob.job_number || selectedJob.id}</h2>
              <button onClick={() => setSelectedJob(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                {/* Basic Job Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Basic Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Job Number:</span>
                      <span className="text-slate-900">{selectedJob.job_number || selectedJob.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Job Type:</span>
                      <span className="text-slate-900">{selectedJob.job_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Status:</span>
                      <Badge variant={
                        (selectedJob.status === 'Completed' || selectedJob.job_status === 'Completed') ? 'default' :
                        (selectedJob.status === 'In Progress' || selectedJob.job_status === 'In Progress') ? 'secondary' :
                        (selectedJob.status === 'Pending' || selectedJob.job_status === 'Pending') ? 'outline' : 'secondary'
                      }>
                        {selectedJob.status || selectedJob.job_status || 'New'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Priority:</span>
                      <span className="text-slate-900">{selectedJob.priority || 'Medium'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Description:</span>
                      <span className="text-slate-900">{selectedJob.job_description || 'No description'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Customer Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Name:</span>
                      <span className="text-slate-900">{selectedJob.customer_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Email:</span>
                      <span className="text-slate-900">{selectedJob.customer_email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Phone:</span>
                      <span className="text-slate-900">{selectedJob.customer_phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Address:</span>
                      <span className="text-slate-900">{selectedJob.customer_address || selectedJob.job_location || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="w-5 h-5" />
                      <span>Vehicle Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Registration:</span>
                      <span className="text-slate-900">{selectedJob.vehicle_registration || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Make/Model:</span>
                      <span className="text-slate-900">{selectedJob.vehicle_make || 'N/A'} {selectedJob.vehicle_model || ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">VIN:</span>
                      <span className="text-slate-900">{selectedJob.vin_numer || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Year:</span>
                      <span className="text-slate-900">{selectedJob.vehicle_year || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Financial Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Estimated Cost:</span>
                      <span className="text-slate-900">{selectedJob.estimated_cost || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Quotation Total:</span>
                      <span className="text-slate-900">{selectedJob.quotation_total_amount || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Actual Cost:</span>
                      <span className="text-slate-900">{selectedJob.actual_cost || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-600">Subtotal:</span>
                      <span className="text-slate-900">{selectedJob.quotation_subtotal || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Information */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Timeline Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                      <div className="text-center">
                        <div className="font-medium text-slate-600 text-sm">Created</div>
                        <div className="text-slate-900">{selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-slate-600 text-sm">Due Date</div>
                        <div className="text-slate-900">{selectedJob.due_date ? new Date(selectedJob.due_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-slate-600 text-sm">Started</div>
                        <div className="text-slate-900">{selectedJob.start_time ? new Date(selectedJob.start_time).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-slate-600 text-sm">Completed</div>
                        <div className="text-slate-900">{selectedJob.completion_date ? new Date(selectedJob.completion_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Tag className="w-5 h-5" />
                      <span>Additional Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <div>
                        <div className="mb-2 font-medium text-slate-600 text-sm">Technician Assignment</div>
                        <div className="text-slate-900">{selectedJob.technician_name || selectedJob.technician_phone || 'Unassigned'}</div>
                      </div>
                      <div>
                        <div className="mb-2 font-medium text-slate-600 text-sm">IP Address</div>
                        <div className="text-slate-900">{selectedJob.ip_address || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="mb-2 font-medium text-slate-600 text-sm">QR Code</div>
                        <div className="text-slate-900">{selectedJob.qr_code || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="mb-2 font-medium text-slate-600 text-sm">Special Instructions</div>
                        <div className="text-slate-900">{selectedJob.special_instructions || 'None'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedJob(null);
                    setShowJobInfoModal(true);
                  }}
                >
                  <Eye className="mr-2 w-4 h-4" />
                  View All Jobs
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedJob(null);
                    setShowRepairForm(true);
                  }}
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Start This Job
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Comprehensive Job Info Modal */}
      {showJobInfoModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-xl">All Job Information</h2>
              <button onClick={() => setShowJobInfoModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-slate-500 text-center">No jobs found.</p>
              ) : (
                <div className="space-y-6">
                  {/* Job Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="mb-2 font-medium text-blue-900">Job Summary</h3>
                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-700">Total Jobs:</span>
                        <div className="text-blue-600">{jobs.length}</div>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Your Role:</span>
                        <div className="text-blue-600">{userRole === 'tech_admin' ? 'Tech Admin' : 'Technician'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Your Email:</span>
                        <div className="text-blue-600">{userEmail}</div>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Last Updated:</span>
                        <div className="text-blue-600">{new Date().toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* All Jobs Table */}
                  <div className="overflow-x-auto">
                    <table className="border border-slate-200 w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Job Details</th>
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Customer Info</th>
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Vehicle Info</th>
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Financial</th>
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Timeline</th>
                          <th className="p-3 border border-slate-200 font-medium text-slate-700 text-sm text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-1">
                                <div className="font-medium text-slate-900">
                                  {job.job_number || job.id}
                                </div>
                                <Badge variant={
                                  (job.status === 'Completed' || job.job_status === 'Completed') ? 'default' :
                                  (job.status === 'In Progress' || job.job_status === 'In Progress') ? 'secondary' :
                                  (job.status === 'Pending' || job.job_status === 'Pending') ? 'outline' : 'secondary'
                                }>
                                  {job.status || job.job_status || 'New'}
                                </Badge>
                                <div className="text-slate-600 text-xs">
                                  <div><Tag className="inline mr-1 w-3 h-3" />{job.job_type || 'N/A'}</div>
                                  <div><FileText className="inline mr-1 w-3 h-3" />{job.job_description || 'No description'}</div>
                                  <div><User className="inline mr-1 w-3 h-3" />{job.technician_name || job.technician_phone || 'Unassigned'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-slate-900">{job.customer_name || 'N/A'}</div>
                                <div className="text-slate-600">
                                  <div><Mail className="inline mr-1 w-3 h-3" />{job.customer_email || 'N/A'}</div>
                                  <div><Phone className="inline mr-1 w-3 h-3" />{job.customer_phone || 'N/A'}</div>
                                  <div><MapPin className="inline mr-1 w-3 h-3" />{job.customer_address || job.job_location || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-slate-900">{job.vehicle_registration || 'No Registration'}</div>
                                <div className="text-slate-600">
                                  <div><Car className="inline mr-1 w-3 h-3" />{job.vehicle_make || 'N/A'} {job.vehicle_model || ''}</div>
                                  <div><Tag className="inline mr-1 w-3 h-3" />VIN: {job.vin_numer || 'N/A'}</div>
                                  <div><Calendar className="inline mr-1 w-3 h-3" />Year: {job.vehicle_year || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-1 text-sm">
                                <div className="font-medium text-slate-900">
                                  <DollarSign className="inline mr-1 w-3 h-3" />
                                  {job.estimated_cost || job.quotation_total_amount || job.actual_cost || 'N/A'}
                                </div>
                                <div className="text-slate-600">
                                  <div>Est: {job.estimated_cost || 'N/A'}</div>
                                  <div>Quote: {job.quotation_total_amount || 'N/A'}</div>
                                  <div>Actual: {job.actual_cost || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-1 text-sm">
                                <div className="text-slate-600">
                                  <div><Calendar className="inline mr-1 w-3 h-3" />Created: {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</div>
                                  <div><Clock className="inline mr-1 w-3 h-3" />Due: {job.due_date ? new Date(job.due_date).toLocaleDateString() : 'N/A'}</div>
                                  <div><Clock className="inline mr-1 w-3 h-3" />Started: {job.start_time ? new Date(job.start_time).toLocaleDateString() : 'N/A'}</div>
                                  <div><Clock className="inline mr-1 w-3 h-3" />Completed: {job.completion_date ? new Date(job.completion_date).toLocaleDateString() : 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200">
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleViewJobDetails(job)}
                                  className="w-full text-xs"
                                >
                                  <Eye className="mr-1 w-3 h-3" />
                                  View Details
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setShowJobInfoModal(false);
                                    setShowRepairForm(true);
                                  }}
                                  className="w-full text-xs"
                                >
                                  <Plus className="mr-1 w-3 h-3" />
                                  Start Job
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}