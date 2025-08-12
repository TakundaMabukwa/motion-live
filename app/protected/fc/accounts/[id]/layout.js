export async function generateStaticParams() {
  // Return the list of account IDs that should be statically generated
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
  ];
}

export default function AccountLayout({ children }) {
  return children;
}