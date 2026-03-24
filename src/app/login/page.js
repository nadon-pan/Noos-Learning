'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    console.log(`[Auth] ${isSignUp ? 'Sign Up' : 'Sign In'} attempt with email:`, email);

    let result;
    if (isSignUp) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    const { data, error } = result;
    console.log('[Auth] Supabase response:', { data, error });

    if (error) {
      setMessage(error.message);
    } else {
      console.log('[Auth] Success — redirecting to /home');
      router.push('/home');
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    console.log('[Auth] Initiating Google OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    });
    console.log('[Auth] Google OAuth response:', { data, error });
    if (error) setMessage(error.message);
  };

  const handleGuest = () => {
    console.log('[Auth] Continuing as guest — redirecting to /home');
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 tracking-tight">Noos Learning</h1>
          <p className="mt-2 text-stone-500 text-sm">Guess the word. Get a hint. Beat the game.</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-orange-100 rounded-2xl p-8 shadow-sm">
          {/* Sign Up / Sign In toggle */}
          <div className="flex rounded-xl bg-orange-50 p-1 mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isSignUp ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'
              }`}
              onClick={() => { setIsSignUp(true); setMessage(''); }}
            >
              Sign Up
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isSignUp ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'
              }`}
              onClick={() => { setIsSignUp(false); setMessage(''); }}
            >
              Sign In
            </button>
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {message && <p className="text-xs text-red-500">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-orange-100" />
            <span className="text-xs text-stone-400">or</span>
            <div className="flex-1 h-px bg-orange-100" />
          </div>

          {/* Google login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 border border-orange-200 rounded-xl text-stone-700 text-sm font-medium hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Guest */}
          <button
            onClick={handleGuest}
            className="w-full mt-3 py-3 text-stone-400 text-sm hover:text-stone-600 transition-colors"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}
