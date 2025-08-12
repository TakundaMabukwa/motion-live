export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>
      <div>
        <div>
          {children}
        </div>
      </div>
    </main>
  );
}
