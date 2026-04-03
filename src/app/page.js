'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import supabase from '@/lib/supabase';

const steps = [
  {
    number: '01',
    title: 'Choose Your Domain',
    description: 'Pick any topic — Statistics, History, Pop Culture, or anything you want to explore.',
  },
  {
    number: '02',
    title: 'Chat for Clues',
    description: 'Ask the AI bot questions. It will hint, dodge, or puzzle you depending on its personality.',
  },
  {
    number: '03',
    title: 'Guess the Word',
    description: "When you're ready, submit your final guess. Every wrong answer costs points.",
  },
];

const opponents = [
  {
    name: 'The Slacker',
    difficulty: 'Easy',
    difficultyColor: '#22C55E',
    description: 'Laid-back and hint-happy. Will basically tell you the answer if you ask nicely.',
    emoji: '😎',
  },
  {
    name: 'The Professor',
    difficulty: 'Medium',
    difficultyColor: '#157FEC',
    description: 'Academic and methodical. Gives clues in riddles and analogies.',
    emoji: '🎓',
  },
  {
    name: 'The Riddler',
    difficulty: 'Hard',
    difficultyColor: '#EF4444',
    description: 'Cryptic and evasive. Will make you work for every single hint.',
    emoji: '🎭',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/lobby');
        return;
      }
      const guestMode = localStorage.getItem('guestMode');
      if (guestMode === 'true') {
        router.replace('/lobby');
        return;
      }
      setChecking(false);
    });
  }, [router]);

  const handleGuest = () => {
    localStorage.setItem('guestMode', 'true');
    router.push('/lobby');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#157FEC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-white">

      {/* JSON-LD structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Noos Learning',
            url: 'https://noos-learning.vercel.app',
            description: 'Wordle, but smarter. Chat with an AI personality to extract clues and guess the mystery term.',
            applicationCategory: 'Game',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            featureList: [
              'AI-powered conversational hints',
              'Multiple difficulty personalities',
              'Any domain or topic',
              'Guest play — no sign-up required',
            ],
          }),
        }}
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#2E3347] bg-[#0F1117]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/nooslogo.svg" alt="Noos logo" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">Noos Learning</span>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ color: '#FFFFFF' }}
              onClick={() => router.push('/login')}
              className="text-[#A0A8C0] text-sm font-medium transition-colors px-3 py-2"
            >
              Sign In
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/login')}
              className="bg-[#157FEC] hover:bg-[#1270d4] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Play Now
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div style={{
            width: 'min(600px, 90vw)', height: 'min(600px, 90vw)', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(21,127,236,0.1) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 bg-[#157FEC]/10 border border-[#157FEC]/30 text-[#157FEC] text-xs font-semibold px-3 py-1 rounded-full mb-6">
            AI-Powered Word Game
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Wordle,<br className="sm:hidden" /> but smarter.
          </h1>
          <p className="text-lg sm:text-xl text-[#A0A8C0] max-w-xl mx-auto mb-10">
            Chat with an AI bot to extract clues and guess the mystery term.
            The bot's personality controls how helpful — or evasive — it is.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/login')}
              className="bg-[#157FEC] hover:bg-[#1270d4] text-white text-base font-semibold px-8 py-4 rounded-full w-full sm:w-auto transition-colors"
            >
              Start Playing Free
            </motion.button>
            <motion.button
              whileHover={{ color: '#FFFFFF' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGuest}
              className="text-[#A0A8C0] text-base font-medium px-6 py-4 transition-colors"
            >
              Try as Guest →
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[#2E3347]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">How it works</h2>
          <p className="text-[#A0A8C0]">Three steps to a smarter kind of Wordle.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6"
            >
              <div className="text-4xl font-extrabold mb-3" style={{ color: 'rgba(21,127,236,0.3)' }}>{step.number}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-[#A0A8C0] text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Opponents */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[#2E3347]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Choose your opponent</h2>
          <p className="text-[#A0A8C0]">Personality is the difficulty dial.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {opponents.map((opp, i) => (
            <motion.div
              key={opp.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="text-5xl">{opp.emoji}</div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-lg">{opp.name}</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: opp.difficultyColor, background: `${opp.difficultyColor}20` }}
                >
                  {opp.difficulty}
                </span>
              </div>
              <p className="text-[#A0A8C0] text-sm leading-relaxed">{opp.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[#2E3347] py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to test your knowledge?</h2>
          <p className="text-[#A0A8C0] mb-8">No download required. Play instantly.</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login')}
            className="bg-[#157FEC] hover:bg-[#1270d4] text-white text-base font-semibold px-10 py-4 rounded-full transition-colors"
          >
            Play Now — It's Free
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2E3347] py-6 text-center text-[#74777F] text-sm">
        <p>© {new Date().getFullYear()} Noos Learning. All rights reserved.</p>
      </footer>
    </div>
  );
}
