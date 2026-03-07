import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LifeLine AI | Blood Donation System',
  description: 'AI-driven proactive blood donation and logistics system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={cn('min-h-screen bg-slate-950 text-slate-50 font-sans antialiased selection:bg-emerald-500/30', inter.className)}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
