"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ClientQuoteForm from "@/components/ui-personal/client-quote-form";

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = params.id;
  const sourceParam = String(searchParams.get("source") || "").toLowerCase();
  const explicitSource =
    sourceParam === "client" || sourceParam === "customer"
      ? sourceParam
      : null;

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [quoteSource, setQuoteSource] = useState(explicitSource || "customer");
  const [customer, setCustomer] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);

  const goBackOrQuotes = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/protected/fc/quotes");
  };

  useEffect(() => {
    const loadQuote = async () => {
      try {
        setLoading(true);
        const loadQuoteFromSource = async (source) => {
          const endpoint =
            source === "customer"
              ? `/api/customer-quotes/${quoteId}`
              : `/api/client-quotes/${quoteId}`;

          const response = await fetch(endpoint, { cache: "no-store" });
          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.success || !result?.data) {
            return {
              success: false,
              error:
                result?.error ||
                result?.details ||
                `Quote not found in ${source} quotes`,
            };
          }

          return {
            success: true,
            source,
            quote: result.data,
          };
        };

        const preferredSources = explicitSource
          ? [explicitSource]
          : ["customer", "client"];
        let loadedQuote = null;
        let loadedSource = explicitSource || "customer";
        let lastError = "Quote not found";

        for (const source of preferredSources) {
          const attempt = await loadQuoteFromSource(source);
          if (attempt.success) {
            loadedQuote = attempt.quote;
            loadedSource = attempt.source;
            break;
          }
          lastError = attempt.error || lastError;
        }

        if (!loadedQuote) {
          throw new Error(lastError);
        }

        const q = loadedQuote;
        setQuote(q);
        setQuoteSource(loadedSource);

        const customerData = {
          company: q.customer_name || "",
          trading_name: q.customer_name || "",
          email: q.customer_email || "",
          cell_no: q.customer_phone || "",
          new_account_number: q.new_account_number || "",
        };

        const accountData = {
          new_account_number: q.new_account_number || "",
          account_id: q.account_id || null,
          trading_name: q.customer_name || "",
          company: q.customer_name || "",
          email: q.customer_email || "",
          cell_no: q.customer_phone || "",
        };

        setCustomer(customerData);
        setAccountInfo(accountData);
      } catch (error) {
        toast.error("Failed to load quote", {
          description: error.message || "Could not fetch quote data.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      loadQuote();
    }
  }, [quoteId, explicitSource]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={goBackOrQuotes}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Quotes
          </Button>
          <p className="mt-4 text-red-600">Quote could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen">
      <div className="mb-3 max-w-[1400px] mx-auto">
        <Button variant="outline" onClick={goBackOrQuotes}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Quotes
        </Button>
      </div>

      <div className="max-w-[1400px] mx-auto h-[calc(100vh-90px)]">
        <ClientQuoteForm
          customer={customer}
          vehicles={[]}
          accountInfo={accountInfo}
          initialQuote={quote}
          quoteSource={quoteSource}
          mode="edit"
          quoteId={quoteId}
          embedded
          onQuoteCreated={goBackOrQuotes}
        />
      </div>
    </div>
  );
}
