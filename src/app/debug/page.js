'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function DebugPage() {
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState('checking');
  const [dbError, setDbError] = useState(null);
  const [session, setSession] = useState(null);

  const [ls, setLs] = useState({ finalTerm: '', difficulty: '', domain: '', guestMode: '' });
  const [lsInputs, setLsInputs] = useState({ finalTerm: '', difficulty: 'professor', domain: '' });

  const [simStatus, setSimStatus] = useState(null);
  const [scores, setScores] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dbRecordsLoading, setDbRecordsLoading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/lobby');
      return;
    }
    async function init() {
      // Check connection
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        setDbStatus('error');
        setDbError(error.message);
      } else {
        setDbStatus('ok');
      }

      // Get session
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      // Read localStorage
      setLs({
        finalTerm: localStorage.getItem('finalTerm') || '(not set)',
        difficulty: localStorage.getItem('difficulty') || '(not set)',
        domain: localStorage.getItem('domain') || '(not set)',
        guestMode: localStorage.getItem('guestMode') || '(not set)',
      });
      setLsInputs({
        finalTerm: localStorage.getItem('finalTerm') || '',
        difficulty: localStorage.getItem('difficulty') || 'professor',
        domain: localStorage.getItem('domain') || '',
      });
    }
    init();
  }, []);

  async function fetchDbRecords() {
    if (!session) return;
    setDbRecordsLoading(true);
    const { data: s } = await supabase.from('scores').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5);
    const { data: g } = await supabase.from('game_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5);
    setScores(s ?? []);
    setSessions(g ?? []);
    setDbRecordsLoading(false);
  }

  function applyAndGoToGame() {
    localStorage.setItem('finalTerm', lsInputs.finalTerm || 'Test Term');
    localStorage.setItem('difficulty', lsInputs.difficulty || 'professor');
    localStorage.setItem('domain', lsInputs.domain || 'Test Domain');
    router.push('/game');
  }

  async function simulateWin() {
    if (!session) { setSimStatus('error: not logged in'); return; }
    setSimStatus('saving...');
    const { error: e1 } = await supabase.from('scores').insert({
      user_id: session.user.id,
      score: 750,
      guesses_used: 2,
      won: true,
    });
    const { error: e2 } = await supabase.from('game_sessions').insert({
      user_id: session.user.id,
      word: 'Test Concept',
      status: 'won',
    });
    if (e1 || e2) {
      setSimStatus(`error: ${e1?.message || e2?.message}`);
    } else {
      setSimStatus('success');
      await fetchDbRecords();
    }
  }

  const card = { background: '#1A1D27', border: '1px solid #2E3347', borderRadius: 12, padding: 24, marginBottom: 20 };
  const label = { color: '#74777F', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
  const input = { background: '#0F1117', border: '1px solid #2E3347', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none' };
  const btn = (color = '#157FEC') => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 });

  return (
    <div style={{ background: '#0F1117', minHeight: '100vh', padding: 32, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Debug Panel</h1>
          <p style={{ color: '#74777F', fontSize: 14 }}>Dev-only tool to test Supabase, localStorage, and game flow.</p>
          {session && <p style={{ color: '#A0A8C0', fontSize: 13, marginTop: 8 }}>Logged in as: <span style={{ color: '#157FEC' }}>{session.user.email}</span></p>}
          {!session && <p style={{ color: '#CE6000', fontSize: 13, marginTop: 8 }}>Not logged in — simulate win won't work.</p>}
        </div>

        {/* Section A — Supabase Connection */}
        <div style={card}>
          <p style={label}>A — Supabase Connection</p>
          {dbStatus === 'checking' && <p style={{ color: '#A0A8C0' }}>Checking...</p>}
          {dbStatus === 'ok' && <p style={{ color: '#22C55E', fontWeight: 700 }}>Connected ✓</p>}
          {dbStatus === 'error' && (
            <>
              <p style={{ color: '#EF4444', fontWeight: 700 }}>Failed ✗</p>
              <p style={{ color: '#EF4444', fontSize: 13, marginTop: 4 }}>{dbError}</p>
            </>
          )}
        </div>

        {/* Section B — localStorage Inspector */}
        <div style={card}>
          <p style={label}>B — localStorage Inspector</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            {Object.entries(ls).map(([k, v]) => (
              <div key={k} style={{ background: '#0F1117', borderRadius: 6, padding: '6px 10px' }}>
                <span style={{ color: '#74777F' }}>{k}: </span>
                <span style={{ color: '#A0A8C0' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <p style={label}>finalTerm (the answer)</p>
              <input style={input} value={lsInputs.finalTerm} onChange={e => setLsInputs(p => ({ ...p, finalTerm: e.target.value }))} placeholder="e.g. Gradient Descent" />
            </div>
            <div>
              <p style={label}>difficulty</p>
              <select style={input} value={lsInputs.difficulty} onChange={e => setLsInputs(p => ({ ...p, difficulty: e.target.value }))}>
                <option value="slacker">slacker (Easy)</option>
                <option value="professor">professor (Medium)</option>
                <option value="riddler">riddler (Hard)</option>
              </select>
            </div>
            <div>
              <p style={label}>domain</p>
              <input style={input} value={lsInputs.domain} onChange={e => setLsInputs(p => ({ ...p, domain: e.target.value }))} placeholder="e.g. Machine Learning" />
            </div>
          </div>
          <button style={btn()} onClick={applyAndGoToGame}>Apply & Go to Game →</button>
        </div>

        {/* Section C — Simulate Game */}
        <div style={card}>
          <p style={label}>C — Simulate Game Completion</p>
          <p style={{ color: '#A0A8C0', fontSize: 13, marginBottom: 14 }}>Inserts a fake won game (score: 750, word: "Test Concept") directly into Supabase.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={btn('#22C55E')} onClick={simulateWin}>Simulate Win</button>
            {simStatus && (
              <span style={{ fontSize: 13, color: simStatus === 'success' ? '#22C55E' : simStatus === 'saving...' ? '#A0A8C0' : '#EF4444' }}>
                {simStatus === 'success' ? '✓ Saved to DB' : simStatus}
              </span>
            )}
          </div>
        </div>

        {/* Section D — Recent DB Records */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ ...label, marginBottom: 0 }}>D — Recent DB Records</p>
            <button style={{ ...btn('#22263A'), border: '1px solid #2E3347' }} onClick={fetchDbRecords}>
              {dbRecordsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {!session && <p style={{ color: '#74777F', fontSize: 13 }}>Log in to view records.</p>}
          {session && scores.length === 0 && sessions.length === 0 && <p style={{ color: '#74777F', fontSize: 13 }}>No records yet. Click Refresh or Simulate Win.</p>}

          {scores.length > 0 && (
            <>
              <p style={{ color: '#A0A8C0', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>scores (last 5)</p>
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead><tr>{['score', 'guesses_used', 'won', 'created_at'].map(h => <th key={h} style={{ textAlign: 'left', color: '#74777F', padding: '4px 8px' }}>{h}</th>)}</tr></thead>
                  <tbody>{scores.map(r => (
                    <tr key={r.id}>
                      <td style={{ padding: '4px 8px', color: '#157FEC', fontWeight: 700 }}>{r.score}</td>
                      <td style={{ padding: '4px 8px', color: '#A0A8C0' }}>{r.guesses_used}</td>
                      <td style={{ padding: '4px 8px', color: r.won ? '#22C55E' : '#EF4444' }}>{r.won ? 'yes' : 'no'}</td>
                      <td style={{ padding: '4px 8px', color: '#74777F' }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {sessions.length > 0 && (
            <>
              <p style={{ color: '#A0A8C0', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>game_sessions (last 5)</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead><tr>{['word', 'status', 'created_at'].map(h => <th key={h} style={{ textAlign: 'left', color: '#74777F', padding: '4px 8px' }}>{h}</th>)}</tr></thead>
                  <tbody>{sessions.map(r => (
                    <tr key={r.id}>
                      <td style={{ padding: '4px 8px', color: '#fff' }}>{r.word}</td>
                      <td style={{ padding: '4px 8px', color: r.status === 'won' ? '#22C55E' : '#EF4444' }}>{r.status}</td>
                      <td style={{ padding: '4px 8px', color: '#74777F' }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <button style={{ ...btn('#22263A'), border: '1px solid #2E3347', marginTop: 8 }} onClick={() => router.push('/lobby')}>← Back to Lobby</button>
      </div>
    </div>
  );
}
