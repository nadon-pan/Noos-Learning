# Noos Learning

> **Wordle, but smarter.** Chat with an AI personality to extract clues and guess the mystery term.

## Live Demo

🔗 **[noos-learning.vercel.app](https://noos-learning.vercel.app)**

---

## What is Noos Learning?

Noos Learning is an AI-powered, conversational word-guessing game. Instead of guessing blindly like in Wordle, players chat with a personality-driven AI bot to extract clues about a hidden concept. The difficulty is driven by the bot's personality — not just word obscurity.

> *"The player is trying to outsmart a personality, not just guess a word."*

---

## Features

- 🤖 **3 AI Personalities** — The Slacker (easy), The Professor (medium), The Riddler (hard)
- 🌐 **Any Domain** — Pick any topic: history, science, pop culture, CI/CD, finance, and more
- 🔤 **Progressive Letter Reveal** — Letters appear randomly on-screen as you chat more
- 🎯 **Smart Hint Sync** — Ask for a letter hint and the bot mentions the exact letter shown on-screen
- 📈 **Score System** — Start at 850 pts; each chat costs 50 pts, wrong guesses cost 150 pts
- 🧠 **No-Repeat Keywords** — Previously seen terms per domain are excluded from future games
- 🏆 **Leaderboard & History** — Track and compare scores across sessions (authenticated users)
- 👤 **Guest Mode** — Play immediately without signing up
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Auth + Database | Supabase (PostgreSQL + Google OAuth) |
| AI | OpenAI GPT-4o-mini |
| Hosting | Vercel |
| Icons | Lucide React |

---

## Project Structure

```
src/
├── app/
│   ├── page.js              # Landing page — hero, how it works, personality cards
│   ├── login/page.js        # Auth — Google OAuth + guest mode
│   ├── lobby/page.js        # Game setup — domain input, opponent picker, history, leaderboard
│   ├── game/page.js         # Core gameplay — chat panel + word reveal tiles + guess input
│   ├── api/
│   │   ├── init-game/       # POST: generates secret keyword + blacklist via OpenAI
│   │   ├── chatbot/         # POST: personality-driven chat responses via OpenAI
│   │   └── og/              # GET: dynamic Open Graph image (1200×630) for social sharing
│   ├── robots.js            # SEO: crawler rules
│   ├── sitemap.js           # SEO: sitemap for Google indexing
│   └── layout.js            # Root layout — global metadata, GA4, ambient background
├── components/
│   └── ui/gradient-dots.tsx # Reusable animated dot background component
└── lib/
    ├── personalities.js     # Bot configs: name, emoji, greeting, difficulty role
    └── supabase.js          # Supabase client singleton (browser-safe)
```

---

## Setup & Local Development

### Prerequisites

- Node.js **v20** (Node v24 causes a known crash — use `nvm use 20`)
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone the repo

```bash
git clone https://github.com/nadon-pan/Noos-Learning.git
cd Noos-Learning
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your own values (see `.env.example` for all required keys).

### 4. Set up Supabase tables

Run the following SQL in your Supabase project's SQL editor:

```sql
-- Tracks scores for the leaderboard
create table scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  score int,
  guesses_used int,
  won boolean,
  created_at timestamp default now()
);

-- Tracks individual game sessions for history tab
create table game_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  word text,
  keyword text,
  blacklist text[],
  status text default 'in_progress',
  score int,
  created_at timestamp default now()
);
```

Enable **Google OAuth** in your Supabase project under Authentication → Providers, and add your site URL to the allowed redirect URLs.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Game Flow

```
Landing (/) → Login (/login) → Lobby (/lobby) → Game (/game)
```

1. **Landing** — Learn how it works, pick a personality, sign in or play as guest
2. **Lobby** — Enter any domain (e.g. `Quantum Physics`), choose your AI opponent, start the game
3. **Game** — Chat with the bot for clues; ask for a letter hint to reveal a random tile
4. **Guess** — Type your answer in the right panel when ready. Wrong guesses cost 150 pts
5. **End** — Win screen shows a fun fact about the answer; Game Over screen shows the answer and stats

---

## Known Limitations

- The bot occasionally drops the letter reveal instruction (LLM non-determinism at temperature 1.1)
- No server-side rate limiting — relies on a client-side 1 msg/sec throttle only
- Used keyword history lives in `localStorage` — resets if the user clears browser data
- Leaderboard and session history require a logged-in account (not available to guests)
- Node.js v24 causes a local dev crash — use Node v20 via `nvm`

---

## Future Improvements

- Server-side rate limiting (e.g. Upstash Redis)
- Multiplayer / challenge-a-friend mode
- Richer share cards (image-based, not just text)
- Per-personality sound effects and ambient music
- Persistent used-keyword history via Supabase instead of localStorage
- Difficulty scaling: longer words, more restrictive blacklists

---

## Team

| Name | Role |
|---|---|
| **Nadon** | Frontend, UI/UX, Database (Supabase), Deployment |
| **Thaddeus** | AI pipeline — keyword generation, chatbot, fun fact API (OpenAI) |
| **Nitya** | Slide deck, demos, presentation |
| **Sheryl** | Member |
| **Mentor** | Desmond |
