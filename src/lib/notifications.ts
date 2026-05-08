// ============================================================
// Balancing Act — Client-side Notification Utilities
// Local scheduling + service worker registration for PWA
// ============================================================

const NOTIF_STORAGE_KEY = 'balancing-act-notification-prefs';
const REMINDER_SHOWN_KEY = 'balancing-act-reminder-shown';

export interface NotificationPrefs {
  morningReminder: boolean;
  eveningReminder: boolean;
  streakAlerts: boolean;
  weeklySummary: boolean;
}

// Track scheduled timeout IDs so we can cancel them
let scheduledTimers: ReturnType<typeof setTimeout>[] = [];

/**
 * Requests browser notification permission.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

/**
 * Returns the current notification permission status.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermissionState;
}

type NotificationPermissionState = 'granted' | 'denied' | 'default';

/**
 * Registers the service worker from /sw.js.
 * Returns the ServiceWorkerRegistration or null on failure.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[notifications] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[notifications] Service worker registered');
    return registration;
  } catch (err) {
    console.error('[notifications] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Shows a notification via the service worker registration.
 * Falls back to the Notification API if no service worker is available.
 */
export async function showNotification(
  title: string,
  body: string,
  tag: string,
  url: string = '/chat',
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        data: { url },
        vibrate: [100, 50, 100],
      });
    } else {
      // Fallback to basic Notification API
      new Notification(title, { body, icon: '/icon-192.png', tag });
    }
  } catch (err) {
    console.error('[notifications] Failed to show notification:', err);
  }
}

/**
 * Schedules a local notification after a delay (in milliseconds).
 * Returns the timeout ID for cancellation.
 */
export function scheduleLocalNotification(
  title: string,
  body: string,
  tag: string,
  delay: number,
  url: string = '/chat',
): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    showNotification(title, body, tag, url);
  }, delay);
  scheduledTimers.push(timer);
  return timer;
}

/**
 * Reads notification prefs and schedules morning/evening reminders
 * for today if they haven't been shown yet.
 * This should be called on app load.
 */
export function scheduleDailyReminders(prefs: NotificationPrefs): void {
  // Cancel any previously scheduled reminders
  cancelAllNotifications();

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Check what we've already shown today
  const shownRaw = localStorage.getItem(REMINDER_SHOWN_KEY);
  let shown: Record<string, boolean> = {};
  try {
    if (shownRaw) {
      const parsed = JSON.parse(shownRaw);
      // Only use if it's from today
      if (parsed._date === today) {
        shown = parsed;
      }
    }
  } catch {
    // ignore
  }

  // Morning reminder: 7:00 AM
  if (prefs.morningReminder && !shown.morning) {
    const morningTarget = new Date(now);
    morningTarget.setHours(7, 0, 0, 0);
    const delay = morningTarget.getTime() - now.getTime();
    if (delay > 0) {
      scheduleLocalNotification(
        'Good morning!',
        'Time for your morning check-in. How are you starting the day?',
        'morning-reminder',
        delay,
        '/chat',
      );
    }
  }

  // Evening reminder: 9:00 PM
  if (prefs.eveningReminder && !shown.evening) {
    const eveningTarget = new Date(now);
    eveningTarget.setHours(21, 0, 0, 0);
    const delay = eveningTarget.getTime() - now.getTime();
    if (delay > 0) {
      scheduleLocalNotification(
        'How did today go?',
        'Log your evening check-in before the day ends.',
        'evening-reminder',
        delay,
        '/chat',
      );
    }
  }
}

/**
 * Cancels all pending scheduled notifications.
 */
export function cancelAllNotifications(): void {
  for (const timer of scheduledTimers) {
    clearTimeout(timer);
  }
  scheduledTimers = [];
}

/**
 * Marks a reminder type as shown for today.
 */
export function markReminderShown(type: 'morning' | 'evening'): void {
  const today = new Date().toISOString().slice(0, 10);
  let shown: Record<string, boolean | string> = { _date: today };
  try {
    const raw = localStorage.getItem(REMINDER_SHOWN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._date === today) {
        shown = parsed;
      }
    }
  } catch {
    // ignore
  }
  shown[type] = true;
  localStorage.setItem(REMINDER_SHOWN_KEY, JSON.stringify(shown));
}

/**
 * Checks if a reminder has been shown today.
 */
export function wasReminderShown(type: 'morning' | 'evening'): boolean {
  try {
    const raw = localStorage.getItem(REMINDER_SHOWN_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed._date !== today) return false;
    return !!parsed[type];
  } catch {
    return false;
  }
}

/**
 * Loads notification prefs from localStorage.
 */
export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    morningReminder: true,
    eveningReminder: true,
    streakAlerts: true,
    weeklySummary: true,
  };
}
