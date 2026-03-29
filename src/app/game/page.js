'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '@/lib/supabase';

const BOT_CONFIG = {
  slacker: {
    name: 'The Slacker',
    emoji: '😎',
    status: 'Online · Ready to spill the beans',
    greeting: "Hey! So I'm basically here to help — like, a lot. Just ask me anything and I'll give you some big hints. Ready to get started? 😎",
    responses: [
      (term) => `Ok so honestly, it's pretty closely related to "${term.split(' ')[0]}". Like, that should help a lot.`,
      () => "I'll just say it starts with the letter you probably already guessed. Big hint: think super common knowledge.",
      (term) => `It's literally a famous thing in ${term.includes(' ') ? term.split(' ').slice(1).join(' ') : 'this field'}. Very well known.`,
      () => "Ok I'm basically telling you — it's the most famous example in this area. Like, everyone knows it.",
      (term) => `Fine, fine: the answer has ${term.length} characters. You're basically there now.`,
    ],
  },
  professor: {
    name: 'The Professor',
    emoji: '🎓',
    status: 'Online · Awaiting your inquiry',
    greeting: "Good day. I shall provide scholarly guidance to help you deduce the answer. Each response will illuminate the conceptual landscape methodically. Proceed with your first inquiry.",
    responses: [
      () => "Consider the foundational principles that define this concept. It occupies a central role in its domain.",
      () => "Think about what bridges theory and practice in this area. The concept you seek is both descriptive and prescriptive.",
      () => "A scholar would approach this by examining first principles. What are the essential attributes that distinguish it?",
      () => "This concept is frequently referenced in academic literature. Its applications span both theoretical and empirical work.",
      () => "Consider its relationship to adjacent concepts. It is neither the broadest nor the most specific in its category.",
    ],
  },
  riddler: {
    name: 'The Riddler',
    emoji: '🎭',
    status: 'Online · The game has begun',
    greeting: "I am the question without an answer, the answer without a question. Seek and you may find. Ask and I may mislead. The truth hides in plain sight... or does it? Begin.",
    responses: [
      () => "I speak of it yet never name it. It exists where knowledge meets practice.",
      () => "The blind see it, the sighted overlook it. It is the foundation and the apex simultaneously.",
      () => "Seek not what it is called, but what it does. Its name is merely a shadow of its purpose.",
      () => "Those who know it most, use it least in speech. Those who speak of it most, understand it least.",
      () => "It was here before you asked, and will remain long after your question fades into silence.",
    ],
  },
};

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
  const [botConfig, setBotConfig] = useState(BOT_CONFIG.professor);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [score, setScore] = useState(BASE_SCORE);
  const [scoreChange, setScoreChange] = useState(null);
  const [guessInput, setGuessInput] = useState('');
  const [incorrectGuesses, setIncorrectGuesses] = useState([]);

  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won'
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [startTime] = useState(() => new Date());
  const [responseIndex, setResponseIndex] = useState(0);
  const [domain, setDomain] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    const term = localStorage.getItem('finalTerm');
    const diff = localStorage.getItem('difficulty') || 'professor';
    const dom = localStorage.getItem('domain') || '';

    if (!term) {
      router.push('/lobby');
      return;
    }

    const config = BOT_CONFIG[diff] || BOT_CONFIG.professor;
    setFinalTerm(term);
    setDomain(dom);
    setBotConfig(config);

    setMessages([{
      role: 'bot',
      content: sanitizeText(config.greeting),
      time: formatTime(new Date()),
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function flashScoreChange(amount) {
    setScoreChange(amount);
    setTimeout(() => setScoreChange(null), 1500);
  }

  // TODO: Replace with Thad's real chatbot API call
  async function getBotResponse(_userMessage) {
    const responses = botConfig.responses;
    const reply = responses[responseIndex % responses.length](finalTerm);
    setResponseIndex((prev) => prev + 1);
    return sanitizeText(reply); // sanitize even placeholder responses
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
    } else {
      setScore((prev) => Math.max(0, prev - GUESS_COST));
      flashScoreChange(-GUESS_COST);
      setIncorrectGuesses((prev) => [...prev, guess]);
      setGuessInput('');
    }
  }

  async function saveScore(finalScore) {
    const isGuest = localStorage.getItem('guestMode') === 'true';
    if (isGuest) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('scores').insert({
        user_id: session.user.id,
        score: finalScore,
        guesses_used: incorrectGuesses.length + 1,
        won: true,
      });
    } catch {
      // non-critical — don't block the win screen
    }
  }

  function handleExit() {
    localStorage.removeItem('finalTerm');
    localStorage.removeItem('difficulty');
    localStorage.removeItem('domain');
    router.push('/lobby');
  }

  function handlePlayNextRound() {
    localStorage.removeItem('finalTerm');
    localStorage.removeItem('difficulty');
    localStorage.removeItem('domain');
    router.push('/lobby');
  }

  function handleShareResults() {
    const text = `I just played Noos Learning!\nDomain: ${domain || 'Unknown'}\nFinal Score: ${score} pts\nPrompts used: ${promptsUsed}\nWrong guesses: ${incorrectGuesses.length}`;
    navigator.clipboard.writeText(text).catch(() => {});
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
        {/* Nav */}
        <div className="px-8 py-4 flex justify-between items-center border-b border-[#2E3347]">
          <span className="text-white font-bold text-lg">Noos</span>
          <div className="flex gap-6 text-sm text-[#A0A8C0]">
            <button onClick={() => router.push('/lobby')} className="hover:text-white transition-colors">Home</button>
            <button className="hover:text-white transition-colors">Leaderboard</button>
            <button className="hover:text-white transition-colors">Profile</button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
              className="hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 py-16">
          <div className="max-w-xl w-full text-center">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-4xl font-bold text-white mb-2">Round Complete!</h1>
              <p className="text-[#22C55E] text-lg font-medium mb-10">You guessed correctly!</p>
            </motion.div>

            {/* Answer reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 24 }}
              className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-8 mb-5"
            >
              <p className="text-[#74777F] text-xs uppercase tracking-widest mb-3">Concept</p>
              <p className="text-white text-3xl font-bold">{finalTerm}</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-5">
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
                  className={`rounded-xl p-4 ${stat.blue ? 'bg-[#157FEC]' : 'bg-[#1A1D27] border border-[#2E3347]'}`}
                >
                  <p className={`text-xs uppercase tracking-wide mb-1 ${stat.blue ? 'text-white/70' : 'text-[#74777F]'}`}>{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                  {stat.unit && <p className={`text-xs ${stat.blue ? 'text-white/60' : 'text-[#74777F]'}`}>{stat.unit}</p>}
                </motion.div>
              ))}
            </div>

            {/* Did You Know */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.35 }}
              className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-6 text-left mb-8"
            >
              <p className="text-[#157FEC] text-xs font-bold uppercase tracking-widest mb-3">Did You Know?</p>
              {/* TODO: Replace with Thad's AI-generated educational blurb about the answer */}
              <p className="text-[#A0A8C0] text-sm leading-relaxed">
                <span className="text-white font-medium">{finalTerm}</span> is a fascinating concept with rich applications across many fields. Understanding it deeply can unlock new ways of thinking about problems in its domain.
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.3 }}
              className="flex gap-3 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={handlePlayNextRound}
                className="bg-[#157FEC] text-white font-medium px-8 py-3 rounded-full hover:bg-[#0d6fd8] transition-colors"
              >
                Play Next Round
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={handleShareResults}
                className="border border-[#2E3347] text-[#A0A8C0] font-medium px-8 py-3 rounded-full hover:border-[#5E78A3] hover:text-white transition-colors"
              >
                Share Results
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Playing Screen ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#0F1117] overflow-hidden">

      {/* Top Bar */}
      <header className="bg-[#1A1D27] border-b border-[#2E3347] px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {confirmExit ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex items-center gap-2 text-sm"
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
                className="text-[#74777F] hover:text-[#A0A8C0] text-sm transition-colors"
              >
                ← Exit
              </motion.button>
            )}
          </AnimatePresence>
          <span className="text-[#2E3347]">|</span>
          <span className="text-white font-bold">Noos</span>
          <span className="text-[#2E3347] text-lg">—</span>
          <span className="text-[#A0A8C0] text-sm">
            {domain ? `Domain: ${domain}` : 'Game in Progress'}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
      </header>

      {/* Main — two columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel — Chat */}
        <div className="flex flex-col flex-1 border-r border-[#2E3347] overflow-hidden">

          {/* Bot Header */}
          <div className="px-5 py-4 border-b border-[#2E3347] flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#22263A] border border-[#2E3347] flex items-center justify-center text-xl shrink-0">
              {botConfig.emoji}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{botConfig.name}</p>
              <p className="text-[#74777F] text-xs">{isSending ? 'Typing…' : botConfig.status}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
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
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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
          <div className="px-5 py-4 border-t border-[#2E3347] shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask for a clue (costs ${PROMPT_COST} pts per message)…`}
                maxLength={500}
                disabled={isSending}
                className="flex-1 bg-[#1A1D27] border border-[#2E3347] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#74777F] focus:outline-none focus:border-[#157FEC] disabled:opacity-50 transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleSendMessage}
                disabled={isSending || !chatInput.trim()}
                className="bg-[#157FEC] text-white px-4 py-2.5 rounded-xl hover:bg-[#0d6fd8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg leading-none"
              >
                ↑
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Panel — Guess */}
        <div className="w-80 flex flex-col gap-4 p-5 overflow-y-auto shrink-0">

          {/* Score Card */}
          <div className="bg-[#157FEC] rounded-2xl p-5 text-center relative overflow-hidden">
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

          {/* Guess Section */}
          <div className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-1">Ready to guess?</p>
            <p className="text-[#CE6000] text-xs mb-4">Incorrect guesses cost {GUESS_COST} points</p>
            <p className="text-[#74777F] text-xs uppercase tracking-widest mb-2">Who Am I?</p>
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
              placeholder="Type answer here…"
              maxLength={200}
              className="w-full bg-[#0F1117] border border-[#2E3347] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#74777F] focus:outline-none focus:border-[#157FEC] transition-colors mb-3"
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

          {/* Incorrect Attempts */}
          <AnimatePresence>
            {incorrectGuesses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#1A1D27] border border-[#2E3347] rounded-2xl p-5 overflow-hidden"
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
                        className="flex justify-between items-center"
                      >
                        <span className="text-[#A0A8C0] text-sm">{guess}</span>
                        <span className="text-[#EF4444] text-xs font-bold">-{GUESS_COST} pts</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cost Info */}
          <div className="bg-[#1A1D27] border border-[#2E3347] rounded-xl p-4 text-xs text-[#74777F]">
            <div className="flex justify-between mb-1.5">
              <span>Per chat message</span>
              <span className="text-[#EF4444]">-{PROMPT_COST} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Wrong guess</span>
              <span className="text-[#EF4444]">-{GUESS_COST} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
