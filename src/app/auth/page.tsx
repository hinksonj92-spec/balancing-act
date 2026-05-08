'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 -mt-20">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#C49A6C' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#F5F0EB' }}>Balancing Act</h1>
        <p className="text-sm mt-1" style={{ color: '#6B6560' }}>Your AI life balance tracker</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#A39B91' }}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              required={mode === 'signup'}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{
                backgroundColor: '#1C1A17',
                color: '#F5F0EB',
                border: '1px solid #2D2824',
              }}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: '#A39B91' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{
              backgroundColor: '#1C1A17',
              color: '#F5F0EB',
              border: '1px solid #2D2824',
            }}
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: '#A39B91' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{
              backgroundColor: '#1C1A17',
              color: '#F5F0EB',
              border: '1px solid #2D2824',
            }}
          />
        </div>

        {error && (
          <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(196, 112, 96, 0.1)', color: '#C47060' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#C49A6C', color: '#141210' }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p className="text-center text-sm" style={{ color: '#6B6560' }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="hover:underline" style={{ color: '#C49A6C' }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="hover:underline" style={{ color: '#C49A6C' }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </form>

      {/* Demo mode link */}
      <button
        onClick={() => router.push('/')}
        className="mt-8 text-xs transition-colors"
        style={{ color: '#3D3832' }}
      >
        Continue in demo mode →
      </button>
    </div>
  );
}
