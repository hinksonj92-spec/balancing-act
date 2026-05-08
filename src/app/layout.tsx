import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { BottomNav } from '@/components/ui/BottomNav';
import { AuthProvider } from '@/lib/AuthContext';
import { SupabaseSyncGate } from '@/components/SupabaseSyncGate';

export const metadata: Metadata = {
  title: 'Balancing Act',
  description: 'AI-powered life balance tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Balance',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#141210',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-dark-bg min-h-screen" style={{ color: '#F5F0EB' }}>
        <AuthProvider>
          <SupabaseSyncGate>
            <main className="max-w-2xl mx-auto px-4 pt-4 pb-20">
              {children}
            </main>
            <BottomNav />
          </SupabaseSyncGate>
        </AuthProvider>
      </body>
    </html>
  );
}
