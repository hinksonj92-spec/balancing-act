'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadNotificationPrefs,
  wasReminderShown,
  markReminderShown,
  registerServiceWorker,
  scheduleDailyReminders,
} from '@/lib/notifications';

type ReminderType = 'morning' | 'evening' | null;

export function ReminderCheck() {
  const [activeReminder, setActiveReminder] = useState<ReminderType>(null);
  const router = useRouter();

  useEffect(() => {
    // Register service worker on app load
    registerServiceWorker();

    // Schedule push notifications if permission granted
    const prefs = loadNotificationPrefs();
    scheduleDailyReminders(prefs);

    // Check if we should show an in-app reminder banner
    checkReminder(prefs);

    // Re-check every 60 seconds in case the window crosses a reminder boundary
    const interval = setInterval(() => {
      const currentPrefs = loadNotificationPrefs();
      checkReminder(currentPrefs);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  function checkReminder(prefs: ReturnType<typeof loadNotificationPrefs>) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Morning reminder: 7:00 - 7:30 AM
    if (
      prefs.morningReminder &&
      hours === 7 &&
      minutes <= 30 &&
      !wasReminderShown('morning')
    ) {
      setActiveReminder('morning');
      return;
    }

    // Evening reminder: 9:00 - 9:30 PM
    if (
      prefs.eveningReminder &&
      hours === 21 &&
      minutes <= 30 &&
      !wasReminderShown('evening')
    ) {
      setActiveReminder('evening');
      return;
    }
  }

  function handleTap() {
    if (activeReminder) {
      markReminderShown(activeReminder);
    }
    setActiveReminder(null);
    router.push('/chat');
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    if (activeReminder) {
      markReminderShown(activeReminder);
    }
    setActiveReminder(null);
  }

  if (!activeReminder) return null;

  const message =
    activeReminder === 'morning'
      ? 'Time for your morning check-in!'
      : 'How did today go? Log your check-in';

  const emoji = activeReminder === 'morning' ? '☀️' : '🌙';

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 9999,
        backgroundColor: '#C49A6C',
        color: '#FFFFFF',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{message}</p>
        <p style={{ fontSize: 12, margin: '2px 0 0', opacity: 0.85 }}>
          Tap to start a check-in
        </p>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: 8,
          padding: '4px 8px',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Dismiss
      </button>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
