import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div 
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        backgroundImage: 'url(/pxfuel.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="flex flex-col items-center">
        <img 
          src="/soltrack-vehicle-tracking-logo-transparent.png" 
          alt="Soltrack Logo" 
          className="h-20 w-auto object-contain mb-8"
        />
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
