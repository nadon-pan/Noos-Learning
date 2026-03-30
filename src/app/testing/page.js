'use client';
import { useState } from 'react';

export default function TestGamePage() {
  // --- Game Config State ---
  const [domain, setDomain] = useState('Machine Learning');
  const [personality, setPersonality] = useState('The Professor');
  
  // --- Secret Game Data (The "Vault") ---
  const [gameData, setGameData] = useState({
    keyword: '',
    blacklist: [],
    active: false,
  });

  // --- UI & Chat State ---
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState('IDLE'); // IDLE, PLAYING, WON

  // --- 1. Call API: Initialize Game ---
  const initGame = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/init-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, personality }),
      });
      const data = await res.json();

      console.log("API Result:", data); // DEBUG
      
      setGameData({
        keyword: data.keyword,
        blacklist: data.blacklist,
        active: true,
      });
      setChatHistory([]);
      setGameStatus('PLAYING');
      console.log("Game Started! Secret is:", data.keyword);
    } catch (err) {
      alert("Failed to init game");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Call API: Chatbot ---
  const handleSendMessage = async () => {
    if (!userInput) return;

    const newHistory = [...chatHistory, { role: 'user', content: userInput }];
    setChatHistory(newHistory);
    setUserInput('');

    try {
        console.log("SENDING TO API:", { message: userInput, history: chatHistory, keyword: gameData.keyword, blacklist: gameData.blacklist, personalityName: personality, domain: domain });
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          history: chatHistory,
          keyword: gameData.keyword,
          blacklist: gameData.blacklist,
          personalityName: personality,
          domain: domain
        }),
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error("Chat error", err);
    }
  };

  // --- 3. Local Logic: Check Guess ---
  const submitGuess = () => {
    if (guess.toLowerCase().trim() === gameData.keyword.toLowerCase()) {
      setGameStatus('WON');
    } else {
      alert("Nope! That's not it. Keep asking questions!");
      setGuess('');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🧩 AI Deduction Test Bench</h1>

      {/* --- LOBBY SECTION --- */}
      {gameStatus === 'IDLE' && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Step 1: Setup Game</h3>
          <label>Domain: </label>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} />
          <br /><br />
          <label>Personality: </label>
          <select value={personality} onChange={(e) => setPersonality(e.target.value)}>
            <option value="The Slacker">The Slacker</option>
            <option value="The Professor">The Professor</option>
            <option value="The Riddler">The Riddler</option>
          </select>
          <br /><br />
          <button onClick={initGame} disabled={loading}>
            {loading ? 'Generating...' : 'Start Game'}
          </button>
        </div>
      )}

      {/* --- GAMEPLAY SECTION --- */}
      {gameStatus === 'PLAYING' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          {/* Left: Chat */}
          <section>
            <div style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
              {chatHistory.map((msg, i) => (
                <p key={i} style={{ color: msg.role === 'user' ? 'blue' : 'green' }}>
                  <strong>{msg.role === 'user' ? 'You' : personality}:</strong> {msg.content}
                </p>
              ))}
            </div>
            <input 
              style={{ width: '80%' }} 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              placeholder="Ask a question..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
          </section>

          {/* Right: Guessing Box */}
          <section style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
            <h3>Guess the Word</h3>
            <p><small>Domain: {domain}</small></p>
            <input 
              value={guess} 
              onChange={(e) => setGuess(e.target.value)} 
              placeholder="Type your guess..." 
            />
            <button onClick={submitGuess} style={{ marginTop: '10px', width: '100%' }}>Submit Guess</button>
            <hr />
            <p style={{ fontSize: '12px', color: '#999' }}>
              Debug Secret: <strong>{gameData.keyword}</strong><br/>
              Blacklist: {gameData.blacklist.join(', ')}
            </p>
          </section>
        </div>
      )}

      {/* --- WIN SECTION --- */}
      {gameStatus === 'WON' && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>🎉 Correct! The word was {gameData.keyword}</h2>
          <button onClick={() => setGameStatus('IDLE')}>Play Again</button>
        </div>
      )}
    </div>
  );
}