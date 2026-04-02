'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '@/lib/supabase';
import { BOT_CONFIG } from '@/lib/personalities';
import { GradientDots } from '@/components/ui/gradient-dots';

const PROMPT_COST = 50;
const GUESS_COST = 150;
const BASE_SCORE = 850;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Strip HTML tags and limit length as XSS defense
function sanitizeText(str, maxLen = 1000) {
  return String(str).replace(/<[^>]*>/g, '').slice(0, maxLen);
}

export default function GamePage() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const lastSentAt = useRef(0); // rate limit: 1 msg/sec

  const [finalTerm, setFinalTerm] = useState(null);
  const [blacklist,  setBlacklist]  = useState([]);
  const [botConfig, setBotConfig] = useState(BOT_CONFIG.professor);
  const [sessionId, setSessionId]  = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [score, setScore] = useState(BASE_SCORE);
  const [scoreChange, setScoreChange] = useState(null);
  const [guessInput, setGuessInput] = useState('');
  const [incorrectGuesses, setIncorrectGuesses] = useState([]);

  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [startTime] = useState(() => new Date());
  const [domain, setDomain] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [funFact, setFunFact] = useState('');

  useEffect(() => {
    function initFromLocalStorage() {
      const term = localStorage.getItem('finalTerm');
      if (!term) { router.push('/lobby'); return; }
      const bl   = JSON.parse(localStorage.getItem('blacklist') || '[]');
      const dom  = localStorage.getItem('domain') || '';
      const diff = localStorage.getItem('difficulty') || 'professor';
      const config = BOT_CONFIG[diff] ?? BOT_CONFIG.professor;
      setFinalTerm(term);
      setBlacklist(bl);
      setDomain(dom);
      setBotConfig(config);
      setMessages([{ role: 'bot', content: sanitizeText(config.greeting), time: formatTime(new Date()) }]);
    }

    // Both guest and authenticated paths store game data in localStorage.
    // For authenticated users, gameSessionId is also stored to update the row on completion.
    const id = localStorage.getItem('gameSessionId');
    if (id) setSessionId(id);

    const isGuestGame = localStorage.getItem('guestGame') === 'true';
    if (isGuestGame || id) {
      initFromLocalStorage();
      return;
    }

    router.push('/lobby');
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trigger loss when score hits 0 while still playing
  useEffect(() => {
    if (score === 0 && gameState === 'playing') {
      setGameState('lost');
      saveScore(0, false);
      saveGameSession('lost', 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, gameState]);

  function flashScoreChange(amount) {
    setScoreChange(amount);
    setTimeout(() => setScoreChange(null), 1500);
  }

  async function getBotResponse(userMessage) {
    const history = messages.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content,
    }));

    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history,
        keyword: finalTerm,
        blacklist,
        personalityName: botConfig.name,
        domain,
      }),
    });

    if (!res.ok) throw new Error('Chatbot request failed');
    const data = await res.json();
    return sanitizeText(data.reply);
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || isSending) return;

    // Rate limit: 1 message per second
    const now = Date.now();
    if (now - lastSentAt.current < 1000) return;
    lastSentAt.current = now;

    const userMsg = sanitizeText(chatInput.trim(), 500);
    setChatInput('');
    setIsSending(true);

    setScore((prev) => Math.max(0, prev - PROMPT_COST));
    flashScoreChange(-PROMPT_COST);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg, time: formatTime(new Date()) },
    ]);

    const reply = await getBotResponse(userMsg);
    setPromptsUsed((prev) => prev + 1);

    setMessages((prev) => [
      ...prev,
      { role: 'bot', content: reply, time: formatTime(new Date()) },
    ]);

    setIsSending(false);
  }

  async function handleSubmitGuess() {
    if (!guessInput.trim()) return;

    const guess = sanitizeText(guessInput.trim(), 200);
    const correct = guess.toLowerCase() === finalTerm.toLowerCase();

    if (correct) {
      setGameState('won');
      setGuessInput('');
      await saveScore(score);
      await saveGameSession('won', score);
      // Generate "Did You Know?" blurb non-blocking
      fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Give one surprising, educational sentence about "${finalTerm}" in the context of ${domain}. Do not mention the word itself.`,
          history: [],
          keyword: finalTerm,
          blacklist,
          personalityName: 'The Professor',
          domain,
        }),
      })
        .then((r) => r.json())
        .then((d) => setFunFact(sanitizeText(d.reply)))
        .catch(() => {});
    } else {
      setScore((prev) => Math.max(0, prev - GUESS_COST));
      flashScoreChange(-GUESS_COST);
      setIncorrectGuesses((prev) => [...prev, guess]);
      setGuessInput('');
    }
  }

  async function saveScore(finalScore, won = true) {
    const isGuest = localStorage.getItem('guestMode') === 'true';
    if (isGuest) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('scores').insert({
        user_id: session.user.id,
        score: finalScore,
        guesses_used: incorrectGuesses.length + (won ? 1 : 0),
        won,
      });
    } catch {
      // non-critical — don't block the win screen
    }
  }

  async function saveGameSession(status, finalScore) {
    if (!sessionId) return;
    try {
      const update = { status };
      if (finalScore !== undefined) update.score = finalScore;
      await supabase
        .from('game_sessions')
        .update(update)
        .eq('id', sessionId);
    } catch {
      // non-critical
    }
  }

  function clearGameStorage() {
    localStorage.removeItem('gameSessionId');
    localStorage.removeItem('guestGame');
    localStorage.removeItem('finalTerm');
    localStorage.removeItem('blacklist');
    localStorage.removeItem('domain');
    localStorage.removeItem('difficulty');
  }

  function handleExit() {
    clearGameStorage();
    router.push('/lobby');
  }

  function handlePlayNextRound() {
    clearGameStorage();
    router.push('/lobby');
  }

  function handleGiveUp() {
    setGameState('lost');
    setConfirmGiveUp(false);
    saveScore(0, false);
    saveGameSession('lost', 0);
  }

  const [showShareMenu, setShowShareMenu] = useState(false);

  function getShareText() {
    return `I just played Noos Learning!\nDomain: ${domain || 'Unknown'}\nFinal Score: ${score} pts\nPrompts used: ${promptsUsed}\nWrong guesses: ${incorrectGuesses.length}\nPlay at noos.app`;
  }

  function shareViaWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText())}`, '_blank');
    setShowShareMenu(false);
  }

  // ── Round Complete Screen ──────────────────────────────────────────────────
  if (gameState === 'won') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 bg-[#0F1117] z-50 overflow-y-auto"
      >
        <GradientDots duration={25} className="opacity-20!" />
        {/* Nav */}
        <div className="flex flex-col gap-3 border-b border-[#2E3347] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-white font-bold text-lg">Noos Learning</span>
          <div className="flex flex-wrap gap-4 text-sm text-[#A0A8C0] sm:gap-6">
            <button onClick={() => router.push('/lobby')} className="hover:text-white transition-colors">Home</button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
              className="hover:text-white transition-colors text-[#EF4444] hover:text-red-400"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
          <div className="max-w-xl w-full text-center">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Round Complete!</h1>
              <p className="text-[#22C55E] text-base font-medium mb-8 sm:mb-10 sm:text-lg">You guessed correctly!</p>
            </motion.div>

            {/* Answer reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 24 }}
              className="bg-[#22263A] border border-[#3A3F57] rounded-2xl p-6 mb-5 sm:p-8"
            >
              <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Concept</p>
              <p className="text-white text-2xl font-bold break-words sm:text-3xl">{finalTerm}</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-3">
              {[
                { label: 'Final Score', value: score, unit: 'pts', blue: true },
                { label: 'Prompts Used', value: promptsUsed, unit: null, blue: false },
                { label: 'Wrong Guesses', value: incorrectGuesses.length, unit: null, blue: false },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.35 }}
                  className={`rounded-xl p-4 ${stat.blue ? 'bg-[#157FEC]' : 'bg-[#22263A] border border-[#3A3F57]'}`}
                >
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                  {stat.unit && <p className="text-white/60 text-xs">{stat.unit}</p>}
                </motion.div>
              ))}
            </div>

            {/* Did You Know */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.35 }}
              className="bg-[#22263A] border border-[#3A3F57] rounded-2xl p-5 text-left mb-8 sm:p-6"
            >
              <p className="text-[#157FEC] text-xs font-bold uppercase tracking-widest mb-3">Did You Know?</p>
              <p className="text-white text-sm leading-relaxed">
                {funFact || <><span className="text-white font-semibold">{finalTerm}</span> is a fascinating concept with rich applications across many fields.</>}
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.3 }}
              className="flex flex-col gap-3 justify-center sm:flex-row"
            >
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={handlePlayNextRound}
                className="bg-[#157FEC] text-white font-medium px-8 py-3 rounded-full hover:bg-[#0d6fd8] transition-colors w-full sm:w-auto"
              >
                Play Next Round
              </motion.button>
              <div className="relative w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowShareMenu((v) => !v)}
                  className="border border-[#2E3347] text-[#A0A8C0] font-medium px-8 py-3 rounded-full hover:border-[#5E78A3] hover:text-white transition-colors w-full"
                >
                  Share Results
                </motion.button>
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-14 left-1/2 w-full min-w-[12rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#3A3F57] bg-[#22263A] shadow-xl sm:w-48"
                    >
                      <button
                        onClick={shareViaWhatsApp}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-[#2E3347] transition-colors"
                      >
                        WhatsApp
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Game Over Screen ───────────────────────────────────────────────────────
  if (gameState === 'lost') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 bg-[#0F1117] z-50 overflow-y-auto"
      >
        <GradientDots duration={25} className="opacity-20!" />
        {/* Nav */}
        <div className="flex flex-col gap-3 border-b border-[#2E3347] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-white font-bold text-lg">Noos Learning</span>
          <div className="flex flex-wrap gap-4 text-sm text-[#A0A8C0] sm:gap-6">
            <button onClick={() => router.push('/lobby')} className="hover:text-white transition-colors">Home</button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
              className="hover:text-white transition-colors text-[#EF4444] hover:text-red-400"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
          <div className="max-w-xl w-full text-center">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Game Over</h1>
              <p className="text-[#EF4444] text-base font-medium mb-8 sm:mb-10 sm:text-lg">
                {score === 0 && incorrectGuesses.length > 0 ? "You ran out of points!" : "You gave up."}
              </p>
            </motion.div>

            {/* Answer reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 24 }}
              className="bg-[#22263A] border border-[#3A3F57] rounded-2xl p-6 mb-5 sm:p-8"
            >
              <p className="text-white/60 text-xs uppercase tracking-widest mb-3">The Answer Was</p>
              <p className="text-white text-2xl font-bold break-words sm:text-3xl">{finalTerm}</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
              {[
                { label: 'Final Score', value: 0, unit: 'pts', color: 'bg-[#EF4444]' },
                { label: 'Prompts Used', value: promptsUsed, unit: null, color: 'bg-[#22263A] border border-[#3A3F57]' },
                { label: 'Wrong Guesses', value: incorrectGuesses.length, unit: null, color: 'bg-[#22263A] border border-[#3A3F57]' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.35 }}
                  className={`rounded-xl p-4 ${stat.color}`}
                >
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                  {stat.unit && <p className="text-white/60 text-xs">{stat.unit}</p>}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="flex flex-col gap-3 justify-center sm:flex-row"
            >
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={handlePlayNextRound}
                className="bg-[#157FEC] text-white font-medium px-8 py-3 rounded-full hover:bg-[#0d6fd8] transition-colors w-full sm:w-auto"
              >
                Try Again
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Playing Screen ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#0F1117] lg:h-screen lg:overflow-hidden">

      {/* Top Bar */}
      <header className="bg-[#1A1D27] border-b border-[#2E3347] px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.5)] shrink-0 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:gap-4">
            <AnimatePresence mode="wait">
              {confirmExit ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="text-[#A0A8C0]">Exit game?</span>
                  <button onClick={handleExit} className="text-[#EF4444] hover:text-white font-medium transition-colors">Yes</button>
                  <button onClick={() => setConfirmExit(false)} className="text-[#74777F] hover:text-white transition-colors">No</button>
                </motion.div>
              ) : (
                <motion.button
                  key="exit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ x: -2 }}
                  onClick={() => setConfirmExit(true)}
                  className="w-fit text-[#74777F] hover:text-[#A0A8C0] text-sm transition-colors"
                >
                  ← Exit
                </motion.button>
              )}
            </AnimatePresence>
            <span className="hidden text-[#2E3347] sm:inline">|</span>
            <span className="text-white font-bold">Noos Learning</span>
            <span className="hidden text-[#2E3347] text-lg sm:inline">|</span>
            <span className="text-[#A0A8C0] text-sm break-words">
              {domain ? `Domain: ${domain}` : 'Game in Progress'}
            </span>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <motion.span
              animate={{ opacity: isSending ? [1, 0.4, 1] : 1 }}
              transition={{ repeat: isSending ? Infinity : 0, duration: 1 }}
              className="w-2 h-2 rounded-full bg-[#22C55E] inline-block"
            />
            <span className="text-[#A0A8C0] text-sm">{botConfig.name}</span>
            <span className="text-[#74777F] text-xs ml-1">
              {isSending ? '· Typing…' : '· Online'}
            </span>
          </div>
        </div>
      </header>

      {/* Main — two columns */}
      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">

        {/* Left Panel — Chat */}
        <div className="flex min-h-[26rem] flex-col lg:flex-1 lg:border-r lg:border-[#2E3347] lg:overflow-hidden">

          {/* Bot Header */}
          <div className="px-4 py-4 border-b border-[#2E3347] flex items-center gap-3 shrink-0 sm:px-5">
            <div className="w-10 h-10 rounded-full bg-[#22263A] border border-[#2E3347] flex items-center justify-center text-xl shrink-0">
              {botConfig.emoji}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{botConfig.name}</p>
              <p className="text-[#74777F] text-xs">{isSending ? 'Typing…' : botConfig.status}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-[18rem] max-h-[50vh] sm:max-h-[55vh] lg:max-h-none lg:px-5">
            <div className="text-center text-[#74777F] text-xs mb-1">
              Game started at {formatTime(startTime)}
            </div>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 4 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed sm:max-w-[75%] ${
                      msg.role === 'user'
                        ? 'bg-[#157FEC] text-white rounded-tr-sm'
                        : 'bg-[#1A1D27] text-[#A0A8C0] rounded-tl-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-[#74777F]'}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="flex justify-start"
                >
                  <div className="bg-[#1A1D27] px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((delay) => (
                        <motion.span
                          key={delay}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.7, delay: delay / 1000 }}
                          className="w-2 h-2 bg-[#74777F] rounded-full inline-block"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-4 py-4 border-t border-[#2E3347] shrink-0 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask for a clue (costs ${PROMPT_COST} pts per message)…`}
                maxLength={500}
                disabled={isSending}
                className="flex-1 bg-[#1A1D27] border border-[#2E3347] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#74777F] focus:outline-none focus:border-[#157FEC] disabled:opacity-50 transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] min-w-0"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleSendMessage}
                disabled={isSending || !chatInput.trim()}
                className="bg-[#157FEC] text-white px-4 py-2.5 rounded-xl hover:bg-[#0d6fd8] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,box-shadow] text-lg leading-none shadow-[0_0_16px_rgba(21,127,236,0.4)] hover:shadow-[0_0_24px_rgba(21,127,236,0.6)] w-full sm:w-auto"
              >
                ↑
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Panel — Guess */}
        <div className="relative w-full shrink-0 overflow-y-auto p-4 sm:p-5 lg:w-80 xl:w-96">
          <GradientDots duration={25} backgroundColor="#1A1D27" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {/* Score Card */}
            <div className="bg-[#157FEC] rounded-2xl p-5 text-center relative overflow-hidden shadow-[0_0_40px_rgba(21,127,236,0.3),0_0_80px_rgba(21,127,236,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]">
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Current Score</p>
              <motion.p
                key={score}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-white text-4xl font-bold"
              >
                {score}
              </motion.p>
              <p className="text-white/60 text-xs mt-1">pts</p>
              <AnimatePresence>
                {scoreChange !== null && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-3 right-3 text-xs font-bold text-[#EF4444] bg-black/30 rounded-full px-2 py-0.5"
                  >
                    {scoreChange}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Give Up */}
            <div className="flex justify-center">
              <AnimatePresence mode="wait">
                {confirmGiveUp ? (
                  <motion.div
                    key="confirm-giveup"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-[#A0A8C0]">Give up and see answer?</span>
                    <button onClick={handleGiveUp} className="text-[#EF4444] hover:text-white font-medium transition-colors">Yes</button>
                    <button onClick={() => setConfirmGiveUp(false)} className="text-[#74777F] hover:text-white transition-colors">No</button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="giveup-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ color: '#EF4444' }}
                    onClick={() => setConfirmGiveUp(true)}
                    className="text-[#74777F] text-xs transition-colors"
                  >
                    Give Up
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Guess Section */}
            <div className="bg-[#1A1D27]/60 border border-[#2E3347] rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <p className="text-white font-semibold text-sm mb-1">Ready to guess?</p>
              <p className="text-[#CE6000] text-xs mb-4">Incorrect guesses cost {GUESS_COST} points</p>
              <p className="text-[#74777F] text-xs uppercase tracking-widest mb-2">Who Am I?</p>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                  placeholder="Type answer here…"
                  maxLength={200}
                  className="w-full bg-[#0F1117] border border-[#2E3347] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#74777F] focus:outline-none focus:border-[#157FEC] transition-colors shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmitGuess}
                  disabled={!guessInput.trim()}
                  className="w-full border border-[#5E78A3] text-[#A0A8C0] font-medium py-2.5 rounded-full hover:border-white hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Submit Final Guess
                </motion.button>
              </div>
            </div>

            {/* Incorrect Attempts */}
            <AnimatePresence>
              {incorrectGuesses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[#1A1D27]/60 border border-[#2E3347] rounded-2xl p-5 overflow-hidden backdrop-blur-sm sm:col-span-2 lg:col-span-1"
                >
                  <p className="text-[#74777F] text-xs uppercase tracking-widest mb-3">Incorrect Attempts</p>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {incorrectGuesses.map((guess, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          className="flex justify-between items-center gap-3"
                        >
                          <span className="text-[#A0A8C0] text-sm break-words">{guess}</span>
                          <span className="text-[#EF4444] text-xs font-bold shrink-0">-{GUESS_COST} pts</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cost Info */}
            <div className="bg-[#1A1D27]/60 border border-[#2E3347] rounded-xl p-4 text-xs text-[#74777F] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <div className="flex justify-between mb-1.5 gap-4">
                <span>Per chat message</span>
                <span className="text-[#EF4444] shrink-0">-{PROMPT_COST} pts</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Wrong guess</span>
                <span className="text-[#EF4444] shrink-0">-{GUESS_COST} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
