'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getGoals } from '@/lib/goalsStore';
import { syncGoalsToSupabase } from '@/lib/goalsSupabase';
import { supabase } from '@/lib/supabase';
import {
  requestNotificationPermission,
  getNotificationPermission,
  scheduleDailyReminders,
} from '@/lib/notifications';

// ---- Inline Toggle Component ----
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 9999,
        backgroundColor: checked ? '#C49A6C' : '#D4D0CB',
        position: 'relative',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 9999,
          backgroundColor: '#FFFFFF',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

// ---- Timezones ----
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'UTC', label: 'UTC' },
];

const NOTIF_STORAGE_KEY = 'balancing-act-notification-prefs';
const PREFS_STORAGE_KEY = 'balancing-act-preferences';

interface NotificationPrefs {
  morningReminder: boolean;
  eveningReminder: boolean;
  streakAlerts: boolean;
  weeklySummary: boolean;
}

interface Preferences {
  timezone: string;
  checkInTime: 'morning' | 'evening';
}

function getDefaultNotifPrefs(): NotificationPrefs {
  return {
    morningReminder: true,
    eveningReminder: true,
    streakAlerts: true,
    weeklySummary: true,
  };
}

function getDefaultPrefs(): Preferences {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    checkInTime: 'evening',
  };
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getDefaultNotifPrefs());
  const [prefs, setPrefs] = useState<Preferences>(getDefaultPrefs());
  const [toast, setToast] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [exporting, setExporting] = useState(false);

  // Load saved preferences and check notification permission
  useEffect(() => {
    try {
      const savedNotif = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (savedNotif) setNotifPrefs(JSON.parse(savedNotif));
      const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
    } catch {
      // ignore parse errors
    }
    // Check current notification permission
    setNotifPermission(getNotificationPermission());
  }, []);

  // Persist notification prefs and re-schedule reminders
  const updateNotifPref = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
    scheduleDailyReminders(updated);
  };

  // Persist preferences
  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Notifications not supported in this browser');
      return;
    }
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      showToast('Notifications enabled');
      scheduleDailyReminders(notifPrefs);
    } else if (result === 'denied') {
      showToast('Permission denied — enable in browser settings');
    } else {
      showToast('Permission dismissed — try again');
    }
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('balancing-act-goals-v2');
    localStorage.removeItem('balancing-act-checkoffs');
    localStorage.removeItem(NOTIF_STORAGE_KEY);
    localStorage.removeItem(PREFS_STORAGE_KEY);
    setNotifPrefs(getDefaultNotifPrefs());
    setPrefs(getDefaultPrefs());
    setShowClearConfirm(false);
    showToast('Local data cleared');
  };

  const handleSyncGoals = async () => {
    if (!user?.id) {
      showToast('Sign in to sync goals');
      return;
    }
    setSyncing(true);
    try {
      const goals = getGoals();
      await syncGoalsToSupabase(user.id, goals);
      showToast(`Synced ${goals.length} goals to cloud`);
    } catch {
      showToast('Sync failed — try again');
    } finally {
      setSyncing(false);
    }
  };

  // ---- Export Handlers ----

  const fetchExportData = async () => {
    if (!user) {
      showToast('Sign in to export data');
      return null;
    }
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Sign in to export data');
        return null;
      }
      const res = await fetch('/api/export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        showToast('Export failed — try again');
        return null;
      }
      return await res.json();
    } catch {
      showToast('Export failed — try again');
      return null;
    } finally {
      setExporting(false);
    }
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const data = await fetchExportData();
    if (!data) return;
    const today = new Date().toISOString().slice(0, 10);
    triggerDownload(JSON.stringify(data, null, 2), `balancing-act-export-${today}.json`, 'application/json');
    showToast('JSON export downloaded');
  };

  const handleExportCSV = async () => {
    const data = await fetchExportData();
    if (!data) return;

    // Convert entries to CSV
    const entries = data.entries || [];
    if (entries.length === 0) {
      showToast('No entries to export');
      return;
    }

    // Build a lookup for metric names and category names
    const metricMap = new Map<string, string>();
    const metricCatMap = new Map<string, string>();
    const catMap = new Map<string, string>();

    for (const cat of (data.categories || [])) {
      catMap.set(cat.id, cat.name);
    }
    for (const m of (data.metrics || [])) {
      metricMap.set(m.id, m.name);
      metricCatMap.set(m.id, catMap.get(m.category_id) || '');
    }

    const headers = ['date', 'category', 'metric', 'value', 'normalized_value', 'source'];
    const rows = entries.map((e: Record<string, string>) => [
      e.entry_date || '',
      metricCatMap.get(e.metric_id) || '',
      metricMap.get(e.metric_id) || e.metric_id || '',
      e.value ?? '',
      e.normalized_value ?? '',
      e.source || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const today = new Date().toISOString().slice(0, 10);
    triggerDownload(csvContent, `balancing-act-export-${today}.csv`, 'text/csv');
    showToast('CSV export downloaded');
  };

  const displayName = user?.user_metadata?.display_name || 'Guest';
  const displayEmail = user?.email || 'Not signed in';

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F0EDE8' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Settings</h1>
          <p className="text-xs" style={{ color: '#9A938B' }}>{displayEmail}</p>
        </div>
      </div>

      {/* Account Section */}
      <section>
        <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>Account</h2>
        <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Display Name</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>{displayName}</p>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Email</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>{displayEmail}</p>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: 'rgba(196, 112, 96, 0.1)', color: '#C47060' }}
          >
            Sign Out
          </button>
        </div>
      </section>

      {/* Preferences Section */}
      <section>
        <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>Preferences</h2>
        <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          {/* Timezone */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#1C1A17' }}>Timezone</p>
            <p className="text-xs mb-2" style={{ color: '#9A938B' }}>Used for check-in reminders and streaks</p>
            <select
              value={prefs.timezone}
              onChange={e => updatePref('timezone', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{
                backgroundColor: '#F0EDE8',
                color: '#1C1A17',
                border: '1px solid #E8E3DD',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239A938B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 36,
              }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Default Check-in Time */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#1C1A17' }}>Default Check-in Time</p>
            <p className="text-xs mb-2" style={{ color: '#9A938B' }}>When you prefer to log your day</p>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #E8E3DD' }}>
              {(['morning', 'evening'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => updatePref('checkInTime', option)}
                  className="flex-1 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: prefs.checkInTime === option ? '#C49A6C' : '#F0EDE8',
                    color: prefs.checkInTime === option ? '#FFFFFF' : '#6B6560',
                  }}
                >
                  {option === 'morning' ? 'Morning' : 'Evening'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section>
        <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>Notifications</h2>
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          {/* Morning Reminder */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Morning Reminder</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Daily at 7:00 AM</p>
            </div>
            <Toggle checked={notifPrefs.morningReminder} onChange={v => updateNotifPref('morningReminder', v)} />
          </div>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Evening Reminder */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Evening Reminder</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Daily at 9:00 PM</p>
            </div>
            <Toggle checked={notifPrefs.eveningReminder} onChange={v => updateNotifPref('eveningReminder', v)} />
          </div>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Streak Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Streak at Risk</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Alert when your streak may break</p>
            </div>
            <Toggle checked={notifPrefs.streakAlerts} onChange={v => updateNotifPref('streakAlerts', v)} />
          </div>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Weekly Summary */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Weekly Summary</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Overview of your week every Sunday</p>
            </div>
            <Toggle checked={notifPrefs.weeklySummary} onChange={v => updateNotifPref('weeklySummary', v)} />
          </div>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Permission Note */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs" style={{ color: '#9A938B' }}>
                Push notifications require browser permission
              </p>
              {notifPermission !== 'default' && (
                <p className="text-xs mt-1" style={{ color: notifPermission === 'granted' ? '#7BAF7E' : '#C47060' }}>
                  Status: {notifPermission === 'granted' ? 'Enabled' : 'Blocked'}
                </p>
              )}
            </div>
            <button
              onClick={handleRequestPermission}
              className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap"
              style={{
                backgroundColor: notifPermission === 'granted' ? 'rgba(123, 175, 126, 0.12)' : 'rgba(196, 154, 108, 0.12)',
                color: notifPermission === 'granted' ? '#7BAF7E' : '#C49A6C',
              }}
            >
              {notifPermission === 'granted' ? 'Enabled' : notifPermission === 'denied' ? 'Blocked' : 'Request Permission'}
            </button>
          </div>
        </div>
      </section>

      {/* Data Section */}
      <section>
        <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>Data</h2>
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            disabled={exporting}
            className="w-full flex items-center justify-between py-2 disabled:opacity-50"
          >
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>
                {exporting ? 'Exporting...' : 'Export as JSON'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Download all your data as JSON</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full flex items-center justify-between py-2 disabled:opacity-50"
          >
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>
                {exporting ? 'Exporting...' : 'Export as CSV'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Download metric entries as spreadsheet</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Clear Local Data */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: '#C47060' }}>Clear Local Data</p>
                <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Remove locally stored goals and check-offs</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C47060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          ) : (
            <div className="py-2 space-y-2">
              <p className="text-sm font-medium" style={{ color: '#C47060' }}>Are you sure?</p>
              <p className="text-xs" style={{ color: '#9A938B' }}>
                This will remove all locally stored goals, check-offs, and preferences. Cloud data is not affected.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearLocalData}
                  className="flex-1 py-2 text-sm font-semibold rounded-xl"
                  style={{ backgroundColor: 'rgba(196, 112, 96, 0.12)', color: '#C47060' }}
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 text-sm font-semibold rounded-xl"
                  style={{ backgroundColor: '#F0EDE8', color: '#6B6560' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />

          {/* Sync Goals */}
          <button
            onClick={handleSyncGoals}
            disabled={syncing}
            className="w-full flex items-center justify-between py-2 disabled:opacity-50"
          >
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>
                {syncing ? 'Syncing...' : 'Sync Goals to Cloud'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
                {user ? 'Push local goals to Supabase' : 'Sign in to enable sync'}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          </button>
        </div>
      </section>

      {/* About Section */}
      <section>
        <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>About</h2>
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#1C1A17' }}>Version</p>
            <p className="text-sm" style={{ color: '#9A938B' }}>1.0.0</p>
          </div>
          <div style={{ height: 1, backgroundColor: '#E8E3DD' }} />
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#1C1A17' }}>AI Engine</p>
            <p className="text-sm" style={{ color: '#9A938B' }}>Powered by Gemini AI</p>
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50"
          style={{ backgroundColor: '#1C1A17', color: '#FAF8F5' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
