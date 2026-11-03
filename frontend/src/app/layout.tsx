import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Metadata } from 'next';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'LifeLine AI | Blood Donation & Smart Logistics Network',
  description: 'AI-driven proactive blood donation and logistics system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={cn('min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-rose-500/20 selection:text-rose-900', fontSans.className)}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.06),rgba(255,255,255,0))]">
            <Navbar />
            <main className="flex-1 pb-16">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
