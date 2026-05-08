'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { checkUserSeeded, seedUserData } from '@/lib/seedSupabase';

/**
 * Hook that ensures the authenticated user's Supabase data has been seeded.
 * On first login it inserts default categories, metrics, and life goals.
 */
export function useSupabaseSync() {
  const { user, loading } = useAuth();
  const [isSeeded, setIsSeeded] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if auth is still loading or no user is logged in
    if (loading || !user?.id) {
      return;
    }

    // Skip seeding in demo mode (no Supabase URL configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.log('[useSupabaseSync] No Supabase URL configured — skipping seed (demo mode)');
      setIsSeeded(true);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        console.log('[useSupabaseSync] Checking seed status for user:', user!.id);

        const alreadySeeded = await checkUserSeeded(user!.id);

        if (cancelled) return;

        if (alreadySeeded) {
          console.log('[useSupabaseSync] User already seeded');
          setIsSeeded(true);
          return;
        }

        console.log('[useSupabaseSync] User not seeded — seeding now...');
        setIsSeeding(true);

        const result = await seedUserData(user!.id);

        if (cancelled) return;

        if (result.success) {
          console.log('[useSupabaseSync] Seeding complete');
          setIsSeeded(true);
        } else {
          console.error('[useSupabaseSync] Seeding failed:', result.error);
          setError(result.error ?? 'Unknown seeding error');
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unexpected error during seeding';
        console.error('[useSupabaseSync] Unexpected error:', message);
        setError(message);
      } finally {
        if (!cancelled) {
          setIsSeeding(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { isSeeded, isSeeding, error };
}
