'use client';

import { useRouter } from 'next/navigation';

const FEATURES = [
  {
    icon: '🟩',
    title: 'Classic Wordle',
    desc: 'Guess a 5-letter word in 6 tries. Familiar rules, fresh challenge every day.',
  },
  {
    icon: '🤖',
    title: 'AI Chatbot Hints',
    desc: 'Stuck on a word? Ask the AI assistant for a nudge — without spoiling the answer.',
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    desc: 'Compete with friends and see who solves the puzzle the fastest. Coming soon.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Guess the Word',
    desc: 'Type any valid 5-letter word and press Enter. You have 6 attempts.',
  },
  {
    step: '2',
    title: 'Read the Colour Clues',
    desc: 'Green = correct letter, correct spot. Yellow = correct letter, wrong spot. Grey = not in the word.',
  },
  {
    step: '3',
    title: 'Ask the AI for Help',
    desc: 'Open the chatbot panel and ask for a hint based on your guesses so far.',
  },
];

// Preview tile grid shown in the hero section
const PREVIEW_ROWS = [
  { letters: ['W', 'O', 'R', 'D', 'S'], colors: ['green', 'grey', 'yellow', 'grey', 'grey'] },
  { letters: ['G', 'U', 'E', 'S', 'S'], colors: ['grey', 'grey', 'grey', 'grey', 'grey'] },
  { letters: ['', '', '', '', ''],       colors: ['empty', 'empty', 'empty', 'empty', 'empty'] },
];

const TILE_COLOR = {
  green:  'bg-green-400 border-green-400 text-white',
  yellow: 'bg-amber-400 border-amber-400 text-white',
  grey:   'bg-stone-300 border-stone-300 text-white',
  empty:  'bg-white border-orange-200 text-stone-800',
};

export default function HomePage() {
  const router = useRouter();

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fffbf7] font-sans">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-orange-100 bg-white">
        <span className="text-xl font-bold text-stone-800">Noos Learning</span>
        <button
          onClick={() => router.push('/game')}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Play Now
        </button>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-10">
        <h1 className="text-5xl font-bold text-stone-800 tracking-tight leading-tight">
          Wordle, but smarter.
        </h1>
        <p className="mt-4 text-stone-500 text-lg max-w-md mx-auto">
          Guess the 5-letter word in 6 tries. Stuck? Ask the AI chatbot for a nudge.
        </p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => router.push('/game')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
          >
            Start Playing
          </button>
          <button
            onClick={scrollToHow}
            className="px-6 py-3 border border-orange-200 text-stone-700 font-medium rounded-xl hover:bg-orange-50 transition-colors"
          >
            How It Works
          </button>
        </div>
      </section>

      {/* Tile preview */}
      <section className="flex justify-center px-6 pb-16">
        <div className="grid gap-2">
          {PREVIEW_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.letters.map((letter, ci) => (
                <div
                  key={ci}
                  className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center font-bold text-lg ${TILE_COLOR[row.colors[ci]]}`}
                >
                  {letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-orange-50">
        <h2 className="text-2xl font-bold text-stone-800 text-center mb-10">Features</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-stone-800 mb-1">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-800 text-center mb-10">How It Works</h2>
        <div className="max-w-xl mx-auto space-y-8">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-5 items-start">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center shrink-0 text-sm">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-stone-800">{s.title}</h3>
                <p className="text-stone-500 text-sm mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-100 px-6 py-8 text-center text-stone-400 text-sm">
        <p className="font-semibold text-stone-600 mb-1">Noos Learning</p>
        <p>Built by Group 6 &middot; Mentor: Desmond &middot; Leader: Nadon</p>
      </footer>
    </div>
  );
}
