import './globals.css';

export const metadata = {
  title: 'SecureScan SA',
  description: 'Website security scanner for small businesses'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

