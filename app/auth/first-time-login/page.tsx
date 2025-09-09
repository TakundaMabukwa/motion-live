import { FirstTimePasswordForm } from "@/components/first-time-password-form";

export default function FirstTimeLoginPage() {
  return (
    <div className="flex justify-center items-center p-6 md:p-10 w-full min-h-svh">
      <div className="w-full max-w-sm">
        <FirstTimePasswordForm />
      </div>
    </div>
  );
}
