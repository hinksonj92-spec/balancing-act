import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { BottomNav } from '@/components/ui/BottomNav';
import { AuthProvider } from '@/lib/AuthContext';

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
  themeColor: '#6C5CE7',
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
      <body className="bg-dark-bg text-gray-100 min-h-screen pb-20">
        <AuthProvider>
          <main className="max-w-lg mx-auto px-4 pt-4">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
