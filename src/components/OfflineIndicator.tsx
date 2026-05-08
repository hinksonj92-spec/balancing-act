'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setVisible(true);
    }

    const goOffline = () => {
      setIsOffline(true);
      setVisible(true);
    };

    const goOnline = () => {
      setIsOffline(false);
      // Notify the service worker so it can drain the sync queue
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' });
      }
      // Keep visible briefly so user sees the transition, then fade out
      setTimeout(() => setVisible(false), 1500);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        backgroundColor: '#C49A6C',
        color: '#FFFFFF',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: 500,
        animation: isOffline ? 'slideDown 0.3s ease-out' : 'fadeOut 0.5s ease-in forwards',
      }}
    >
      You&apos;re offline — changes will sync when reconnected
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
