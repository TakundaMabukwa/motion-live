"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CheckCircle, ExternalLink, FileText } from "lucide-react";

const NAV_ITEMS = [
  { id: "accounts", label: "Accounts", icon: Building2, href: "/protected/fc" },
  { id: "quotes", label: "Quotes", icon: FileText, href: "/protected/fc/quotes" },
  {
    id: "external-quotation",
    label: "External Quotation",
    icon: ExternalLink,
    href: "/protected/fc/external-quotation",
  },
  {
    id: "completed-jobs",
    label: "Job Card Review",
    icon: CheckCircle,
    href: "/protected/fc/completed-jobs",
  },
];

const isAccountsArea = (pathname: string) => {
  const path = pathname || "";
  if (!path.startsWith("/protected/fc")) return false;
  return (
    !path.startsWith("/protected/fc/quotes") &&
    !path.startsWith("/protected/fc/external-quotation") &&
    !path.startsWith("/protected/fc/completed-jobs")
  );
};

export default function FCSectionNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="flex space-x-8">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === "accounts"
              ? isAccountsArea(pathname || "")
              : (pathname || "").startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
