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
        <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Balancing Act</h1>
        <p className="text-sm text-gray-500 mt-1">Your AI life balance tracker</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              required={mode === 'signup'}
              className="w-full bg-dark-card rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-dark-card rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-dark-card rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-purple-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-button py-3 text-sm font-semibold transition-colors"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="text-purple-400 hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-purple-400 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </form>

      {/* Demo mode link */}
      <button
        onClick={() => router.push('/')}
        className="mt-8 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        Continue in demo mode →
      </button>
    </div>
  );
}
