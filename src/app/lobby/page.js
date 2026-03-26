'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const OPPONENTS = [
  {
    id: 'slacker',
    name: 'The Slacker',
    difficulty: 'Easy',
    difficultyColor: '#22C55E',
    description: 'Chill and laid-back. Will basically tell you the answer if you ask nicely.',
    emoji: '😎',
    stats: { helpfulness: 'Very High', evasion: 'Low' },
  },
  {
    id: 'professor',
    name: 'The Professor',
    difficulty: 'Medium',
    difficultyColor: '#157FEC',
    description: 'Scholarly and methodical. Gives fair clues but makes you work for them.',
    emoji: '🎓',
    stats: { helpfulness: 'Medium', evasion: 'Medium' },
  },
  {
    id: 'riddler',
    name: 'The Riddler',
    difficulty: 'Hard',
    difficultyColor: '#EF4444',
    description: 'Cryptic and evasive. Every answer raises more questions.',
    emoji: '🎭',
    stats: { helpfulness: 'Low', evasion: 'Very High' },
  },
];

const DOMAIN_SUGGESTIONS = [
  'Historical Figures',
  'Quantum Physics',
  'Classic Literature',
  'Global Economics',
];

// TODO: Replace with real API call → POST /api/domain-generator with body { domain }
async function getDomainTerm(domain) {
  return `${domain} Concept`; // placeholder until Thad's endpoint is ready
}

export default function LobbyPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [playerName, setPlayerName] = useState('Guest');
  const [totalPoints, setTotalPoints] = useState(0);
  const [domain, setDomain] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  useEffect(() => {
    async function init() {
      // Allow guest access without a Supabase session
      const isGuest = localStorage.getItem('guestMode') === 'true';

      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !isGuest) {
        router.push('/login');
        return;
      }

      if (session) {
        const user = session.user;
        setPlayerName(user.user_metadata?.full_name || user.user_metadata?.name || 'Guest');
        const { data } = await supabase
          .from('scores')
          .select('score')
          .eq('user_id', user.id);
        if (data) {
          setTotalPoints(data.reduce((sum, r) => sum + (r.score ?? 0), 0));
        }
      }
      // guest: playerName stays 'Guest', totalPoints stays 0

      setAuthLoading(false);
    }
    init();
  }, []);

  async function handleStartGame() {
    if (!domain.trim()) {
      setStartError('Please enter a domain before starting.');
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const finalTerm = await getDomainTerm(domain.trim());
      localStorage.setItem('finalTerm', finalTerm);
      localStorage.setItem('difficulty', OPPONENTS[selectedOpponent].id);
      localStorage.setItem('domain', domain.trim());
      router.push('/game');
    } catch {
      setStartError('Failed to start game. Please try again.');
      setIsStarting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <p className="text-[#A0A8C0] text-sm">Loading…</p>
      </div>
    );
  }

  const navItems = [
    { label: 'Lobby', icon: '🏠', active: true },
    { label: 'History', icon: '📋', active: false },
    { label: 'Leaderboard', icon: '🏆', active: false },
    { label: 'Settings', icon: '⚙️', active: false },
  ];

  return (
    <div className="flex min-h-screen bg-[#0F1117]">

      {/* Left Sidebar */}
      <aside className="w-64 bg-[#22263A] border-r border-[#2E3347] flex flex-col fixed inset-y-0">
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-[#2E3347]">
          <span className="text-white font-bold text-xl tracking-tight">Noos</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                item.active
                  ? 'bg-[#157FEC] text-white'
                  : 'text-[#A0A8C0] hover:bg-[#1A1D27] hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Player Footer */}
        <div className="px-4 py-4 border-t border-[#2E3347] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#157FEC] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {playerName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{playerName}</p>
            <p className="text-[#74777F] text-xs">Player</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto px-8 py-8 pb-24">

        {/* Header Row */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {playerName}</h1>
            <p className="text-[#A0A8C0] text-sm mt-1">Ready to play? Choose your domain and opponent.</p>
          </div>
          <div className="bg-[#157FEC] rounded-xl px-5 py-3 text-center shrink-0 ml-6">
            <p className="text-white text-xs uppercase tracking-wide font-medium">Total Points</p>
            <p className="text-white text-2xl font-bold">{totalPoints.toLocaleString()}</p>
          </div>
        </div>

        {/* Section 1 — Choose Your Domain */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">Choose Your Domain</h2>
          <p className="text-[#A0A8C0] text-sm mb-4">Enter any topic — the harder the domain, the trickier the term.</p>

          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. Machine Learning, Ancient Rome, Jazz Music…"
            className="w-full bg-[#1A1D27] border border-[#2E3347] rounded-xl px-4 py-3 text-white placeholder-[#74777F] text-sm focus:outline-none focus:border-[#157FEC] transition-colors"
          />

          {/* Suggestion Chips */}
          <div className="flex gap-2 flex-wrap mt-3">
            {DOMAIN_SUGGESTIONS.map((chip) => (
              <button
                key={chip}
                onClick={() => setDomain(chip)}
                className="bg-[#1A1D27] border border-[#2E3347] rounded-full px-4 py-1.5 text-[#A0A8C0] text-sm hover:border-[#157FEC] hover:text-white transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        {/* Section 2 — Select Your Opponent */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Select Your Opponent</h2>
            <span className="text-[#74777F] text-sm">3 Opponents Available</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {OPPONENTS.map((opp, i) => (
              <div
                key={opp.id}
                onClick={() => setSelectedOpponent(i)}
                className="bg-[#1A1D27] border-2 rounded-2xl p-5 cursor-pointer transition-all"
                style={{ borderColor: selectedOpponent === i ? '#157FEC' : '#2E3347' }}
              >
                {/* Selected badge */}
                {selectedOpponent === i && (
                  <div className="mb-3">
                    <span className="bg-[#157FEC] text-white text-xs font-bold rounded-full px-2.5 py-0.5">
                      SELECTED
                    </span>
                  </div>
                )}

                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#22263A] border-2 border-[#2E3347] mb-3 flex items-center justify-center text-3xl">
                  {opp.emoji}
                </div>

                {/* Difficulty badge */}
                <div className="mb-2">
                  <span
                    className="text-xs font-bold rounded-full px-2.5 py-0.5"
                    style={{ color: opp.difficultyColor, backgroundColor: opp.difficultyColor + '20' }}
                  >
                    {opp.difficulty}
                  </span>
                </div>

                <h3 className="text-white font-semibold mb-1">{opp.name}</h3>
                <p className="text-[#A0A8C0] text-sm">{opp.description}</p>

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-[#2E3347] flex flex-col gap-1 text-xs text-[#74777F]">
                  <span>Helpfulness: {opp.stats.helpfulness}</span>
                  <span>Evasion: {opp.stats.evasion}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#1A1D27] border-t border-[#2E3347] px-8 py-4 flex justify-between items-center">
        <div className="text-[#A0A8C0] text-sm">
          Current Session:{' '}
          <span className="text-white font-medium">{domain || '—'}</span>
          {' '}vs{' '}
          <span className="text-white font-medium">{OPPONENTS[selectedOpponent].name}</span>
          {' | '}
          <span style={{ color: OPPONENTS[selectedOpponent].difficultyColor }}>
            {OPPONENTS[selectedOpponent].difficulty}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {startError && <p className="text-[#EF4444] text-sm">{startError}</p>}
          <button
            onClick={handleStartGame}
            disabled={isStarting}
            className="bg-[#157FEC] text-white font-medium px-8 py-3 rounded-full hover:bg-[#0d6fd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStarting ? 'Starting…' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
