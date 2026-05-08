'use client';

import { ReactNode } from 'react';
import { useSupabaseSync } from '@/lib/useSupabaseSync';

/**
 * Wraps children and ensures the authenticated user's Supabase data
 * has been seeded (categories, metrics, life goals) on first login.
 * Place this inside AuthProvider so it can call useAuth().
 */
export function SupabaseSyncGate({ children }: { children: ReactNode }) {
  const { isSeeding, error } = useSupabaseSync();

  // Show a brief loading state while seeding runs for the first time
  if (isSeeding) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: '#2D2824', borderTopColor: '#C49A6C' }}
          />
          <p className="text-sm" style={{ color: '#A39B91' }}>
            Setting up your tracker...
          </p>
        </div>
      </div>
    );
  }

  // Log seeding errors but don't block the app — localStorage fallback still works
  if (error) {
    console.warn('[SupabaseSyncGate] Seeding error (continuing with localStorage):', error);
  }

  return <>{children}</>;
}
