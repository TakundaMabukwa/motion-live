"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Calendar,
  Package,
  Car,
  FileText,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  List,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import AdminSubnav from "@/components/admin/AdminSubnav";

type ViewType = "day" | "week" | "month";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getColorHex = (colorName: string) => {
  const colorMap: Record<string, string> = {
    blue: "#3B82F6", violet: "#8B5CF6", yellow: "#F59E0B", maroon: "#DC2626",
    black: "#1F2937", red: "#EF4444", green: "#10B981", purple: "#8B5CF6",
    orange: "#F97316", pink: "#EC4899", cyan: "#06B6D4", indigo: "#6366F1",
    emerald: "#059669", teal: "#14B8A6", lime: "#84CC16", amber: "#F59E0B",
    rose: "#F43F5E", slate: "#64748B", gray: "#6B7280", zinc: "#71717A",
    neutral: "#737373", stone: "#78716C",
  };
  return colorMap[colorName?.toLowerCase()] || "#6B7280";
};

const extractTimeClock = (value: unknown) => {
  if (!value) return "TBD";
  const match = String(value).match(/(\d{2}):(\d{2})/);
  if (match?.[1]) return match[1] + ":" + match[2];
  return "TBD";
};

interface Job {
  id: string;
  job_number: string;
  job_date: string;
  start_time: string;
  end_time: string;
  status: string;
  job_status: string;
  job_type: string;
  job_description: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  contact_person: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  technician_name: string;
  technician_phone: string;
  job_location: string;
  estimated_duration_hours: number;
  estimated_cost: number;
  quotation_total_amount: number;
  quotation_subtotal: number;
  quotation_vat_amount: number;
  quotation_products: unknown;
  parts_required: unknown;
  work_notes: string;
  completion_notes: string;
  special_instructions: string;
  role: string;
  technician_color: string;
}

interface TechnicianStatus {
  id: string;
  name: string;
  email: string;
  color_code: string;
  total_jobs: number;
}

interface ScheduleData {
  jobs: Job[];
  jobsByDate: Record<string, Job[]>;
  technicians: TechnicianStatus[];
  view: string;
  date: string;
  total: number;
}

