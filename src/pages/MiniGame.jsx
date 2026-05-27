import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniGame as Jump } from '../games/Jump';
import BugGame from '../games/BugGame';
import StairGame from '../games/StairGame';

const GAMES = [
  {
    id: 'jump',
    emoji: '🐥',
    title: '자바 퀴즈 러너',
    desc: '장애물을 피하며 자바 퀴즈 풀기!',
    ready: true,
  },
  {
    id: 'bugs',
    emoji: '🪲',
    title: '벌레 잡는 삐약이',
    desc: '버그 코드만 골라 드세요!',
    ready: true,
  },
  {
    id: 'stairs',
    emoji: '🪜',
    title: '무한 계단오르기',
    desc: '얼마나 높이 올라갈 수 있을까?',
    ready: true,
  },
];

export function MiniGame() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  if (selectedGame === 'jump') return <Jump onBack={() => { setSelectedGame(null); setShowModal(true); }} />;
  if (selectedGame === 'bugs') return <BugGame onBack={() => { setSelectedGame(null); setShowModal(true); }} />;
  if (selectedGame === 'stairs') return <StairGame onBack={() => { setSelectedGame(null); setShowModal(true); }} />;

  return (
    <>
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: 'min(860px, 90vw)', maxWidth: '90vw' }}>
            <button className="close-btn" onClick={() => { setShowModal(false); navigate('/'); }}>&times;</button>
            <h2 className="modal-header">🎮 미니게임</h2>

            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              {GAMES.map((game) => (
                <div
                  key={game.id}
                  onClick={() => game.ready && setSelectedGame(game.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '14px',
                    padding: '36px 20px 28px',
                    borderRadius: '20px',
                    background: 'white',
                    border: '2px solid #e0d0b0',
                    cursor: game.ready ? 'pointer' : 'not-allowed',
                    opacity: game.ready ? 1 : 0.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!game.ready) return;
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '52px' }}>{game.emoji}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#3d2b1a', textAlign: 'center' }}>
                    {game.title}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#7a6050', textAlign: 'center', lineHeight: '1.5' }}>
                    {game.desc}
                  </span>
                  {!game.ready && (
                    <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#ffe0a0', fontSize: '0.75rem', color: '#a0600a' }}>
                      준비중 🐣
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}