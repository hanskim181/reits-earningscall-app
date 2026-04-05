'use client';

import { REITSelector } from '@/app/components/REITSelector';
import { NavBar } from '@/app/components/NavBar';
import { AIDisclosureFooter } from '@/app/components/AIDisclosureFooter';
import { getREITUniverse } from '@/lib/universe/loader';

export default function DashboardPage() {
  const reits = getREITUniverse();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <NavBar />
      <main className="flex-1 overflow-hidden p-6">
        <REITSelector reits={reits} />
      </main>
      <AIDisclosureFooter />
    </div>
  );
}
