import { useState, useEffect, useCallback } from 'react';
import isMobile from '../../utils/isMobile';
import HomeButton from './HomeButton';

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Props:
 *   apiUrl      – base URL for the leaderboard (e.g. `${SERVER}/leaderboard/pacman`)
 *   score       – the player's final score
 *   sessionToken – token from the backend session endpoint (or null)
 *   onPlayAgain – callback fired when the player chooses to play again
 *   visible     – controls whether the overlay is rendered
 */
function Leaderboard({ apiUrl, score, sessionToken, onPlayAgain, visible }) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const fetchLb = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}?page=${p}`);
      const json = await res.json();
      const rows = json.data || [];
      setData(rows);
      setPage(p);
      setHasMore(rows.length === 20);
    } catch {
      setError('Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Reset and fetch when the overlay opens
  useEffect(() => {
    if (!visible) return;
    setData([]);
    setPage(1);
    setSaved(false);
    setSaving(false);
    setName('');
    setError(null);
    fetchLb(1);
  }, [visible, fetchLb]);

  const saveScore = async () => {
    if (!name.trim() || saving || saved) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), score, sessionToken }),
      });

      // Se a resposta não for 2xx
      if (!res.ok) {
        if (res.status === 422) {
          const data = await res.json();
          if (data.error === "Nome inválido") {
            setError("Nome Proibido");
            setSaving(false);
            return; // Interrompe a execução aqui
          }
        }
        // Lança erro para cair no catch genérico caso seja outro status
        throw new Error();
      }

      setSaved(true);
      setSaving(false);
      fetchLb(page);
    } catch (err) {
      setSaving(false);
      // Só define o erro genérico se ainda não houver um erro específico setado
      setError(prev => prev || 'Erro ao salvar.');
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(4,0,18,0.93)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto',
    }}>
      <HomeButton />

      {/* Scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.055) 50%, transparent 50%)',
        backgroundSize: '100% 4px',
      }} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: 'rgba(4,0,18,0.97)',
        border: '1.5px solid rgba(255,45,120,0.35)',
        borderRadius: 8,
        boxShadow: '0 0 50px rgba(255,45,120,0.14), 0 0 100px rgba(180,0,255,0.07), inset 0 0 40px rgba(100,0,255,0.04)',
        padding: isMobile ? '24px 16px 20px' : '32px 30px 26px',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 14,
            color: '#ff2d78', letterSpacing: '0.5em',
            textShadow: '0 0 10px #ff2d7888', marginBottom: 6, opacity: 0.8,
          }}>✦ ✦ ✦</div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isMobile ? 22 : 28,
            fontWeight: 900, letterSpacing: '0.1em',
            color: '#ff2d78',
            textShadow: '0 0 18px #ff2d78, 0 0 36px #ff2d7840',
          }}>GAME OVER</div>
          <div style={{
            marginTop: 6,
            fontFamily: "'Orbitron', sans-serif", fontSize: 13,
            color: '#ffe066', letterSpacing: '0.12em',
            textShadow: '0 0 10px #ffcc00',
          }}>
            SCORE: <span style={{ fontWeight: 900 }}>{score.toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1, marginBottom: 20,
          background: 'linear-gradient(90deg, transparent, #ff2d78, #cc00ff, #00e5ff, transparent)',
          boxShadow: '0 0 8px #ff2d7855',
        }} />

        {/* Save section */}
        {!saved ? (
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 9,
              color: '#00e5ff', letterSpacing: '0.22em', marginBottom: 10,
              textShadow: '0 0 6px #00e5ff', textTransform: 'uppercase',
            }}>Salvar placar</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value.slice(0, 20))}
                onKeyDown={e => { if (e.key === 'Enter') saveScore(); e.stopPropagation(); }}
                placeholder="SEU NOME"
                maxLength={20}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: 'rgba(0,229,255,0.05)',
                  border: '1.5px solid rgba(0,229,255,0.30)',
                  borderRadius: 3, color: '#fff',
                  fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                  letterSpacing: '0.1em', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.30)'}
              />
              <button
                onClick={saveScore}
                disabled={!name.trim() || saving}
                style={{
                  padding: '10px 20px',
                  background: name.trim() && !saving ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.04)',
                  border: '1.5px solid rgba(0,229,255,0.45)',
                  borderRadius: 3, color: '#00e5ff',
                  fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                  cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.1em', fontWeight: 700,
                  opacity: name.trim() && !saving ? 1 : 0.45,
                  boxShadow: name.trim() ? '0 0 12px rgba(0,229,255,0.2)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{saving ? '...' : 'SALVAR'}</button>
            </div>
            {error && (
              <div style={{
                color: '#ff2d78', fontSize: 9, marginTop: 5,
                fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em',
              }}>{error}</div>
            )}
            <button
              onClick={onPlayAgain}
              style={{
                marginTop: 10, background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.28)', fontFamily: "'Orbitron', sans-serif",
                fontSize: 9, letterSpacing: '0.15em', cursor: 'pointer',
                textTransform: 'uppercase', transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
            >jogar novamente sem salvar →</button>
          </div>
        ) : (
          <div style={{ marginBottom: 22, textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 11,
              color: '#00ffcc', textShadow: '0 0 10px #00ffcc',
              letterSpacing: '0.12em', marginBottom: 14,
            }}>✓ PLACAR SALVO!</div>
            <button
              onClick={onPlayAgain}
              style={{
                padding: '12px 36px',
                background: 'rgba(255,45,120,0.10)',
                border: '2px solid #ff2d78',
                borderRadius: 3, color: '#ff2d78',
                fontFamily: "'Orbitron', sans-serif", fontSize: 13,
                cursor: 'pointer', letterSpacing: '0.12em', fontWeight: 700,
                boxShadow: '0 0 18px rgba(255,45,120,0.28)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,120,0.20)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(255,45,120,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,45,120,0.10)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(255,45,120,0.28)'; }}
            >JOGAR NOVAMENTE</button>
          </div>
        )}

        {/* Ranking header */}
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 9,
          color: '#c200ff', letterSpacing: '0.22em', marginBottom: 10,
          textShadow: '0 0 6px #c200ff', textTransform: 'uppercase',
        }}>Ranking</div>

        {/* Table */}
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            fontFamily: "'VT323', monospace", fontSize: 22,
            color: 'rgba(194,0,255,0.55)', letterSpacing: '0.3em',
          }}>LOADING...</div>
        ) : data.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            fontFamily: "'VT323', monospace", fontSize: 18,
            color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em',
          }}>NENHUM PLACAR AINDA</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'NOME', 'SCORE', 'DATA'].map((h, i) => (
                  <th key={h} style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: 8,
                    color: '#c200ff', letterSpacing: '0.18em', fontWeight: 700,
                    padding: '5px 8px',
                    textAlign: i === 0 ? 'center' : i === 2 ? 'right' : 'left',
                    borderBottom: '1px solid rgba(194,0,255,0.18)',
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const rank = (page - 1) * 20 + idx + 1;
                const medalColor = rank === 1 ? '#ffe066' : rank === 2 ? '#b0b8c8' : rank === 3 ? '#ff8844' : null;
                return (
                  <tr key={row.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                  }}>
                    <td style={{
                      textAlign: 'center', padding: '6px 8px',
                      fontFamily: "'VT323', monospace", fontSize: 18,
                      color: medalColor || 'rgba(255,255,255,0.35)',
                      textShadow: medalColor ? `0 0 8px ${medalColor}` : 'none',
                    }}>{rank}</td>
                    <td style={{
                      padding: '6px 8px',
                      fontFamily: "'Orbitron', sans-serif", fontSize: 10,
                      color: '#e0e0ff', letterSpacing: '0.04em',
                      maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{row.name}</td>
                    <td style={{
                      padding: '6px 8px', textAlign: 'right',
                      fontFamily: "'VT323', monospace", fontSize: 20,
                      color: '#ffe066', textShadow: '0 0 6px #ffcc0066',
                    }}>{Number(row.score).toLocaleString()}</td>
                    <td style={{
                      padding: '6px 8px',
                      fontFamily: "'Orbitron', sans-serif", fontSize: 8,
                      color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{fmtDate(row.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && (page > 1 || hasMore) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 14, marginTop: 16,
          }}>
            <button
              onClick={() => fetchLb(page - 1)}
              disabled={page === 1}
              style={{
                width: 32, height: 32,
                background: 'rgba(0,229,255,0.06)',
                border: `1px solid ${page === 1 ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.35)'}`,
                borderRadius: 3, color: page === 1 ? 'rgba(0,229,255,0.2)' : '#00e5ff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: "'VT323', monospace", fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >{'<'}</button>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 9,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em',
            }}>PÁG {page}</span>
            <button
              onClick={() => fetchLb(page + 1)}
              disabled={!hasMore}
              style={{
                width: 32, height: 32,
                background: 'rgba(0,229,255,0.06)',
                border: `1px solid ${!hasMore ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.35)'}`,
                borderRadius: 3, color: !hasMore ? 'rgba(0,229,255,0.2)' : '#00e5ff',
                cursor: !hasMore ? 'not-allowed' : 'pointer',
                fontFamily: "'VT323', monospace", fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >{'>'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
