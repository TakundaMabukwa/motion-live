'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  User, 
  Car, 
  MapPin, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminJob {
  id: string;
  job_number: string;
  job_date: string;
  due_date: string;
  start_time: string;
  end_time: string;
  status: string;
  job_type: string;
  job_description: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  technician_name: string;
  technician_phone: string; // This contains the email
  job_location: string;
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  parts_required: any;
  products_required: any;
  quotation_products: any;
  quotation_total_amount: number;
  qr_code: string;
  work_notes: string;
  completion_notes: string;
  customer_feedback: string;
  quotation_number: string;
  quote_status: string;
  special_instructions: string;
  access_requirements: string;
  site_contact_person: string;
  site_contact_phone: string;
}

interface AdminCalendarProps {
  className?: string;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ className }) => {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [jobsByDate, setJobsByDate] = useState<Record<string, AdminJob[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedJobs, setSelectedJobs] = useState<AdminJob[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedJobForQR, setSelectedJobForQR] = useState<AdminJob | null>(null);

  // Fetch admin jobs for the calendar
  const fetchAdminJobs = useCallback(async (date?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (date) {
        params.append('date', date);
      }

      const response = await fetch(`/api/admin/jobs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin jobs: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setJobs(data.jobs || []);
      
      // Group jobs by date for calendar display
      const jobsByDateData = (data.jobs || []).reduce((acc: Record<string, AdminJob[]>, job: AdminJob) => {
        if (job.job_date) {
          const dateKey = new Date(job.job_date).toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(job);
        }
        return acc;
      }, {});
      
      setJobsByDate(jobsByDateData);
      
    } catch (error) {
      console.error('Error fetching admin jobs:', error);
      setError('Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load jobs on component mount
  useEffect(() => {
    fetchAdminJobs();
  }, [fetchAdminJobs]);

  // Handle date selection
  const handleDateClick = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    const jobsForDate = jobsByDate[dateKey] || [];
    setSelectedJobs(jobsForDate);
  }, [jobsByDate]);

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = dateKey === new Date().toISOString().split('T')[0];
      const jobsForDate = jobsByDate[dateKey] || [];
      
      days.push({
        date: new Date(currentDate),
        dateKey,
        isCurrentMonth,
        isToday,
        jobsCount: jobsForDate.length
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'on_hold': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getJobTypeColor = (jobType: string) => {
    switch (jobType?.toLowerCase()) {
      case 'install': return 'bg-blue-500';
      case 'deinstall': return 'bg-red-500';
      case 'maintenance': return 'bg-green-500';
      case 'repair': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const showJobQRCode = (job: AdminJob) => {
    setSelectedJobForQR(job);
    setShowQRCode(true);
  };

  const calendarDays = generateCalendarDays();

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">Error Loading Calendar</h3>
          <p className="text-gray-500">{error}</p>
          <Button 
            onClick={() => fetchAdminJobs()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Admin Job Calendar</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setCurrentMonth(prevMonth);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium">
                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setCurrentMonth(nextMonth);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="py-4 text-center">
              <div className="mx-auto border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
              <span className="ml-2">Loading calendar...</span>
            </div>
          )}
          
          {/* Calendar Grid */}
          <div className="gap-1 grid grid-cols-7">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 font-medium text-gray-500 text-sm text-center">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  p-2 min-h-[80px] border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                  ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                  ${day.isToday ? 'bg-blue-50 border-blue-300' : ''}
                  ${selectedDate === day.dateKey ? 'bg-blue-100 border-blue-400' : ''}
                `}
                onClick={() => handleDateClick(day.dateKey)}
              >
                <div className="mb-1 font-medium text-sm">
                  {day.date.getDate()}
                </div>
                {day.jobsCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {day.jobsCount} job{day.jobsCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Jobs */}
      {selectedDate && selectedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Jobs for {formatDate(selectedDate)}</span>
              <Badge variant="secondary">{selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedJobs.map((job) => (
                <div key={job.id} className="space-y-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{job.job_number}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status || 'pending'}
                        </Badge>
                        <Badge className={getJobTypeColor(job.job_type)}>
                          {job.job_type}
                        </Badge>
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority || 'medium'}
                        </Badge>
                      </div>
                      
                      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <User className="w-4 h-4 text-blue-600" />
                            <span><strong>Customer:</strong> {job.customer_name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="w-4 h-4 text-green-600" />
                            <span><strong>Customer Email:</strong> {job.customer_email}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="w-4 h-4 text-orange-600" />
                            <span><strong>Customer Phone:</strong> {job.customer_phone}</span>
                          </div>
                          
                          {job.technician_name && (
                            <div className="flex items-center space-x-2 text-sm">
                              <User className="w-4 h-4 text-purple-600" />
                              <span><strong>Technician:</strong> {job.technician_name}</span>
                            </div>
                          )}
                          
                          {job.technician_phone && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="w-4 h-4 text-indigo-600" />
                              <span><strong>Technician Email:</strong> {job.technician_phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {job.vehicle_registration && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Car className="w-4 h-4 text-gray-600" />
                              <span><strong>Vehicle:</strong> {job.vehicle_registration}</span>
                            </div>
                          )}
                          
                          {job.job_location && (
                            <div className="flex items-center space-x-2 text-sm">
                              <MapPin className="w-4 h-4 text-red-600" />
                              <span><strong>Location:</strong> {job.job_location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span><strong>Start:</strong> {formatTime(job.start_time)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span><strong>End:</strong> {formatTime(job.end_time)}</span>
                          </div>
                          
                          {job.estimated_duration_hours && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-600" />
                              <span><strong>Duration:</strong> {job.estimated_duration_hours}h</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {job.job_description && (
                        <div className="bg-gray-50 mt-3 p-3 rounded">
                          <p className="text-gray-700 text-sm">
                            <strong>Description:</strong> {job.job_description}
                          </p>
                        </div>
                      )}

                      {job.special_instructions && (
                        <div className="bg-blue-50 mt-3 p-3 rounded">
                          <p className="text-blue-700 text-sm">
                            <strong>Special Instructions:</strong> {job.special_instructions}
                          </p>
                        </div>
                      )}

                      {job.access_requirements && (
                        <div className="bg-yellow-50 mt-3 p-3 rounded">
                          <p className="text-yellow-700 text-sm">
                            <strong>Access Requirements:</strong> {job.access_requirements}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* QR Code Button */}
                    {job.qr_code && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showJobQRCode(job)}
                        className="ml-4"
                      >
                        <QrCode className="mr-1 w-4 h-4" />
                        View QR
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No jobs selected */}
      {selectedDate && selectedJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs Scheduled</h3>
            <p className="text-gray-500">No jobs are scheduled for {formatDate(selectedDate)}</p>
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedJobForQR && (
              <div className="text-center">
                <div className="bg-gray-50 mb-4 p-4 rounded-lg">
                  <h4 className="mb-2 font-medium text-gray-900">Job Information</h4>
                  <p><strong>Job Number:</strong> {selectedJobForQR.job_number}</p>
                  <p><strong>Customer:</strong> {selectedJobForQR.customer_name}</p>
                  <p><strong>Type:</strong> {selectedJobForQR.job_type}</p>
                  <p><strong>Date:</strong> {formatDate(selectedJobForQR.job_date)}</p>
                </div>
                {selectedJobForQR.qr_code ? (
                  <div className="bg-white p-4 border rounded-lg">
                    <img 
                      src={selectedJobForQR.qr_code} 
                      alt="Job QR Code" 
                      className="mx-auto max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <QrCode className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                    <p className="text-gray-500">No QR code available for this job</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowQRCode(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminCalendar;

