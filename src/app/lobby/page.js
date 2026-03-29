'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

function sanitize(str, maxLen = 100) {
  // Strip HTML tags and limit length — DOMPurify not used here since JSX escapes by default,
  // but we strip tags and clamp length as a defense-in-depth measure.
  return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

// Animation variants
const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.3, ease: 'easeOut' } }),
};

const rowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.25 } }),
};

function SkeletonRow() {
  return (
    <div className="flex gap-4 px-5 py-3 border-b border-[#2E3347] animate-pulse">
      <div className="h-4 bg-[#2E3347] rounded w-1/4" />
      <div className="h-4 bg-[#2E3347] rounded w-1/4" />
      <div className="h-4 bg-[#2E3347] rounded w-16" />
      <div className="h-4 bg-[#2E3347] rounded w-20 ml-auto" />
    </div>
  );
}

export default function LobbyPage() {
  const router = useRouter();

  // Auth / shared state
  const [authLoading, setAuthLoading] = useState(true);
  const [playerName, setPlayerName] = useState('Guest');
  const [totalPoints, setTotalPoints] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Lobby tab state
  const [activeTab, setActiveTab] = useState('Lobby');
  const [domain, setDomain] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  // History tab state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Leaderboard tab state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);

  // Settings tab state
  const [displayName, setDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const guest = localStorage.getItem('guestMode') === 'true';
      setIsGuest(guest);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !guest) {
        router.push('/login');
        return;
      }

      if (session) {
        localStorage.removeItem('guestMode');
        setIsGuest(false);
        const user = session.user;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Player';
        setPlayerName(name);
        setCurrentUserId(user.id);
        setIsAuthenticated(true);
        setDisplayName(name);

        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          display_name: name,
        }, { onConflict: 'id' });

        const { data } = await supabase
          .from('scores')
          .select('score')
          .eq('user_id', user.id);
        if (data) {
          setTotalPoints(data.reduce((sum, r) => sum + (r.score ?? 0), 0));
        }
      }

      setAuthLoading(false);
    }
    init();
  }, []);

  // ── History fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'History') return;
    if (isGuest || !isAuthenticated) return;

    async function fetchHistory() {
      setHistoryLoading(true);
      setHistoryError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setHistoryLoading(false); return; }

      const { data } = await supabase
        .from('game_sessions')
        .select('id, domain, personality, status, started_at')
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(50);

      setHistoryData(data ?? []);
      setHistoryLoading(false);
    }

    fetchHistory();
  }, [activeTab, isAuthenticated, isGuest]);

  // ── Leaderboard fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Leaderboard') return;

    async function fetchLeaderboard() {
      setLeaderboardLoading(true);
      setLeaderboardError(null);

      const { data: scoreData, error: scoreError } = await supabase
        .from('scores')
        .select('user_id, score');

      if (scoreError) {
        setLeaderboardError('Failed to load leaderboard.');
        setLeaderboardLoading(false);
        return;
      }

      const aggregated = {};
      for (const row of scoreData ?? []) {
        if (!aggregated[row.user_id]) {
          aggregated[row.user_id] = { user_id: row.user_id, total: 0, games: 0 };
        }
        aggregated[row.user_id].total += row.score ?? 0;
        aggregated[row.user_id].games += 1;
      }

      const sorted = Object.values(aggregated)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      if (sorted.length === 0) {
        setLeaderboardData([]);
        setLeaderboardLoading(false);
        return;
      }

      const userIds = sorted.map(r => r.user_id);
      const { data: userData } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', userIds);

      const nameMap = {};
      for (const u of userData ?? []) {
        nameMap[u.id] = u.display_name;
      }

      setLeaderboardData(sorted.map((r, i) => ({
        rank: i + 1,
        user_id: r.user_id,
        display_name: nameMap[r.user_id] || 'Anonymous',
        total: r.total,
        games: r.games,
      })));
      setLeaderboardLoading(false);
    }

    fetchLeaderboard();
  }, [activeTab]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleStartGame() {
    if (!domain.trim()) {
      setStartError('Please enter a domain before starting.');
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const safeDomain = sanitize(domain, 100);
      const finalTerm = await getDomainTerm(safeDomain);
      localStorage.setItem('finalTerm', finalTerm);
      localStorage.setItem('difficulty', OPPONENTS[selectedOpponent].id);
      localStorage.setItem('domain', safeDomain);
      router.push('/game');
    } catch {
      setStartError('Failed to start game. Please try again.');
      setIsStarting(false);
    }
  }

  async function handleSaveDisplayName() {
    if (!displayName.trim()) return;
    setDisplayNameSaving(true);
    setDisplayNameError(null);
    setDisplayNameSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDisplayNameSaving(false); return; }

    const safeName = sanitize(displayName, 50);
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, display_name: safeName }, { onConflict: 'id' });

    if (error) {
      setDisplayNameError('Failed to save. Please try again.');
    } else {
      setDisplayNameSuccess(true);
      setPlayerName(safeName);
    }
    setDisplayNameSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('guestMode');
    localStorage.removeItem('finalTerm');
    localStorage.removeItem('difficulty');
    localStorage.removeItem('domain');
    router.push('/login');
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#A0A8C0] text-sm"
        >
          Loading…
        </motion.div>
      </div>
    );
  }

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    { label: 'Lobby',       icon: '🏠',  locked: false },
    { label: 'History',     icon: '📋',  locked: isGuest },
    { label: 'Leaderboard', icon: '🏆',  locked: false },
    { label: 'Settings',    icon: '⚙️',  locked: false },
  ];

  const rankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#0F1117]">

      {/* ── Left Sidebar ── */}
      <aside className="w-64 bg-[#22263A] border-r border-[#2E3347] flex flex-col fixed inset-y-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="px-6 pt-6 pb-4 border-b border-[#2E3347]"
        >
          <span className="text-white font-bold text-xl tracking-tight">Noos</span>
        </motion.div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {navItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              onClick={() => setActiveTab(item.label)}
              className="relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            >
              {activeTab === item.label && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[#157FEC] rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <div className={`relative flex items-center gap-3 z-10 ${activeTab === item.label ? 'text-white' : 'text-[#A0A8C0]'}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.locked && <span className="relative z-10 text-xs opacity-60">🔒</span>}
            </motion.div>
          ))}
        </nav>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="px-4 py-4 border-t border-[#2E3347] flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-[#157FEC] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {playerName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{playerName}</p>
            <p className="text-[#74777F] text-xs">{isGuest ? 'Guest' : 'Player'}</p>
          </div>
        </motion.div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 ml-64 overflow-y-auto px-8 py-8 pb-24">
        <AnimatePresence mode="wait">

          {/* ── LOBBY TAB ── */}
          {activeTab === 'Lobby' && (
            <motion.div key="lobby" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-white">Welcome back, {playerName}</h1>
                  <p className="text-[#A0A8C0] text-sm mt-1">Ready to play? Choose your domain and opponent.</p>
                </div>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                  className="bg-[#157FEC] rounded-xl px-5 py-3 text-center shrink-0 ml-6"
                >
                  <p className="text-white text-xs uppercase tracking-wide font-medium">Total Points</p>
                  <p className="text-white text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                </motion.div>
              </div>

              <section className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-1">Choose Your Domain</h2>
                <p className="text-[#A0A8C0] text-sm mb-4">Enter any topic — the harder the domain, the trickier the term.</p>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Machine Learning, Ancient Rome, Jazz Music…"
                  className="w-full bg-[#1A1D27] border border-[#2E3347] rounded-xl px-4 py-3 text-white placeholder-[#74777F] text-sm focus:outline-none focus:border-[#157FEC] transition-colors"
                />
                <div className="flex gap-2 flex-wrap mt-3">
                  {DOMAIN_SUGGESTIONS.map((chip, i) => (
                    <motion.button
                      key={chip}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDomain(chip)}
                      className="bg-[#1A1D27] border border-[#2E3347] rounded-full px-4 py-1.5 text-[#A0A8C0] text-sm hover:border-[#157FEC] hover:text-white transition-colors"
                    >
                      {chip}
                    </motion.button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Select Your Opponent</h2>
                  <span className="text-[#74777F] text-sm">3 Opponents Available</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {OPPONENTS.map((opp, i) => (
                    <motion.div
                      key={opp.id}
                      custom={i}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedOpponent(i)}
                      className="bg-[#1A1D27] border-2 rounded-2xl p-5 cursor-pointer"
                      style={{ borderColor: selectedOpponent === i ? '#157FEC' : '#2E3347' }}
                    >
                      <AnimatePresence>
                        {selectedOpponent === i && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mb-3"
                          >
                            <span className="bg-[#157FEC] text-white text-xs font-bold rounded-full px-2.5 py-0.5">
                              SELECTED
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="w-16 h-16 rounded-full bg-[#22263A] border-2 border-[#2E3347] mb-3 flex items-center justify-center text-3xl">
                        {opp.emoji}
                      </div>
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
                      <div className="mt-3 pt-3 border-t border-[#2E3347] flex flex-col gap-1 text-xs text-[#74777F]">
                        <span>Helpfulness: {opp.stats.helpfulness}</span>
                        <span>Evasion: {opp.stats.evasion}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'History' && (
            <motion.div key="history" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Game History</h1>
                <p className="text-[#A0A8C0] text-sm mt-1">Your past sessions and results.</p>
              </div>

              {isGuest ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-10 text-center"
                >
                  <p className="text-4xl mb-4">🔒</p>
                  <h2 className="text-white font-semibold text-lg mb-2">Log in to view your history</h2>
                  <p className="text-[#A0A8C0] text-sm mb-6">Your game sessions are saved when you have an account.</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => router.push('/login')}
                    className="bg-[#157FEC] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#0d6fd8] transition-colors"
                  >
                    Log In
                  </motion.button>
                </motion.div>
              ) : historyLoading ? (
                <div className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl overflow-hidden">
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : historyError ? (
                <p className="text-[#EF4444] text-sm">{historyError}</p>
              ) : historyData.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-10 text-center"
                >
                  <p className="text-4xl mb-4">🎮</p>
                  <h2 className="text-white font-semibold text-lg mb-2">No games played yet</h2>
                  <p className="text-[#A0A8C0] text-sm mb-6">Start your first game from the Lobby.</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveTab('Lobby')}
                    className="bg-[#157FEC] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#0d6fd8] transition-colors"
                  >
                    Go to Lobby
                  </motion.button>
                </motion.div>
              ) : (
                <div className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2E3347]">
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium">Domain</th>
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium">Opponent</th>
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium">Result</th>
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((row, i) => (
                        <motion.tr
                          key={row.id}
                          custom={i}
                          variants={rowVariants}
                          initial="initial"
                          animate="animate"
                          className={`border-b border-[#2E3347] last:border-0 ${i % 2 === 0 ? '' : 'bg-[#22263A]/40'}`}
                        >
                          <td className="px-5 py-3 text-white font-medium">{row.domain || '—'}</td>
                          <td className="px-5 py-3 text-[#A0A8C0] capitalize">{row.personality || '—'}</td>
                          <td className="px-5 py-3">
                            {row.status === 'won' ? (
                              <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#22C55E]/15 text-[#22C55E]">Won</span>
                            ) : row.status === 'lost' ? (
                              <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#EF4444]/15 text-[#EF4444]">Lost</span>
                            ) : (
                              <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#74777F]/20 text-[#74777F]">In Progress</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-[#74777F]">
                            {row.started_at ? new Date(row.started_at).toLocaleDateString() : '—'}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── LEADERBOARD TAB ── */}
          {activeTab === 'Leaderboard' && (
            <motion.div key="leaderboard" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                <p className="text-[#A0A8C0] text-sm mt-1">Top 20 players by total score.</p>
              </div>

              {leaderboardLoading ? (
                <div className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl overflow-hidden">
                  {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : leaderboardError ? (
                <p className="text-[#EF4444] text-sm">{leaderboardError}</p>
              ) : leaderboardData.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-10 text-center"
                >
                  <p className="text-4xl mb-4">🏆</p>
                  <h2 className="text-white font-semibold text-lg mb-2">No scores yet</h2>
                  <p className="text-[#A0A8C0] text-sm">Be the first to finish a game!</p>
                </motion.div>
              ) : (
                <div className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2E3347]">
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium w-16">Rank</th>
                        <th className="text-left px-5 py-3 text-[#74777F] font-medium">Player</th>
                        <th className="text-right px-5 py-3 text-[#74777F] font-medium">Total Points</th>
                        <th className="text-right px-5 py-3 text-[#74777F] font-medium">Games</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((row, i) => {
                        const isMe = row.user_id === currentUserId;
                        return (
                          <motion.tr
                            key={row.user_id}
                            custom={i}
                            variants={rowVariants}
                            initial="initial"
                            animate="animate"
                            className={`border-b border-[#2E3347] last:border-0 transition-colors ${
                              isMe ? 'bg-[#157FEC]/10 border-l-2 border-l-[#157FEC]' : ''
                            }`}
                          >
                            <td className="px-5 py-3 text-center font-bold text-lg">
                              {typeof rankMedal(row.rank) === 'string' ? (
                                <span>{rankMedal(row.rank)}</span>
                              ) : (
                                <span className="text-[#74777F] text-sm">{row.rank}</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#22263A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {row.display_name[0].toUpperCase()}
                                </div>
                                <span className={`font-medium ${isMe ? 'text-white' : 'text-[#A0A8C0]'}`}>
                                  {row.display_name}
                                  {isMe && <span className="ml-2 text-xs text-[#157FEC] font-normal">(you)</span>}
                                </span>
                              </div>
                            </td>
                            <td className={`px-5 py-3 text-right font-semibold ${isMe ? 'text-white' : 'text-[#A0A8C0]'}`}>
                              {row.total.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right text-[#74777F]">{row.games}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'Settings' && (
            <motion.div key="settings" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-[#A0A8C0] text-sm mt-1">Manage your profile and account.</p>
              </div>

              {isGuest ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-8 mb-4"
                  >
                    <p className="text-3xl mb-3">👤</p>
                    <h2 className="text-white font-semibold text-lg mb-2">You&apos;re playing as a guest</h2>
                    <p className="text-[#A0A8C0] text-sm mb-6">
                      Sign up to save your progress, track your history, and appear on the leaderboard.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => router.push('/login')}
                      className="bg-[#157FEC] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#0d6fd8] transition-colors"
                    >
                      Log In / Sign Up
                    </motion.button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6"
                  >
                    <h3 className="text-white font-semibold mb-1">Session</h3>
                    <p className="text-[#A0A8C0] text-sm mb-4">Leave guest mode and return to the login screen.</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleSignOut}
                      className="bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 font-medium px-5 py-2 rounded-xl hover:bg-[#EF4444]/20 transition-colors text-sm"
                    >
                      Leave Guest Mode
                    </motion.button>
                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col gap-5 max-w-lg">
                  {[
                    // Profile card
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                      className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6"
                    >
                      <h3 className="text-white font-semibold mb-4">Profile</h3>
                      <label className="block text-[#A0A8C0] text-sm mb-2">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        maxLength={50}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          setDisplayNameSuccess(false);
                          setDisplayNameError(null);
                        }}
                        className="w-full bg-[#0F1117] border border-[#2E3347] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#157FEC] transition-colors mb-3"
                      />
                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={handleSaveDisplayName}
                          disabled={displayNameSaving || !displayName.trim()}
                          className="bg-[#157FEC] text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#0d6fd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {displayNameSaving ? 'Saving…' : 'Save'}
                        </motion.button>
                        <AnimatePresence>
                          {displayNameSuccess && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-[#22C55E] text-sm"
                            >
                              Saved!
                            </motion.span>
                          )}
                          {displayNameError && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-[#EF4444] text-sm"
                            >
                              {displayNameError}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>,

                    // Account card
                    <motion.div
                      key="account"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6"
                    >
                      <h3 className="text-white font-semibold mb-4">Account</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#22263A] flex items-center justify-center text-sm">🔗</div>
                        <div>
                          <p className="text-white text-sm font-medium">Google Account</p>
                          <p className="text-[#74777F] text-xs">Connected via Google OAuth</p>
                        </div>
                      </div>
                    </motion.div>,

                    // Session card
                    <motion.div
                      key="session"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6"
                    >
                      <h3 className="text-white font-semibold mb-1">Session</h3>
                      <p className="text-[#A0A8C0] text-sm mb-4">Sign out of your account on this device.</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleSignOut}
                        className="bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 font-medium px-5 py-2 rounded-xl hover:bg-[#EF4444]/20 transition-colors text-sm"
                      >
                        Sign Out
                      </motion.button>
                    </motion.div>,
                  ]}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Fixed Bottom Bar (Lobby only) ── */}
      <AnimatePresence>
        {activeTab === 'Lobby' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-64 right-0 bg-[#1A1D27] border-t border-[#2E3347] px-8 py-4 flex justify-between items-center"
          >
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
              <AnimatePresence>
                {startError && (
                  <motion.p
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[#EF4444] text-sm"
                  >
                    {startError}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartGame}
                disabled={isStarting}
                className="bg-[#157FEC] text-white font-medium px-8 py-3 rounded-full hover:bg-[#0d6fd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isStarting ? 'Starting…' : 'Start Game'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
