"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
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
  const [preparingReturnedJob, setPreparingReturnedJob] = useState(false);

  const extractAndClearFcMoveNote = (notes) => {
    const normalized = String(notes || "");
    if (!/\[Move note to FC\]/i.test(normalized)) {
      return normalized.trim();
    }

    return normalized
      .split(/\[Move note to FC\]/gi)[0]
      .trim();
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

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/job-cards/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job");
        }

        const loadedJob = await response.json();
        let resolvedJob = loadedJob;

        if (/\[Move note to FC\]/i.test(String(loadedJob?.completion_notes || ""))) {
          setPreparingReturnedJob(true);

          const acknowledgeResponse = await fetch(`/api/job-cards/${jobId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              completion_notes: extractAndClearFcMoveNote(loadedJob.completion_notes) || null,
              status: "pending",
              job_status: "created",
              role: "fc",
              move_to: "fc",
            }),
          });

          if (acknowledgeResponse.ok) {
            resolvedJob = await acknowledgeResponse.json();
          }

          setPreparingReturnedJob(false);
        }

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

  if (preparingReturnedJob) {
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
      <div className="mb-3 max-w-[1400px] mx-auto">
        <Button variant="outline" onClick={goBackOrJobs}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Jobs
        </Button>
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
          onQuoteCreated={goBackOrJobs}
        />
      </div>
    </div>
  );
}
