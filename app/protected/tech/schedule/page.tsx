'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarIcon,
  Clock,
  MapPin,
  User,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  RefreshCw,
  Package,
  Phone,
  Mail,
  Calendar,
  XCircle,
  Car,
  Play
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { toast } from 'sonner';
import VinScanner from '../components/VinScanner';
import { JobDetailsPopup } from '@/components/ui/JobDetailsPopup';
import { QRCodeScanner } from '@/components/ui/QRCodeScanner';
import { VehicleDetailsPopup } from '@/components/ui/VehicleDetailsPopup';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TechSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [teamAvailability, setTeamAvailability] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<any>(null);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [showTechnicianCalendar, setShowTechnicianCalendar] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);

  const pathname = usePathname();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
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
      
      // Then fetch jobs - load all jobs based on tech_admin status
      let jobsUrl = '/api/jobs?role=tech';
      if (!userData.isTechAdmin) {
        // Regular tech users see only their jobs by email
        jobsUrl += `&technician=${encodeURIComponent(userData.user.email)}`;
      }
      // Tech admins see all jobs where role is "tech"
      
      console.log('Fetching tech jobs for calendar...');
      const jobsResponse = await fetch(jobsUrl);
      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await jobsResponse.json();
      console.log('API Response:', data);
      console.log('Fetched tech jobs:', data.quotes);
      console.log('Jobs URL:', jobsUrl);
      console.log('User data:', userData);
      
      // Group jobs by date
      const jobsByDate = {};
      const technicianJobs = {}; // Track all jobs for each technician
      
      data.quotes?.forEach(quote => {
        // Each quote is actually a job_card record
        if (quote.job_date && quote.technician_phone) {
          const dateKey = quote.job_date.split('T')[0]; // Extract date part from timestamp
          if (!jobsByDate[dateKey]) {
            jobsByDate[dateKey] = [];
          }
          
          const jobData = {
            id: quote.id,
            jobNumber: quote.job_number,
            customerName: quote.customer_name,
            customerEmail: quote.customer_email,
            customerPhone: quote.customer_phone,
            customerAddress: quote.customer_address,
            productName: quote.job_description || 'Job Service',
            quantity: 1,
            technician: quote.technician_phone, // This contains the email
            time: quote.start_time ? quote.start_time.split('T')[1]?.split('.')[0] : 'No time set',
            date: dateKey,
            jobType: quote.job_type,
            totalAmount: quote.estimated_cost || quote.quotation_total_amount || 0,
            subtotal: quote.estimated_cost || quote.quotation_total_amount || 0,
            status: quote.status,
            priority: quote.priority,
            jobStatus: quote.job_status
          };
          
          jobsByDate[dateKey].push(jobData);
          
          // Track technician jobs for availability
          if (!technicianJobs[quote.technician_phone]) {
            technicianJobs[quote.technician_phone] = [];
          }
          technicianJobs[quote.technician_phone].push(jobData);
        }
      });
      
      console.log('Jobs grouped by date:', jobsByDate);
      setJobs(jobsByDate);
      
      // Calculate team availability
      calculateTeamAvailability(technicianJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamAvailability = (technicianJobs) => {
    const availability = {};
    
    Object.keys(technicianJobs).forEach(technicianEmail => {
      const jobs = technicianJobs[technicianEmail];
      const now = currentTime;
      
      // Check if technician is currently busy
      const isCurrentlyBusy = jobs.some(job => {
        const jobDate = new Date(job.date + 'T' + job.time);
        const jobEndTime = new Date(jobDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour jobs
        
        return now >= jobDate && now <= jobEndTime;
      });
      
      // Get today's jobs
      const today = now.toISOString().split('T')[0];
      const todaysJobs = jobs.filter(job => job.date === today);
      
      availability[technicianEmail] = {
        isAvailable: !isCurrentlyBusy,
        todaysJobs: todaysJobs,
        totalJobs: jobs.length
      };
    });
    
    console.log('Team availability updated:', availability);
    setTeamAvailability(availability);
  };

  useEffect(() => {
    fetchJobs();
    // Set today as selected date
    const today = new Date();
    const dateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    setSelectedDate(dateKey);
  }, []);

  // Recalculate availability when current time changes or jobs change
  useEffect(() => {
    if (Object.keys(jobs).length > 0) {
      const technicianJobs = {};
      Object.values(jobs).flat().forEach(job => {
        if (!technicianJobs[job.technician]) {
          technicianJobs[job.technician] = [];
        }
        technicianJobs[job.technician].push(job);
      });
      console.log('Recalculating availability for technicians:', Object.keys(technicianJobs));
      calculateTeamAvailability(technicianJobs);
    }
  }, [currentTime, jobs]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day) => {
    if (day) {
      const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
      setSelectedDate(dateKey);
    }
  };

  const getEventsForDate = (day) => {
    if (!day) return [];
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    return jobs[dateKey] || [];
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setJobDetailsOpen(true);
  };

  const handleTechnicianClick = (technicianEmail, availability) => {
    setSelectedTechnician({ email: technicianEmail, ...availability });
    setShowTechnicianCalendar(true);
  };

  const handleVinScan = (job) => {
    setSelectedJob(job);
    setShowVinScanner(true);
  };

  const handleStartJob = (job: any) => {
    setSelectedJob(job);
    setShowQRScanner(true);
  };

  const handleJobVerified = async (jobData: any) => {
    // Job number verified, now check for vehicle details
    try {
      // Check if vehicle exists in vehicles_ip table
      const response = await fetch(`/api/vehicles-ip?registration=${selectedJob?.vehicle_registration || ''}&vin=${selectedJob?.vin_number || ''}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.vehicles && data.vehicles.length > 0) {
          // Vehicle exists, proceed with VIN scanning
          setCurrentVehicle(data.vehicles[0]);
          console.log('Vehicle found:', data.vehicles[0]);
          // You can add VIN scanning logic here
        } else {
          // Vehicle not found, show vehicle details popup
          setShowVehicleDetails(true);
        }
      } else {
        // Error checking vehicle, show vehicle details popup
        setShowVehicleDetails(true);
      }
    } catch (error) {
      console.error('Error checking vehicle:', error);
      setShowVehicleDetails(true);
    }
  };

  const handleVehicleAdded = (vehicleData: any) => {
    setCurrentVehicle(vehicleData);
    console.log('Vehicle added:', vehicleData);
    // You can add VIN scanning logic here
  };

  const handleVehicleFound = (vehicle) => {
    setSelectedVehicle(vehicle);
    toast.success(`Vehicle ${vehicle.registration_number} selected for job`);
    // Here you can add logic to associate the vehicle with the job
    console.log('Vehicle selected for job:', { job: selectedJob, vehicle });
  };

  const handleCloseVinScanner = () => {
    setShowVinScanner(false);
    setSelectedJob(null);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-3 text-slate-600">Loading schedule...</span>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const selectedEvents = jobs[selectedDate] || [];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="mb-2 font-bold text-slate-900 text-2xl">Schedule</h2>
          <p className="text-slate-600">Manage your daily schedule and job assignments</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="text-slate-600"
            >
              Today
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="min-w-[120px] font-medium text-slate-900 text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          {/* Calendar Section - Left Side */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="font-bold text-2xl">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth(-1)}
                      className="p-0 w-8 h-8"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth(1)}
                      className="p-0 w-8 h-8"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Days of week header */}
                <div className="gap-0 grid grid-cols-7 mb-2">
                  {DAYS.map(day => (
                    <div key={day} className="p-3 border-b font-medium text-gray-500 text-sm text-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="gap-0 grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
                  {days.map((day, index) => {
                    const events = getEventsForDate(day);
                    const dateKey = day ? formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                    const isSelected = dateKey === selectedDate;

                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[100px] p-2 border border-gray-100 cursor-pointer transition-colors
                          ${day ? 'hover:bg-gray-50' : 'bg-gray-25'}
                          ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
                        `}
                        onClick={() => handleDateClick(day)}
                      >
                        {day && (
                          <>
                            <div className="mb-1 font-medium text-gray-900">
                              {day}
                            </div>
                            <div className="space-y-1">
                              {events.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className="bg-blue-100 hover:bg-blue-200 p-1 rounded text-blue-800 text-xs cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJobClick(event);
                                  }}
                                >
                                  <div className="font-medium truncate">
                                    {event.customerName}
                                  </div>
                                  <div className="text-blue-600">
                                    {event.time}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Team Availability and Job Cards */}
          <div className="space-y-6 lg:col-span-1">
            {/* Team Availability Section */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Team Availability
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchJobs}
                    className="p-1 w-8 h-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.keys(teamAvailability).length === 0 ? (
                    <p className="text-gray-500 text-sm">No technicians assigned to jobs</p>
                  ) : (
                    Object.entries(teamAvailability).map(([technicianEmail, availability]) => (
                      <div 
                        key={technicianEmail} 
                        className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors cursor-pointer"
                        onClick={() => handleTechnicianClick(technicianEmail, availability)}
                      >
                        <div className="flex items-center gap-2">
                          {availability.isAvailable ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {technicianEmail.split('@')[0]}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {availability.todaysJobs.length} job(s) today
                            </p>
                          </div>
                        </div>
                        <Badge variant={availability.isAvailable ? "default" : "secondary"}>
                          {availability.isAvailable ? "Available" : "Busy"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-gray-500 text-xs">
                    Last updated: {currentTime.toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Jobs */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Jobs for {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No jobs scheduled for this date</p>
                  ) : (
                    selectedEvents.map((event, index) => (
                      <div
                        key={index}
                        className="hover:bg-gray-50 p-3 border rounded-lg transition-colors cursor-pointer"
                        onClick={() => handleJobClick(event)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">{event.customerName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {event.time}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-gray-600 text-xs">
                          <p><Package className="inline mr-1 w-3 h-3" />{event.productName}</p>
                          <p><User className="inline mr-1 w-3 h-3" />{event.technician}</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartJob(event);
                            }}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            <Play className="w-3 h-3" />
                            Start Job
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Job Details Popup */}
      <JobDetailsPopup
        job={selectedJob}
        isOpen={jobDetailsOpen}
        onClose={() => setJobDetailsOpen(false)}
      />

      {/* VIN Scanner */}
      <VinScanner
        isOpen={showVinScanner}
        onClose={handleCloseVinScanner}
        jobId={selectedJob?.id}
        customerName={selectedJob?.customerName}
        customerEmail={selectedJob?.customerEmail}
      />

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onJobVerified={handleJobVerified}
        expectedJobNumber={selectedJob?.jobNumber || selectedJob?.id}
      />

      {/* Vehicle Details Popup */}
      <VehicleDetailsPopup
        isOpen={showVehicleDetails}
        onClose={() => setShowVehicleDetails(false)}
        onVehicleAdded={handleVehicleAdded}
        jobData={selectedJob}
      />

      {/* Technician Calendar Modal */}
      <Dialog open={showTechnicianCalendar} onOpenChange={setShowTechnicianCalendar}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedTechnician?.email?.split('@')[0]}'s Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            {selectedTechnician && (
              <div className="space-y-6">
                {/* Technician Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {selectedTechnician.isAvailable ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium text-gray-900">
                        {selectedTechnician.email?.split('@')[0]}
                      </span>
                    </div>
                    <Badge variant={selectedTechnician.isAvailable ? "default" : "secondary"}>
                      {selectedTechnician.isAvailable ? "Available" : "Busy"}
                    </Badge>
                    <span className="text-gray-600">
                      {selectedTechnician.totalJobs} total jobs
                    </span>
                  </div>
                </div>

                {/* Calendar */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Calendar View
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateMonth(-1)}
                          className="p-0 w-8 h-8"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="min-w-[120px] font-medium text-gray-900 text-center">
                          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateMonth(1)}
                          className="p-0 w-8 h-8"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Days of week header */}
                    <div className="gap-0 grid grid-cols-7 mb-2">
                      {DAYS.map(day => (
                        <div key={day} className="p-3 border-b font-medium text-gray-500 text-sm text-center">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="gap-0 grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
                      {getDaysInMonth(currentDate).map((day, index) => {
                        const events = getEventsForDate(day).filter(event => 
                          event.technician === selectedTechnician.email
                        );
                        const dateKey = day ? formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day) : null;

                        return (
                          <div
                            key={index}
                            className={`
                              min-h-[100px] p-2 border border-gray-100 transition-colors
                              ${day ? 'hover:bg-gray-50' : 'bg-gray-25'}
                            `}
                          >
                            {day && (
                              <>
                                <div className="mb-1 font-medium text-gray-900">
                                  {day}
                                </div>
                                <div className="space-y-1">
                                  {events.map((event, eventIndex) => (
                                    <div
                                      key={eventIndex}
                                      className="bg-blue-100 hover:bg-blue-200 p-1 rounded text-blue-800 text-xs cursor-pointer"
                                      onClick={() => handleJobClick(event)}
                                    >
                                      <div className="font-medium truncate">
                                        {event.customerName}
                                      </div>
                                      <div className="text-blue-600">
                                        {event.time}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Today's Jobs for this Technician */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Today's Jobs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedTechnician.todaysJobs?.length === 0 ? (
                        <p className="text-gray-500 text-sm">No jobs scheduled for today</p>
                      ) : (
                        selectedTechnician.todaysJobs.map((job, index) => (
                          <div
                            key={index}
                            className="hover:bg-gray-50 p-3 border rounded-lg transition-colors cursor-pointer"
                            onClick={() => handleJobClick(job)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-sm">{job.customerName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {job.time}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-gray-600 text-xs">
                              <p><Package className="inline mr-1 w-3 h-3" />{job.productName}</p>
                              <p><MapPin className="inline mr-1 w-3 h-3" />{job.customerAddress}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 