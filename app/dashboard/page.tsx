import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="flex flex-col items-center min-h-screen">
      <div className="flex flex-col flex-1 items-center gap-20 w-full">
        <nav className="flex justify-center border-b border-b-foreground/10 w-full h-16">
          <div className="flex justify-between items-center p-3 px-5 w-full max-w-5xl text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href={"/"}>Got Motion</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex flex-col flex-1 gap-20 p-5 max-w-5xl">
          <Hero />
          <main className="flex flex-col flex-1 gap-6 px-4">
            <h2 className="mb-4 font-medium text-xl">Welcome to Got Motion</h2>
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 border rounded-lg">
                <h3 className="mb-2 font-semibold text-lg">Admin Dashboard</h3>
                <p className="mb-4 text-gray-600">Manage jobs, schedules, and system overview</p>
                <Link href="/protected/admin" className="text-blue-600 hover:underline">
                  Access Admin →
                </Link>
              </div>
              <div className="p-6 border rounded-lg">
                <h3 className="mb-2 font-semibold text-lg">Technician Portal</h3>
                <p className="mb-4 text-gray-600">View jobs, manage schedules, and track progress</p>
                <Link href="/protected/tech" className="text-blue-600 hover:underline">
                  Access Tech Portal →
                </Link>
              </div>
              <div className="p-6 border rounded-lg">
                <h3 className="mb-2 font-semibold text-lg">Field Coordinator</h3>
                <p className="mb-4 text-gray-600">Manage accounts, quotes, and customer relationships</p>
                <Link href="/protected/fc" className="text-blue-600 hover:underline">
                  Access FC Portal →
                </Link>
              </div>
            </div>
          </main>
        </div>

        <footer className="flex justify-center items-center gap-8 mx-auto py-16 border-t w-full text-xs text-center">
          <p>
            Powered by{" "}
            <a
              href="https://nextjs.org"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Next.js
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
