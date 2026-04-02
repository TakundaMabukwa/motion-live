"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ClientQuoteForm from "@/components/ui-personal/client-quote-form";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [acknowledgingNote, setAcknowledgingNote] = useState(false);

  const extractFcMoveNote = (notes) => {
    const normalized = String(notes || "");
    if (!/\[Move note to FC\]/i.test(normalized)) {
      return "";
    }

    const sections = normalized
      .split(/\[Move note to FC\]/gi)
      .map((part) => part.trim())
      .filter(Boolean);

    if (sections.length === 0) return "";

    return sections[sections.length - 1].split(/\n{2,}/)[0].trim();
  };

  const goBackOrJobs = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (job?.new_account_number) {
      router.push(`/protected/fc/accounts/${job.new_account_number}?tab=jobs`);
      return;
    }

    router.push("/protected/fc?tab=clients");
  };

  const handleJobSaved = () => {
    if (job?.new_account_number) {
      router.push(`/protected/fc/accounts/${job.new_account_number}?tab=jobs`);
      router.refresh();
      return;
    }

    router.push("/protected/fc?tab=clients");
    router.refresh();
  };

  const handleAcknowledgeNote = async () => {
    if (!job?.id || job?.fc_note_acknowledged) return;

    try {
      setAcknowledgingNote(true);

      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fc_note_acknowledged: true,
          status: "pending",
          job_status: "created",
          role: "fc",
          move_to: "fc",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to acknowledge FC note");
      }

      const updatedJob = await response.json();
      setJob(updatedJob);
      toast.success("FC note acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge note", {
        description: error?.message || "Please try again.",
      });
    } finally {
      setAcknowledgingNote(false);
    }
  };

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/job-cards/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job");
        }

        const loadedJob = await response.json();
        const resolvedJob = loadedJob;
        setJob(resolvedJob);

        const customerData = {
          company: resolvedJob.customer_name || "",
          trading_name: resolvedJob.customer_name || "",
          email: resolvedJob.customer_email || "",
          cell_no: resolvedJob.customer_phone || "",
          new_account_number: resolvedJob.new_account_number || "",
        };

        const accountData = {
          new_account_number: resolvedJob.new_account_number || "",
          account_id: resolvedJob.account_id || null,
          trading_name: resolvedJob.customer_name || "",
          company: resolvedJob.customer_name || "",
          email: resolvedJob.customer_email || "",
          cell_no: resolvedJob.customer_phone || "",
          branch_person_name: resolvedJob.contact_person || "",
        };

        setCustomer(customerData);
        setAccountInfo(accountData);
      } catch (error) {
        toast.error("Failed to load job", {
          description: error.message || "Could not fetch job data.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={goBackOrJobs}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Jobs
          </Button>
          <p className="mt-4 text-red-600">Job could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen">
      <div className="mb-3 space-y-3 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={goBackOrJobs}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Jobs
          </Button>
          {extractFcMoveNote(job?.completion_notes) ? (
            <Button
              onClick={handleAcknowledgeNote}
              disabled={acknowledgingNote || job?.fc_note_acknowledged}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {acknowledgingNote ? (
                <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 w-4 h-4" />
              )}
              {job?.fc_note_acknowledged ? "Note Acknowledged" : "Acknowledge Note"}
            </Button>
          ) : null}
        </div>
        {extractFcMoveNote(job?.completion_notes) ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="font-semibold text-amber-900 text-sm">Note from Ria</p>
                <p className="mt-1 text-amber-800 text-sm whitespace-pre-wrap">
                  {extractFcMoveNote(job?.completion_notes)}
                </p>
              </div>
              <span className="text-xs font-medium text-amber-700">
                {job?.fc_note_acknowledged ? "Acknowledged" : "Pending acknowledgement"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="max-w-[1400px] mx-auto h-[calc(100vh-90px)]">
        <ClientQuoteForm
          customer={customer}
          vehicles={[]}
          accountInfo={accountInfo}
          initialQuote={job}
          mode="edit"
          quoteId={jobId}
          saveTarget="job"
          embedded
          onQuoteCreated={handleJobSaved}
        />
      </div>
    </div>
  );
}
