import React, { useState, useEffect } from 'react';
import { PAST_STATS_BASELINE } from '../../utils/scoring';
import { supabase } from '../../supabaseClient'; // 프로젝트 경로에 맞게 설정 필요

// ─────────────────────────────────────────────
// 1. 레이더 차트 (전주 vs 이번주 3축 비교)
// ─────────────────────────────────────────────
function RadarChart({ current, baseline }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 96;

  const axes = [
    { key: 'implementation', label: '구현력' },
    { key: 'conceptual',     label: '이해력' },
    { key: 'focus',          label: '집중력' },
  ];

  function getPoint(index, value) {
    const angle = (Math.PI * 2 / axes.length) * index - Math.PI / 2;
    const ratio = Math.min(value, 100) / 100;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  }

  function getLabelPoint(index) {
    const angle = (Math.PI * 2 / axes.length) * index - Math.PI / 2;
    const offset = r + 22;
    return {
      x: cx + offset * Math.cos(angle),
      y: cy + offset * Math.sin(angle),
    };
  }

  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map(level =>
    axes.map((_, i) => {
      const p = getPoint(i, level);
      return `${p.x},${p.y}`;
    }).join(' ')
  );

  const baselinePoints = axes.map((a, i) => {
    const p = getPoint(i, baseline[a.key]);
    return `${p.x},${p.y}`;
  }).join(' ');

  const currentPoints = axes.map((a, i) => {
    const p = getPoint(i, current[a.key]);
    return `${p.x},${p.y}`;
  }).join(' ');

  // 전주 데이터 유효성 체크
  const hasBaseline = baseline && axes.every(a => baseline[a.key] != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 격자 */}
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="#e0d6c8" strokeWidth="1" />
        ))}
        {/* 축선 */}
        {axes.map((_, i) => {
          const p = getPoint(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e0d6c8" strokeWidth="1" />;
        })}
        {/* 전주 (회색 점선) — 데이터 있을 때만 */}
        {hasBaseline && (
          <polygon points={baselinePoints} fill="rgba(120,120,120,0.3)" stroke="#888888" strokeWidth="2" strokeDasharray="4 3" />
        )}
        {/* 이번주 (초록) */}
        <polygon points={currentPoints} fill="rgba(102,187,106,0.2)" stroke="#66bb6a" strokeWidth="2" />
        {/* 이번주 꼭짓점 점 */}
        {axes.map((a, i) => {
          const p = getPoint(i, current[a.key]);
          return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#66bb6a" />;
        })}
        {/* 축 라벨 */}
        {axes.map((a, i) => {
          const lp = getLabelPoint(i);
          return (
            <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="12" fontWeight="600" fill="#5d4037">
              {a.label}
            </text>
          );
        })}
      </svg>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#8d6e63' }}>
        {hasBaseline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', borderTop: '2px dashed #888888', display: 'inline-block' }} />
            전주
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', borderTop: '2px solid #66bb6a', display: 'inline-block' }} />
          이번주
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. 게이지 바 (구현력 / 이해력 / 집중력 공통)
// ─────────────────────────────────────────────
function GaugeBar({ value, baseline, label, gradient }) {
  const delta = value - baseline;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.82rem' }}>
        <span style={{ fontWeight: '600', color: '#3e2723' }}>{label}</span>
        <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
          {value}점
          {/* delta가 유효할 때만 증감 표시 */}
          {!isNaN(delta) && (
            <span style={{ color: delta >= 0 ? '#4caf50' : '#ef5350', fontSize: '0.75rem', marginLeft: '4px' }}>
              {delta >= 0 ? '▲' : '▼'} ({delta >= 0 ? '+' : ''}{delta.toFixed(1)})
            </span>
          )}
        </span>
      </div>
      <div style={{ background: '#f5f0e8', height: '10px', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: gradient, borderRadius: '8px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION 1 메인 컴포넌트
// ─────────────────────────────────────────────
export function StatSection({ stats }) {
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // 💡 StatSection.jsx 내부의 useEffect를 테스트용으로 임시 변경
  useEffect(() => {
    async function getAIFeedback() {
      if (!stats || Object.keys(stats).length === 0) return;
      try {
        setFeedbackLoading(true);

        // ⏱️ 실제 서버와 통신하는 것처럼 1.5초간 대기 (로딩 애니메이션 확인용)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 🐤 [테스트용 더미 데이터] 성공했을 때 화면에 뿌려줄 가짜 피드백 가동
        const fakeFeedback = "구현력 점수가 지난주 대비 <strong>▲ 12점</strong> 상승했구! 탭 전환 횟수가 줄어든 걸 보니 집중력이 아주 좋아졌네 삐빅! 다만 이해력 파트에서 막힐 때 힌트를 조금 더 적극적으로 활용하면 삽질 시간을 줄일 수 있을 거야!";
        
        setFeedback(fakeFeedback);
      } catch (err) {
        console.error("AI 종합 진단 피드백 도출 에러:", err);
        setFeedback("🐤 우웅.. 병아리 선배의 피드백 채널이 일시 조율 중이구! 조금 이따가 다시 요청해줘!");
      } finally {
        setFeedbackLoading(false);
      }
    }

    getAIFeedback();
  }, [stats]);

  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '20px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📈</span> 초보자 친화적 역량 성취 지표
      </h2>

      {/* 상단: 레이더 차트 + 게이지 바 */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* 레이더 차트 */}
        <div style={{ flex: '0 0 auto' }}>
          <RadarChart current={stats} baseline={PAST_STATS_BASELINE} />
        </div>
        {/* 우측: 게이지 바 3개 */}
        <div style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
          <GaugeBar value={stats.implementation} baseline={PAST_STATS_BASELINE.implementation} label="💻 구현력 (Implementation)" gradient="linear-gradient(90deg, #a5d6a7, #66bb6a)" />
          <GaugeBar value={stats.conceptual} baseline={PAST_STATS_BASELINE.conceptual} label="💡 이해력 (Conceptual)" gradient="linear-gradient(90deg, #90caf9, #42a5f5)" />
          <GaugeBar value={stats.focus} baseline={PAST_STATS_BASELINE.focus} label="👁️ 집중력 (Focus)" gradient="linear-gradient(90deg, #ffe082, #ffb74d)" />
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '12px', background: '#f1f8e9', borderRadius: '10px', border: '1px solid #dcedc8', fontSize: '0.8rem', color: '#33691e', lineHeight: '1.6' }}>
        {/* 로딩 표시기 분기문 인젝션 및 레거시 주석 보존 */}
        <strong>💡 엔진 종합 해설:</strong>{" "}
        {feedbackLoading ? (
          <span style={{ color: '#8d6e63', fontStyle: 'italic' }}>병아리 선배가 계측 데이터를 들여다보며 왜 이런 점수가 나왔는지 수식을 디코딩하고 있구... 📝</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: feedback || "어려운 문항에서 빌드가 최종 실패했더라도 끝까지 도전을 지속한 제출 근성 수치가 연산 보정식에 반영되어, 단순 통계 대비 <strong>실제 소스코드 제어력이 탄탄하게 성장</strong>하고 있음을 증명합니다." }} />
        )}
      </div>
    </div>
  );
}
