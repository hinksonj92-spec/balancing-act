'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/chat', label: 'Chat', icon: ChatIcon },
  { href: '/goals', label: 'Goals', icon: GoalsIcon },
  { href: '/history', label: 'History', icon: HistoryIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on auth pages
  if (pathname?.startsWith('/auth')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-card border-t border-gray-800 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon active={isActive} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---- Inline SVG Icons (no external dependency) ----

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-4.64-1.14L2 22l1.14-5.36A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z" />
      {active && <circle cx="12" cy="12" r="1" fill="currentColor" />}
    </svg>
  );
}

function GoalsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
