'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_CATEGORIES, CATEGORY_COLOR_MAP } from '@/lib/types';
import { requestNotificationPermission, loadNotificationPrefs } from '@/lib/notifications';

const ONBOARDING_KEY = 'balancing-act-onboarding-complete';
const NOTIF_STORAGE_KEY = 'balancing-act-notification-prefs';
const TOTAL_STEPS = 4;

// Icon components for categories
function CategoryIcon({ icon, color }: { icon: string; color: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    'book-open': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    'heart': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    'smile': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    'user': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    'activity': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    'dollar-sign': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    'brain': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.4 2.1-1.1 2.8L12 12l-2.9-3.2A4 4 0 0 1 8 6a4 4 0 0 1 4-4z" />
        <path d="M12 12v10" />
        <path d="M8 22h8" />
        <path d="M7 8.5C4.8 9.5 3 11.5 3 14c0 3.3 2.7 6 6 6" />
        <path d="M17 8.5c2.2 1 4 3 4 5.5 0 3.3-2.7 6-6 6" />
      </svg>
    ),
  };
  return <>{iconMap[icon] || iconMap['user']}</>;
}

// Toggle switch component
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
        borderRadius: 12,
        backgroundColor: checked ? '#C49A6C' : '#E8E3DD',
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
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

// Step indicator dots
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === current ? '#C49A6C' : i < current ? '#C49A6C' : '#E8E3DD',
            opacity: i < current ? 0.5 : 1,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ---- Step Components ----

