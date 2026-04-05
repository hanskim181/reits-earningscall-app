'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, GitCompare, LayoutDashboard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/compare', label: 'Compare', icon: GitCompare },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors">
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-zinc-100">RTIP</span>
            <span className="hidden sm:inline text-xs text-zinc-500 ml-2">REIT Transcript Intelligence</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700/60 font-mono">
          195 REITs
        </Badge>
        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700/60">
          FTSE Nareit Dec 2025
        </Badge>
      </div>
    </header>
  );
}
