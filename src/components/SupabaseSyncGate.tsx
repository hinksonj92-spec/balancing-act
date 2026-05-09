'use client';

import { ReactNode } from 'react';
import { useSupabaseSync } from '@/lib/useSupabaseSync';

/**
 * Wraps children and ensures the authenticated user's Supabase data
 * has been seeded (categories, metrics, life goals) on first login.
 * Place this inside AuthProvider so it can call useAuth().
 *
 * Non-blocking: children always render immediately. Seeding happens
 * in the background so onboarding and other pages aren't delayed.
 */
export function SupabaseSyncGate({ children }: { children: ReactNode }) {
  const { isSeeding, error } = useSupabaseSync();

  // Log seeding status for debugging but never block rendering
  if (isSeeding) {
    console.log('[SupabaseSyncGate] Seeding in progress (non-blocking)...');
  }

  if (error) {
    console.warn('[SupabaseSyncGate] Seeding error (continuing with localStorage):', error);
  }

  return <>{children}</>;
}