function WelcomeStep() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          backgroundColor: '#C49A6C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1A17', margin: '0 0 12px', lineHeight: 1.2 }}>
        Welcome to<br />Balancing Act
      </h1>
      <p style={{ fontSize: 16, color: '#6B6560', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' }}>
        Track your life balance across what matters most. Just talk naturally about your day and we will handle the rest.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300, margin: '0 auto' }}>
        {[
          { label: 'Voice-first check-ins', desc: 'Talk about your day naturally' },
          { label: '7 life categories', desc: 'Spiritual, family, health, and more' },
          { label: 'AI-powered insights', desc: 'See patterns and track progress' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(196,154,108,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A17' }}>{item.label}</div>
              <div style={{ fontSize: 13, color: '#9A938B', marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryReviewStep({
  categories,
  onToggle,
}: {
  categories: { name: string; description: string | null; color: string | null; icon: string | null; is_active: boolean }[];
  onToggle: (index: number) => void;
}) {
  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1A17', marginBottom: 4, textAlign: 'center' }}>
        Your Categories
      </h2>
      <p style={{ fontSize: 14, color: '#9A938B', marginBottom: 20, textAlign: 'center' }}>
        These are the areas of life you will track. Toggle any off to skip them for now.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat, i) => (
          <div
            key={cat.name}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderLeft: `4px solid ${cat.color || '#C49A6C'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              opacity: cat.is_active ? 1 : 0.5,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${cat.color || '#C49A6C'}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CategoryIcon icon={cat.icon || 'user'} color={cat.color || '#C49A6C'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1A17' }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: '#9A938B', marginTop: 2 }}>{cat.description}</div>
            </div>
            <Toggle checked={cat.is_active} onChange={() => onToggle(i)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationStep({
  permissionState,
  morningEnabled,
  eveningEnabled,
  onRequestPermission,
  onToggleMorning,
  onToggleEvening,
}: {
  permissionState: string;
  morningEnabled: boolean;
  eveningEnabled: boolean;
  onRequestPermission: () => void;
  onToggleMorning: (v: boolean) => void;
  onToggleEvening: (v: boolean) => void;
}) {
  const granted = permissionState === 'granted';
  const denied = permissionState === 'denied';

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: 'rgba(196,154,108,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1A17', marginBottom: 4 }}>
          Stay on Track
        </h2>
        <p style={{ fontSize: 14, color: '#9A938B', maxWidth: 300, margin: '0 auto' }}>
          Get gentle reminders to check in with yourself each day.
        </p>
      </div>

      {!granted && !denied && (
        <button
          onClick={onRequestPermission}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            backgroundColor: '#C49A6C',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          Enable Notifications
        </button>
      )}

      {denied && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: '#FDF2F2',
            color: '#C47060',
            fontSize: 13,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Notifications are blocked. You can enable them later in your browser settings.
        </div>
      )}

      {granted && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            backgroundColor: '#F0F9F1',
            color: '#5A8F5D',
            fontSize: 13,
            marginBottom: 20,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          Notifications enabled
        </div>
      )}

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F0EDE8',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1A17' }}>Morning Reminder</div>
            <div style={{ fontSize: 12, color: '#9A938B', marginTop: 2 }}>7:00 AM — Start your day mindfully</div>
          </div>
          <Toggle checked={morningEnabled} onChange={onToggleMorning} />
        </div>
        <div
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1A17' }}>Evening Reminder</div>
            <div style={{ fontSize: 12, color: '#9A938B', marginTop: 2 }}>9:00 PM — Reflect on your day</div>
          </div>
          <Toggle checked={eveningEnabled} onChange={onToggleEvening} />
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#9A938B', textAlign: 'center', marginTop: 16 }}>
        You can change these anytime in Settings.
      </p>
    </div>
  );
}

function FirstCheckinStep() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          backgroundColor: 'rgba(196,154,108,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1A17', marginBottom: 8 }}>
        You are all set!
      </h2>
      <p style={{ fontSize: 16, color: '#6B6560', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>
        Start your first check-in by telling us about your day. Speak or type — whatever feels natural.
      </p>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: '20px',
          maxWidth: 300,
          margin: '0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: 14, color: '#9A938B', fontStyle: 'italic', lineHeight: 1.5 }}>
          &ldquo;I had a great morning run, spent time reading scripture, and family dinner went well tonight...&rdquo;
        </div>
        <div style={{ fontSize: 12, color: '#C49A6C', marginTop: 12, fontWeight: 500 }}>
          Try saying something like this
        </div>
      </div>
    </div>
  );
}

// ---- Main Onboarding Page ----

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Category state
  const [categories, setCategories] = useState(
    DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  );

  // Notification state
  const [permissionState, setPermissionState] = useState<string>('default');
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);

  useEffect(() => {
    // Check if already completed
    if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY)) {
      router.replace('/');
      return;
    }
    // Check current notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [router]);

  const handleToggleCategory = useCallback((index: number) => {
    setCategories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], is_active: !next[index].is_active };
      return next;
    });
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
  }, []);

  const animateStep = useCallback((newStep: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      animateStep(step + 1);
    }
  }, [step, animateStep]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      animateStep(step - 1);
    }
  }, [step, animateStep]);

  const handleComplete = useCallback(() => {
    // Save notification prefs
    const prefs = loadNotificationPrefs();
    prefs.morningReminder = morningEnabled;
    prefs.eveningReminder = eveningEnabled;
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));

    // Mark onboarding complete
    localStorage.setItem(ONBOARDING_KEY, 'true');

    // Navigate to chat for first check-in
    router.push('/chat');
  }, [morningEnabled, eveningEnabled, router]);

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header area with step indicator */}
      <div style={{ padding: '16px 24px 0' }}>
        <StepIndicator current={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div
        style={{
          flex: 1,
          padding: '0 24px',
          overflow: 'auto',
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateX(20px)' : 'translateX(0)',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
      >
        {step === 0 && <WelcomeStep />}
        {step === 1 && (
          <CategoryReviewStep
            categories={categories}
            onToggle={handleToggleCategory}
          />
        )}
        {step === 2 && (
          <NotificationStep
            permissionState={permissionState}
            morningEnabled={morningEnabled}
            eveningEnabled={eveningEnabled}
            onRequestPermission={handleRequestPermission}
            onToggleMorning={setMorningEnabled}
            onToggleEvening={setEveningEnabled}
          />
        )}
        {step === 3 && <FirstCheckinStep />}
      </div>

      {/* Navigation buttons */}
      <div
        style={{
          padding: '16px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          display: 'flex',
          gap: 12,
        }}
      >
        {step > 0 && (
          <button
            onClick={handleBack}
            style={{
              padding: '14px 24px',
              borderRadius: 12,
              backgroundColor: '#FFFFFF',
              color: '#6B6560',
              fontSize: 15,
              fontWeight: 600,
              border: '1px solid #E8E3DD',
              cursor: 'pointer',
              flex: step > 0 ? '0 0 auto' : undefined,
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={isLastStep ? handleComplete : handleNext}
          style={{
            flex: 1,
            padding: '14px 24px',
            borderRadius: 12,
            backgroundColor: '#C49A6C',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isLastStep ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