export function AdminScheduleContent({ embedded = false }: { embedded?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [view, setView] = useState<ViewType>("day");
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobFull, setSelectedJobFull] = useState<Job | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const jobDetailsRequestSeq = useRef(0);

  const [technicianPopupOpen, setTechnicianPopupOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianStatus | null>(null);
  const [technicianDayJobs, setTechnicianDayJobs] = useState<Job[]>([]);

  const formatLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const extractDateKey = (value: unknown) => {
    if (!value) return "no-date";
    const datePart = String(value).split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    const parsed = new Date(datePart);
    if (Number.isNaN(parsed.getTime())) return "no-date";
    return formatLocalDateKey(parsed);
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const safeParseArray = (value: unknown) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const formatDateDisplay = (value: unknown) => {
    if (!value) return "N/A";
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  const formatCurrency = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "R 0.00";
    return `R ${n.toFixed(2)}`;
  };

  const extractSerialNumbers = (part: unknown) => {
    if (!part || typeof part !== "object") return [];
    const record = part as Record<string, unknown>;
    const values: string[] = [];
    const appendValue = (candidate: unknown) => {
      if (candidate === null || candidate === undefined) return;
      if (Array.isArray(candidate)) {
        candidate.forEach((item) => appendValue(item));
        return;
      }
      if (typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;
        appendValue(nested.serial_number ?? nested.serialNumber ?? nested.serial_no ?? nested.serial ?? nested.ip_address ?? nested.ipAddress ?? nested.item_serial);
        return;
      }
      const normalized = String(candidate).trim();
      if (!normalized) return;
      normalized.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean).forEach((v) => values.push(v));
    };
    appendValue(record.serial_number);
    appendValue(record.serialNumber);
    appendValue(record.serial_no);
    appendValue(record.serialNo);
    appendValue(record.serial);
    appendValue(record.item_serial);
    appendValue(record.unit_serial_number);
    appendValue(record.stock_serial);
    appendValue(record.ip_address);
    appendValue(record.ipAddress);
    appendValue(record.serial_numbers);
    appendValue(record.serialNumbers);
    appendValue(record.assigned_serial_numbers);
    appendValue(record.ip_addresses);
    appendValue(record.inventory_item);
    appendValue(record.inventory_items);
    return Array.from(new Set(values));
  };

  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
      const params = new URLSearchParams({ view, date: dateStr });
      const response = await fetch(`/api/admin/schedule?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`);
      const data: ScheduleData = await response.json();
      setScheduleData(data);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const fetchFullJobDetails = async (jobId: string) => {
    const requestSeq = jobDetailsRequestSeq.current + 1;
    jobDetailsRequestSeq.current = requestSeq;
    setJobDetailsLoading(true);
    try {
      const response = await fetch(`/api/job-cards/${jobId}`);
      if (!response.ok) throw new Error(`Failed to fetch job details (${response.status})`);
      const fullJob = await response.json();
      if (requestSeq === jobDetailsRequestSeq.current) {
        setSelectedJobFull(fullJob);
      }
    } catch (error) {
      console.error("Error fetching full job details:", error);
      toast.error("Failed to load full job details");
      if (requestSeq === jobDetailsRequestSeq.current) {
        setSelectedJobFull(null);
      }
    } finally {
      if (requestSeq === jobDetailsRequestSeq.current) {
        setJobDetailsLoading(false);
      }
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setSelectedJobFull(null);
    setJobDetailsOpen(true);
    if (job?.id) {
      fetchFullJobDetails(job.id);
    }
  };

  const handleTechnicianClick = (tech: TechnicianStatus) => {
    setSelectedTechnician(tech);
    // Get date range based on current view
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    if (view === 'day') {
      end.setDate(end.getDate() + 1);
    } else if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 7);
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setDate(end.getDate() + 1);
    }
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    const techJobs = (scheduleData?.jobs || []).filter((j) => {
      const match = j.technician_name === tech.name ||
        j.technician_phone?.toLowerCase() === tech.email?.toLowerCase();
      if (!match) return false;
      const jobDate = j.start_time || j.job_date;
      if (!jobDate) return false;
      const dateKey = String(jobDate).split('T')[0].split(' ')[0];
      return dateKey >= startStr && dateKey < endStr;
    });
    techJobs.sort((a, b) => {
      const ad = a.start_time || a.job_date;
      const bd = b.start_time || b.job_date;
      return String(ad).localeCompare(String(bd));
    });
    setTechnicianDayJobs(techJobs);
    setTechnicianPopupOpen(true);
  };

  const navigate = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "day") {
        newDate.setDate(newDate.getDate() + direction);
      } else if (view === "week") {
        newDate.setDate(newDate.getDate() + direction * 7);
      } else {
        newDate.setMonth(newDate.getMonth() + direction);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatLocalDateKey());
  };

  const selectedEvents = scheduleData?.jobsByDate[selectedDate] || [];
  const activeJob = selectedJobFull || (selectedJob as Job) || ({} as Job);
  const selectedParts = safeParseArray(activeJob.parts_required);
  const selectedQuoteItems = safeParseArray(activeJob.quotation_products);
  const selectedSubtotal = Number(activeJob.quotation_subtotal ?? activeJob.estimated_cost ?? 0);
  const selectedTotal = Number(activeJob.quotation_total_amount ?? activeJob.estimated_cost ?? 0);

  return (
    <div className={`bg-gradient-to-br from-blue-50 via-white to-indigo-50 ${embedded ? "min-h-full p-4 md:p-6" : "min-h-screen p-6"}`}>
      <div className="mx-auto max-w-[1600px]">
        {!embedded && (
          <div className="mb-4">
            <AdminSubnav />
          </div>
        )}

        {/* Header */}
        <div className={embedded ? "mb-4" : "mb-6"}>
          <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
            <div>
              {!embedded && (
                <h1 className="font-bold text-gray-900 text-3xl">Admin Schedule</h1>
              )}
              {!embedded && (
                <p className="mt-1 text-gray-600">Manage and view all scheduled jobs</p>
              )}
            </div>

            {/* View Toggle + Navigation */}
            <div className="flex items-center gap-3">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-1 flex gap-1">
                <Button
                  variant={view === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("day")}
                  className="gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  Day
                </Button>
                <Button
                  variant={view === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("week")}
                  className="gap-1.5"
                >
                  <List className="w-4 h-4" />
                  Week
                </Button>
                <Button
                  variant={view === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("month")}
                  className="gap-1.5"
                >
                  <Grid3X3 className="w-4 h-4" />
                  Month
                </Button>
              </div>

              <div className="flex items-center gap-1 bg-white shadow-sm border border-gray-200 rounded-lg p-1">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-8 h-8 p-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="px-3 text-sm font-medium">
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="w-8 h-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <span className="font-semibold text-gray-700 text-sm">
                {view === "day" && FULL_DAYS[currentDate.getDay()] + ", " + currentDate.toLocaleDateString("en-ZA", { month: "long", day: "numeric", year: "numeric" })}
                {view === "week" && `Week of ${currentDate.toLocaleDateString("en-ZA", { month: "short", day: "numeric", year: "numeric" })}`}
                {view === "month" && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              </span>

              <Button variant="outline" size="sm" onClick={fetchScheduleData} className="gap-1.5">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {loading && !scheduleData ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading schedule...</span>
          </div>
        ) : (
          <div className="gap-6 grid grid-cols-1 lg:grid-cols-4">
            {/* Main Schedule Area */}
            <div className="lg:col-span-3">
              {view === "day" && (
                <DayView
                  currentDate={currentDate}
                  jobs={scheduleData?.jobsByDate[selectedDate] || []}
                  technicians={scheduleData?.technicians || []}
                  onJobClick={handleJobClick}
                  selectedDate={selectedDate}
                />
              )}
              {view === "week" && (
                <WeekView
                  currentDate={currentDate}
                  jobsByDate={scheduleData?.jobsByDate || {}}
                  technicians={scheduleData?.technicians || []}
                  onJobClick={handleJobClick}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
              {view === "month" && (
                <MonthView
                  currentDate={currentDate}
                  jobsByDate={scheduleData?.jobsByDate || {}}
                  onJobClick={handleJobClick}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
            </div>

            {/* Right Sidebar - Team Status + Selected Date Jobs */}
            <div className="space-y-4 lg:col-span-1">
              <TeamStatusSidebar
                technicians={scheduleData?.technicians || []}
                onTechnicianClick={handleTechnicianClick}
              />

              <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg text-white p-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    Jobs for {selectedDate}
                    <Badge variant="secondary" className="ml-auto text-xs">{selectedEvents.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-[400px] overflow-y-auto">
                  {selectedEvents.length === 0 ? (
                    <p className="py-4 text-gray-500 text-sm text-center">No jobs scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map((event, index) => (
                        <div
                          key={index}
                          className="hover:bg-gray-50 p-2 border border-gray-200 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleJobClick(event)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm truncate">{event.customer_name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{extractTimeClock(event.start_time)}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorHex(event.technician_color) }} />
                            <span className="truncate">{event.technician_name}</span>
                            <span className="text-gray-400">|</span>
                            <span className="truncate">{event.job_type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Job Details Dialog */}
        <Dialog
          open={jobDetailsOpen}
          onOpenChange={(open) => {
            setJobDetailsOpen(open);
            if (!open) {
              jobDetailsRequestSeq.current += 1;
              setJobDetailsLoading(false);
              setSelectedJobFull(null);
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bold text-xl">Job Details</DialogTitle>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-6">
                {jobDetailsLoading && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 border border-blue-200 rounded-md text-blue-700 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading full job details...
                  </div>
                )}
                {selectedJobFull && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 border rounded-lg">
                      <div className="flex md:flex-row flex-col md:justify-between md:items-start gap-3">
                        <div>
                          <p className="text-gray-500 text-sm">Job Number</p>
                          <h2 className="font-bold text-gray-900 text-2xl">
                            {activeJob.job_number || selectedJob.job_number || "N/A"}
                          </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getPriorityColor(activeJob.priority || selectedJob.priority)}>
                            {(activeJob.priority || selectedJob.priority || "N/A").toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="font-semibold">
                            {String(activeJob.status || selectedJob.status || "N/A").replaceAll("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="gap-4 grid grid-cols-1 lg:grid-cols-3">
                      <div className="space-y-4 lg:col-span-1">
                        <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                          <h3 className="flex items-center gap-2 mb-3 font-semibold text-blue-900 text-lg">
                            <User className="w-5 h-5" /> Customer
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-base">{activeJob.customer_name || "N/A"}</p>
                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" />{activeJob.customer_email || "N/A"}</p>
                            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-600" />{activeJob.customer_phone || "N/A"}</p>
                            {activeJob.job_location && (
                              <p className="flex items-start gap-2"><MapPin className="mt-0.5 w-4 h-4 text-blue-600" />{activeJob.job_location}</p>
                            )}
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-lg">
                          <h3 className="flex items-center gap-2 mb-3 font-semibold text-emerald-900 text-lg">
                            <Car className="w-5 h-5" /> Vehicle
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><strong>Reg:</strong> {activeJob.vehicle_registration || "N/A"}</p>
                            <p><strong>Make/Model:</strong> {[activeJob.vehicle_make, activeJob.vehicle_model].filter(Boolean).join(" ") || "N/A"}</p>
                            <p><strong>Year:</strong> {activeJob.vehicle_year || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 lg:col-span-2">
                        <div className="bg-purple-50 p-4 border border-purple-200 rounded-lg">
                          <h3 className="flex items-center gap-2 mb-3 font-semibold text-purple-900 text-lg">
                            <Calendar className="w-5 h-5" /> Job and Schedule
                          </h3>
                          <div className="gap-3 grid grid-cols-1 md:grid-cols-2 text-sm">
                            <p><strong>Type:</strong> {activeJob.job_type || "N/A"}</p>
                            <p><strong>Date:</strong> {formatDateDisplay(activeJob.job_date)}</p>
                            <p><strong>Time:</strong> {extractTimeClock(activeJob.start_time)}</p>
                            <p><strong>Duration:</strong> {activeJob.estimated_duration_hours ? `${activeJob.estimated_duration_hours}h` : "N/A"}</p>
                            <p><strong>Technician:</strong> {activeJob.technician_name || "N/A"}</p>
                            <p><strong>Technician Contact:</strong> {activeJob.technician_phone || "N/A"}</p>
                          </div>
                        </div>

                        <div className="bg-white p-4 border rounded-lg">
                          <h3 className="flex items-center gap-2 mb-3 font-semibold text-lg">
                            <Package className="w-5 h-5" /> Assigned Parts ({selectedParts.length})
                          </h3>
                          {selectedParts.length === 0 ? (
                            <p className="text-gray-500 text-sm">No assigned parts on this job.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="py-2 text-left">Description</th><th className="py-2 text-left">Qty</th><th className="py-2 text-left">Code</th><th className="py-2 text-left">Serial Number(s)</th><th className="py-2 text-right">Amount</th></tr></thead>
                                <tbody>
                                  {selectedParts.map((part: Record<string, unknown>, index: number) => (
                                    <tr key={`${(part.code as string) || "part"}-${index}`} className="border-b last:border-0">
                                      <td className="py-2">{(part.description as string) || (part.name as string) || "N/A"}</td>
                                      <td className="py-2">{(part.quantity as number) ?? 1}</td>
                                      <td className="py-2">{(part.code as string) || "N/A"}</td>
                                      <td className="py-2">{extractSerialNumbers(part).join(", ") || "N/A"}</td>
                                      <td className="py-2 text-right">{formatCurrency(part.total_cost ?? part.line_total ?? part.cost_per_unit ?? 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-4 border rounded-lg">
                          <h3 className="flex items-center gap-2 mb-3 font-semibold text-lg">
                            <FileText className="w-5 h-5" /> Quotation Items ({selectedQuoteItems.length})
                          </h3>
                          {selectedQuoteItems.length === 0 ? (
                            <p className="text-gray-500 text-sm">No quotation items captured.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="py-2 text-left">Item</th><th className="py-2 text-left">Qty</th><th className="py-2 text-right">Line Total</th></tr></thead>
                                <tbody>
                                  {selectedQuoteItems.map((item: Record<string, unknown>, index: number) => (
                                    <tr key={`${(item.id as string) || "quote-item"}-${index}`} className="border-b last:border-0">
                                      <td className="py-2">{(item.name as string) || (item.description as string) || "N/A"}</td>
                                      <td className="py-2">{(item.quantity as number) ?? 1}</td>
                                      <td className="py-2 text-right">{formatCurrency(item.line_total ?? item.total_cost ?? item.cash_price ?? 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 mt-4 text-sm">
                            <p><strong>Subtotal:</strong> {formatCurrency(selectedSubtotal)}</p>
                            <p><strong>Total:</strong> {formatCurrency(selectedTotal)}</p>
                          </div>
                        </div>

                        <div className="bg-white p-4 border rounded-lg">
                          <h3 className="mb-3 font-semibold text-lg">Notes</h3>
                          <div className="space-y-3 text-sm">
                            <p><strong>Description:</strong> {activeJob.job_description || "N/A"}</p>
                            <p><strong>Work Notes:</strong> {activeJob.work_notes || "N/A"}</p>
                            <p><strong>Completion Notes:</strong> {activeJob.completion_notes || "N/A"}</p>
                            <p><strong>Special Instructions:</strong> {activeJob.special_instructions || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Technician Jobs Popup - shows all jobs for this tech in current view's date range */}
        <Dialog open={technicianPopupOpen} onOpenChange={setTechnicianPopupOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedTechnician?.name}&apos;s Jobs
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 p-4">
              {technicianDayJobs.length === 0 ? (
                <p className="py-8 text-gray-500 text-sm text-center">No jobs for this technician in current view</p>
              ) : (
                technicianDayJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      handleJobClick(job);
                      setTechnicianPopupOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColorHex(selectedTechnician?.color_code || 'gray') }} />
                      <div>
                        <p className="font-medium">{job.job_number}</p>
                        <p className="text-sm text-gray-500">{job.customer_name} • {extractTimeClock(job.start_time)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{job.job_type}</span>
                      {job.priority && <Badge className={getPriorityColor(job.priority)}>{job.priority}</Badge>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/* ─── Day View ─── */
function DayView({
  currentDate,
  jobs,
  technicians,
  onJobClick,
  selectedDate,
}: {
  currentDate: Date;
  jobs: Job[];
  technicians: TechnicianStatus[];
  onJobClick: (job: Job) => void;
  selectedDate: string;
}) {
  const START_HOUR = 6;
  const END_HOUR = 18;
  const HOUR_HEIGHT = 80; // px per hour

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const getJobPosition = (job: Job) => {
    if (!job.start_time) return null;
    const startStr = String(job.start_time);
    const startMatch = startStr.match(/(\d{2}):(\d{2})/);
    if (!startMatch) return null;

    const startHour = parseInt(startMatch[1], 10);
    const startMin = parseInt(startMatch[2], 10);

    let endHour = startHour + 1;
    let endMin = startMin;
    if (job.end_time) {
      const endMatch = String(job.end_time).match(/(\d{2}):(\d{2})/);
      if (endMatch) {
        endHour = parseInt(endMatch[1], 10);
        endMin = parseInt(endMatch[2], 10);
      } else if (job.estimated_duration_hours) {
        endHour = startHour + Math.ceil(job.estimated_duration_hours);
      }
    } else if (job.estimated_duration_hours) {
      endHour = startHour + Math.ceil(job.estimated_duration_hours);
    }

    const topOffset = ((startHour - START_HOUR) * 60 + startMin) * (HOUR_HEIGHT / 60);
    const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);
    const height = Math.max(durationMinutes * (HOUR_HEIGHT / 60), 30);

    return { top: topOffset, height };
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMinutes - START_HOUR * 60) * HOUR_HEIGHT) / 60;
  const showNowLine = nowOffset >= 0 && nowOffset <= (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-t-lg text-white">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>
            {FULL_DAYS[currentDate.getDay()]}, {currentDate.toLocaleDateString("en-ZA", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span className="text-sm font-normal text-blue-100">
            {technicians.length} Technicians
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Column headers - technician names */}
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="w-16 shrink-0 p-2 text-gray-500 text-xs font-medium text-center border-r border-gray-200">
              Time
            </div>
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className="flex-1 min-w-[130px] p-2 text-center border-r border-gray-100 last:border-r-0"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getColorHex(tech.color_code) }}
                  />
                  <span className="font-medium text-gray-700 text-xs truncate">
                    {tech.name}
                  </span>
                </div>
              </div>
            ))}
            {/* Unassigned column */}
            <div className="flex-1 min-w-[130px] p-2 text-center border-r border-gray-100">
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#9CA3AF" }} />
                <span className="font-medium text-gray-500 text-xs">Unassigned</span>
              </div>
            </div>
          </div>

          {/* Time grid */}
          <div className="relative" style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }}>
            {/* Hour lines */}
            {hours.map((hour, i) => (
              <div
                key={hour}
                className="absolute w-full border-t border-gray-100"
                style={{ top: i * HOUR_HEIGHT }}
              >
                <div className="w-16 shrink-0 absolute -left-0 -top-2.5 bg-white px-1 text-gray-400 text-[10px] text-right">
                  {String(hour).padStart(2, "0")}:00
                </div>
              </div>
            ))}

            {/* Half-hour lines */}
            {hours.map((hour, i) => (
              <div
                key={`half-${hour}`}
                className="absolute w-full border-t border-gray-50 border-dashed"
                style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Now line */}
            {showNowLine && (
              <div
                className="absolute left-16 right-0 z-20 flex items-center"
                style={{ top: nowOffset }}
              >
                <div className="bg-red-500 rounded-full w-2.5 h-2.5 -ml-1 shrink-0" />
                <div className="flex-1 bg-red-500 h-px" />
              </div>
            )}

            {/* Technician columns with jobs */}
            <div className="absolute inset-0 flex" style={{ left: 64 }}>
              {technicians.map((tech, techIdx) => {
                const techJobs = jobs.filter((j) =>
                  j.technician_name === tech.name ||
                  j.technician_phone?.toLowerCase() === tech.email?.toLowerCase()
                );
                return (
                  <div
                    key={tech.id}
                    className="flex-1 min-w-[130px] relative border-r border-gray-100 last:border-r-0"
                  >
                    {/* Column background stripes */}
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-r border-gray-50"
                        style={{ top: 0, bottom: 0, left: 0 }}
                      />
                    ))}

                    {/* Jobs */}
                    {(() => {
                      const techJobs = jobs.filter((j) =>
                        j.technician_name === tech.name ||
                        j.technician_phone?.toLowerCase() === tech.email?.toLowerCase()
                      );
                      // Sort by start time
                      techJobs.sort((a, b) => {
                        const ta = a.start_time ? String(a.start_time).match(/(\d{2}):(\d{2})/) : null;
                        const tb = b.start_time ? String(b.start_time).match(/(\d{2}):(\d{2})/) : null;
                        if (!ta && !tb) return 0;
                        if (!ta) return 1;
                        if (!tb) return -1;
                        const am = parseInt(ta[1], 10) * 60 + parseInt(ta[2], 10);
                        const bm = parseInt(tb[1], 10) * 60 + parseInt(tb[2], 10);
                        return am - bm;
                      });
                      // Compute column offsets for overlapping jobs
                      const columns: { top: number; height: number; job: Job }[][] = [];
                      techJobs.forEach((job) => {
                        const pos = getJobPosition(job);
                        if (!pos) return;
                        let colIdx = 0;
                        while (true) {
                          const conflict = columns[colIdx]?.some((c) =>
                            pos.top < c.top + c.height && pos.top + pos.height > c.top
                          );
                          if (!conflict) break;
                          colIdx++;
                        }
                        if (!columns[colIdx]) columns[colIdx] = [];
                        columns[colIdx].push({ ...pos, job });
                      });
                      return (
                        <>
                          {columns.map((col, colIdx) =>
                            col.map((item) => {
                              const jobColor = getColorHex(tech.color_code);
                              return (
                                <TooltipProvider key={item.job.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="absolute left-0.5 right-0.5 border-l-3 rounded-md px-2 py-1 text-xs cursor-pointer hover:shadow-lg transition-shadow overflow-hidden z-10"
                                        style={{
                                          top: item.top,
                                          height: item.height,
                                          width: `${100 / Math.max(columns.length, 1)}%`,
                                          left: `${(colIdx * 100) / Math.max(columns.length, 1)}%`,
                                          backgroundColor: `${jobColor}18`,
                                          borderLeftColor: jobColor,
                                          borderLeftWidth: 3,
                                        }}
                                        onClick={() => onJobClick(item.job)}
                                      >
                                      <div className="font-semibold text-gray-900 truncate text-[11px]">
                                        {item.job.customer_name}
                                      </div>
                                      {item.height > 30 && (
                                        <div className="text-gray-500 text-[10px]">
                                          {extractTimeClock(item.job.start_time)} - {extractTimeClock(item.job.end_time)}
                                        </div>
                                      )}
                                      {item.height > 50 && (
                                        <div className="text-gray-400 text-[10px] truncate">
                                          {item.job.job_type}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-medium">{item.job.customer_name}</p>
                                      <p className="text-sm">{extractTimeClock(item.job.start_time)} - {extractTimeClock(item.job.end_time)}</p>
                                      <p className="text-sm">Type: {item.job.job_type}</p>
                                      {item.job.priority && <p className="text-sm">Priority: {item.job.priority}</p>}
                                      {item.job.vehicle_registration && <p className="text-sm">Vehicle: {item.job.vehicle_registration}</p>}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
</TooltipProvider>
                            )
                          })
                        )}
                      </>
                      );
                    })()}
                  </div>
                );
              })}
              {/* Unassigned column */}
              <div className="flex-1 min-w-[130px] relative">
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-r border-gray-50"
                    style={{ top: 0, bottom: 0, left: 0 }}
                  />
                ))}
                {jobs
                  .filter((j) => {
                    const hasTech = technicians.some(
                      (t) =>
                        j.technician_name === t.name ||
                        j.technician_phone?.toLowerCase() === t.email?.toLowerCase()
                    );
                    return !hasTech;
                  })
                  .map((job) => {
                    const pos = getJobPosition(job);
                    if (!pos) return null;
                    return (
                      <TooltipProvider key={job.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute left-0.5 right-0.5 border-l-3 rounded-md px-2 py-1 text-xs cursor-pointer hover:shadow-lg transition-shadow overflow-hidden z-10"
                              style={{
                                top: pos.top,
                                height: pos.height,
                                backgroundColor: `#E5E7EB18`,
                                borderLeftColor: `#9CA3AF`,
                                borderLeftWidth: 3,
                              }}
                              onClick={() => onJobClick(job)}
                            >
                              <div className="font-semibold text-gray-900 truncate text-[11px]">
                                {job.customer_name}
                              </div>
                              <div className="text-gray-500 text-[10px]">
                                {extractTimeClock(job.start_time)} - {extractTimeClock(job.end_time)}
                              </div>
                              <div className="text-gray-400 text-[10px] truncate">
                                {job.technician_name || job.technician_phone || "—"}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{job.customer_name}</p>
                              <p className="text-sm">{extractTimeClock(job.start_time)} - {extractTimeClock(job.end_time)}</p>
                              <p className="text-sm">Type: {job.job_type}</p>
                              {job.priority && <p className="text-sm">Priority: {job.priority}</p>}
                              {job.vehicle_registration && <p className="text-sm">Vehicle: {job.vehicle_registration}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Week View ─── */
function WeekView({
  currentDate,
  jobsByDate,
  technicians,
  onJobClick,
  selectedDate,
  onSelectDate,
}: {
  currentDate: Date;
  jobsByDate: Record<string, Job[]>;
  technicians: TechnicianStatus[];
  onJobClick: (job: Job) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: d, key, dayName: DAYS[d.getDay()], dayNum: d.getDate() };
  });

  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  return (
    <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="w-20 p-2 font-medium text-gray-500 text-left">Tech</th>
                {weekDays.map((day) => (
                  <th
                    key={day.key}
                    className={`p-2 font-medium text-center min-w-[120px] cursor-pointer transition-colors ${
                      day.key === selectedDate
                        ? "bg-blue-100 text-blue-700"
                        : day.key === todayKey
                        ? "bg-yellow-50 text-yellow-700"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => onSelectDate(day.key)}
                  >
                    <div className="text-xs text-gray-500">{day.dayName}</div>
                    <div className="text-lg">{day.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id} className="border-b border-gray-100">
                  <td className="p-2 align-top">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColorHex(tech.color_code) }} />
                      <span className="font-medium text-xs truncate">{tech.name}</span>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const dayJobs = (jobsByDate[day.key] || []).filter(
                      (j) => j.technician_name === tech.name ||
                        j.technician_phone?.toLowerCase() === tech.email?.toLowerCase()
                    );
                    return (
                      <td
                        key={day.key}
                        className={`p-1 border-l border-gray-100 align-top min-h-[80px] ${
                          day.key === selectedDate ? "bg-blue-50/50" : ""
                        }`}
                      >
                        {dayJobs.map((job) => (
                          <div
                            key={job.id}
                            className="mb-1 p-1.5 border-l-2 rounded text-xs cursor-pointer hover:shadow-md transition-shadow"
                            style={{
                              backgroundColor: `${getColorHex(tech.color_code)}15`,
                              borderLeftColor: getColorHex(tech.color_code),
                            }}
                            onClick={() => onJobClick(job)}
                          >
                            <div className="font-semibold truncate">{job.customer_name}</div>
                            <div className="opacity-75 text-[10px]">{extractTimeClock(job.start_time)}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Month View ─── */
function MonthView({
  currentDate,
  jobsByDate,
  onJobClick,
  selectedDate,
  onSelectDate,
}: {
  currentDate: Date;
  jobsByDate: Record<string, Job[]>;
  onJobClick: (job: Job) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const formatMonthDateKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);

  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  return (
    <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAYS.map((day) => (
            <div key={day} className="p-2 font-medium text-gray-500 text-sm text-center">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border border-gray-200 rounded-b-lg overflow-hidden">
          {cells.map((day, index) => {
            const dateKey = day ? formatMonthDateKey(year, month, day) : null;
            const events = dateKey ? (jobsByDate[dateKey] || []) : [];
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;

            return (
              <div
                key={index}
                className={`min-h-[100px] p-1.5 border border-gray-100 cursor-pointer transition-colors
                  ${!day ? "bg-gray-50" : "hover:bg-blue-50"}
                  ${isSelected ? "bg-blue-100 border-blue-300" : ""}
                  ${isToday ? "bg-yellow-50 border-yellow-200" : ""}
                `}
                onClick={() => day && onSelectDate(dateKey!)}
              >
                {day && (
                  <>
                    <div className={`mb-1 font-medium text-sm ${isToday ? "text-blue-600 font-bold" : "text-gray-900"}`}>
                      {day}
                      {isToday && <span className="bg-blue-100 ml-1 px-1 py-0.5 rounded-full text-blue-600 text-[10px]">Today</span>}
                    </div>
                    <div className="space-y-0.5">
                      {events.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className="p-1 border-l-2 rounded text-[10px] cursor-pointer hover:shadow-sm truncate"
                          style={{
                            backgroundColor: `${getColorHex(event.technician_color)}15`,
                            borderLeftColor: getColorHex(event.technician_color),
                          }}
                          onClick={(e) => { e.stopPropagation(); onJobClick(event); }}
                        >
                          <div className="font-semibold truncate">{event.customer_name}</div>
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-[10px] text-gray-500 pl-1">+{events.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Team Status Sidebar ─── */
function TeamStatusSidebar({
  technicians,
  onTechnicianClick,
}: {
  technicians: TechnicianStatus[];
  onTechnicianClick: (tech: TechnicianStatus) => void;
}) {
  return (
    <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-lg text-white p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4" />
          Team Status
          <Badge variant="secondary" className="ml-auto bg-white/20 text-xs">{technicians.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {technicians.length === 0 ? (
          <p className="py-4 text-gray-500 text-sm text-center">No technicians</p>
        ) : (
          <div className="space-y-2">
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2.5 border border-gray-200 rounded-lg cursor-pointer transition-colors"
                onClick={() => onTechnicianClick(tech)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColorHex(tech.color_code) }} />
                  <div>
                    <span className="font-medium text-sm">{tech.name}</span>
                    <p className="text-gray-500 text-xs">{tech.total_jobs} job(s)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarAppContent() {
  const searchParams = useSearchParams();
  const embedded = searchParams.get("embedded") === "1";
  return <AdminScheduleContent embedded={embedded} />;
}

export default function CalendarApp() {
  return (
    <Suspense fallback={<AdminScheduleContent embedded={false} />}>
      <CalendarAppContent />
    </Suspense>
  );
}
