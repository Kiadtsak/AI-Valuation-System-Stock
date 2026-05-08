import '../styles/globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Quantix · AI-Powered Trading',
  description: 'Institutional-grade market intelligence for the modern investor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-white min-h-screen overflow-x-hidden">
        {/* Background gradients */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-violet-glow" />
          <div className="absolute inset-0 bg-stars opacity-50" />
        </div>

        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <main className="ml-[280px] min-h-screen relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
