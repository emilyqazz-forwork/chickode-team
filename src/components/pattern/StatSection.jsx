import React from 'react';
import { PAST_STATS_BASELINE } from '../../utils/scoring';

// ─────────────────────────────────────────────
// 1. 레이더 차트 (전주 vs 이번주 3축 비교)
// ─────────────────────────────────────────────
function RadarChart({ current, baseline }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;

  const axes = [
    { key: 'implementation', label: '구현력' },
    { key: 'conceptual',     label: '이해력' },
    { key: 'focus',          label: '몰입력' },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
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
        {/* 전주 (회색 점선) */}
        <polygon points={baselinePoints} fill="rgba(180,180,180,0.15)" stroke="#bdbdbd" strokeWidth="1.5" strokeDasharray="4 3" />
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
              fontSize="11" fontWeight="600" fill="#5d4037">
              {a.label}
            </text>
          );
        })}
      </svg>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#8d6e63' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', borderTop: '2px dashed #bdbdbd', display: 'inline-block' }} />
          전주
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', borderTop: '2px solid #66bb6a', display: 'inline-block' }} />
          이번주
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. 스택 바 차트 (이해력 감점 요인 분해)
// ─────────────────────────────────────────────
function ConceptStackBar({ stats }) {
  const hintPenalty   = Math.min(100, Math.round((stats.avgHints || 0) * 12));
  const submitPenalty = Math.min(100 - hintPenalty, Math.round(stats.avgSubmits * 5));
  const earned        = Math.max(0, stats.conceptual);
  const remainW       = Math.max(0, 100 - earned - submitPenalty - hintPenalty);

  const segments = [
    { width: earned,        color: '#42a5f5', label: `획득 ${earned}점` },
    { width: submitPenalty, color: '#ffa726', label: `제출 -${submitPenalty}` },
    { width: hintPenalty,   color: '#ef5350', label: `힌트 -${hintPenalty}` },
    { width: remainW,       color: '#f5f0e8', label: '' },
  ];

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#8d6e63', marginBottom: '8px', fontWeight: '600' }}>
        개념 이해력 감점 요인 분해
      </div>
      <div style={{ display: 'flex', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${s.width}%`, background: s.color, transition: 'width 0.5s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
        {segments.filter(s => s.label).map((s, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5d4037' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 3. 도넛 차트 (몰입력)
// ─────────────────────────────────────────────
function FocusDonut({ value }) {
  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (Math.min(value, 100) / 100);
  const cx = size / 2;
  const cy = size / 2;
  // 60점 이상 초록, 40~60 주황, 40 미만 빨강
  const color = value >= 60 ? '#66bb6a' : value >= 40 ? '#ffa726' : '#ef5350';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f5f0e8" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#3e2723', marginTop: '-8px' }}>{value}점</div>
      <div style={{ fontSize: '11px', color: '#8d6e63' }}>몰입력</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 4. 게이지 바 (구현력 / 이해력 / 몰입력 공통)
// ─────────────────────────────────────────────
function GaugeBar({ value, baseline, label, gradient }) {
  const delta = value - baseline;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
        <span style={{ fontWeight: '600', color: '#3e2723' }}>{label}</span>
        <span style={{ fontWeight: '600' }}>
          {value}점
          <span style={{ color: delta >= 0 ? '#4caf50' : '#ef5350', fontSize: '0.78rem', marginLeft: '4px' }}>
            {delta >= 0 ? '▲' : '▼'} (전주대비 {delta >= 0 ? '+' : ''}{delta.toFixed(1)})
          </span>
        </span>
      </div>
      <div style={{ background: '#f5f0e8', height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: gradient, borderRadius: '10px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION 1 메인 컴포넌트
// ─────────────────────────────────────────────
export function StatSection({ stats }) {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📈</span> 초보자 친화적 역량 성취 지표
      </h2>

      {/* 상단: 레이더 차트 + 도넛 + 스택 바 */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* 레이더 차트 */}
        <div style={{ flex: '0 0 auto' }}>
          <RadarChart current={stats} baseline={PAST_STATS_BASELINE} />
        </div>
        {/* 우측: 도넛 + 스택 바 */}
        <div style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <FocusDonut value={stats.focus} />
            <div style={{ fontSize: '12px', color: '#5d4037', lineHeight: '1.5' }}>
              <strong>인지 몰입력</strong><br />
              빈 공간은 아직 채울 수 있는<br />집중 여지입니다.
            </div>
          </div>
          <ConceptStackBar stats={stats} />
        </div>
      </div>

      {/* 하단: 게이지 바 3개 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <GaugeBar value={stats.implementation} baseline={PAST_STATS_BASELINE.implementation} label="💻 고유 소스코드 구현력 (Implementation)" gradient="linear-gradient(90deg, #a5d6a7, #66bb6a)" />
        <GaugeBar value={stats.conceptual} baseline={PAST_STATS_BASELINE.conceptual} label="💡 개념구조 이해력 (Conceptual Capacity)" gradient="linear-gradient(90deg, #90caf9, #42a5f5)" />
        <GaugeBar value={stats.focus} baseline={PAST_STATS_BASELINE.focus} label="👁️ 인지적 시선 몰입력 (Cognitive Focus)" gradient="linear-gradient(90deg, #ffe082, #ffb74d)" />
      </div>

      <div style={{ marginTop: '20px', padding: '14px', background: '#f1f8e9', borderRadius: '12px', border: '1px solid #dcedc8', fontSize: '0.85rem', color: '#33691e', lineHeight: '1.5' }}>
        <strong>💡 엔진 종합 해설:</strong> 어려운 문항에서 빌드가 최종 실패했더라도 끝까지 도전을 지속한 제출 근성 수치가 연산 보정식에 반영되어, 단순 통계 대비 <strong>실제 소스코드 제어력이 탄탄하게 성장</strong>하고 있음을 증명합니다.
      </div>
    </div>
  );
}