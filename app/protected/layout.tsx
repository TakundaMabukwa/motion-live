export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="w-full">
        <div className="w-full">
          {children}
        </div>
      </div>
    </main>
  );
}
