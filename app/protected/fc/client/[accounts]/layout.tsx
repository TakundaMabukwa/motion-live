import FCSidebarLayout from "@/components/fc/FCSidebarLayout";

export default async function FCClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ accounts: string }>;
}) {
  const { accounts } = await params;
  const decoded = decodeURIComponent(accounts);

  return <FCSidebarLayout accounts={decoded}>{children}</FCSidebarLayout>;
}
