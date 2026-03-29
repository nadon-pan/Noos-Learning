'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` },
    });
    if (error) setMessage(error.message);
  };

  const handleGuest = () => {
    localStorage.setItem('guestMode', 'true');
    router.push('/lobby');
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white tracking-tight">Noos Learning</h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-2 text-[#A0A8C0] text-sm"
          >
            Guess the word. Get a hint. Beat the game.
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
        >
          <div className="w-full bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.5)]">
            {/* Google login */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: '#22263A' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGoogleLogin}
              className="w-full py-3 border border-[#2E3347] rounded-xl text-[#A0A8C0] text-sm font-medium transition-[background-color,color,box-shadow] flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(21,127,236,0.25)] hover:shadow-[0_0_32px_rgba(21,127,236,0.4)]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </motion.button>

            <AnimatePresence>
              {message && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-xs text-[#EF4444] text-center"
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Guest */}
            <motion.button
              whileHover={{ color: '#A0A8C0' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGuest}
              className="w-full mt-3 py-3 text-[#74777F] text-sm transition-colors"
            >
              Continue as Guest →
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
