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
        setJob(loadedJob);

        const customerData = {
          company: loadedJob.customer_name || "",
          trading_name: loadedJob.customer_name || "",
          email: loadedJob.customer_email || "",
          cell_no: loadedJob.customer_phone || "",
          new_account_number: loadedJob.new_account_number || "",
        };

        const accountData = {
          new_account_number: loadedJob.new_account_number || "",
          account_id: loadedJob.account_id || null,
          trading_name: loadedJob.customer_name || "",
          company: loadedJob.customer_name || "",
          email: loadedJob.customer_email || "",
          cell_no: loadedJob.customer_phone || "",
          branch_person_name: loadedJob.contact_person || "",
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
