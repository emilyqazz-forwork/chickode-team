// React 훅과 페이지 이동을 위한 React Router 임포트
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 게임 캔버스 해상도 및 물리 엔진 관련 상수
const W = 600;              // 캔버스 가로 너비
const H = 450;              // 캔버스 세로 높이
const GRAVITY = 0.38;       // 캐릭터에 작용하는 중력
const JUMP_V = -11;         // 캐릭터가 점프할 때의 기본 수직 속도
const PLATFORM_W = 80;      // 발판의 가로 크기
const PLATFORM_H = 15;      // 발판의 세로 두께

/**
 * 발판의 종류를 확률적으로 결정하는 함수
 * - 80%: 일반 발판 (normal)
 * - 10%: 스프링 발판 (spring) - 높게 점프
 * - 5%: 폭탄 발판 (bomb) - 주변 발판 파괴
 * - 5%: 조작 반전 발판 (reverse) - 좌우 조작 반전
 */
function rollPlatformType() {
  const r = Math.random();
  if (r < 0.8) return 'normal';
  if (r < 0.9) return 'spring';
  if (r < 0.95) return 'bomb';
  return 'reverse';
}

// 20계단마다 등장하는 Java 문법 퀴즈 데이터 배열
const QUIZ_POOL = [
  { q: 'System.out.println(1 + 2); 결과는?', opts: ['1', '2', '3', '12'], ans: '3' },
  { q: 'String s = "Hi"; s.length() 결과는?', opts: ['1', '2', '3', '4'], ans: '2' },
  { q: 'for(int i=0;i<3;i++) 반복 횟수는?', opts: ['2', '3', '4', '0'], ans: '3' },
  { q: 'System.out.println(10 % 3) 결과는?', opts: ['1', '2', '3', '0'], ans: '1' },
  { q: 'int[] arr = new int[5]; arr.length는?', opts: ['4', '5', '6', '0'], ans: '5' },
  { q: 'System.out.println(2 * 4); 결과는?', opts: ['6', '8', '24', '42'], ans: '8' },
  { q: '"hello".charAt(1) 결과는?', opts: ['h', 'e', 'l', 'o'], ans: 'e' },
  { q: 'System.out.println(10 / 3); 결과는?', opts: ['3', '3.3', '4', '2'], ans: '3' },
  { q: 'int x=5; x+=3; x의 값은?', opts: ['5', '3', '8', '15'], ans: '8' },
  { q: 'System.out.println(true && false); 결과는?', opts: ['true', 'false', 'null', 'error'], ans: 'false' },
];

/**
 * 게임 시작 시 초기 발판 약 20개를 생성하는 함수
 * 화면 하단에서 시작하여 위쪽으로 랜덤하게 배치됨
 */
function generatePlatforms() {
  const platforms = [];
  let y = H - 50;
  // 첫 번째 발판은 무조건 안전한 일반 발판으로 고정 위치에 생성
  platforms.push({ x: 100, y, id: 0, type: 'normal' });
  for (let i = 1; i < 20; i++) {
    y -= 40 + Math.random() * 10;
    platforms.push({
      x: Math.random() * (W - PLATFORM_W),
      y,
      id: i,
      type: rollPlatformType(),
    });
  }
  return platforms;
}

export default function StairGame({ onBack }) {
  // 렌더링에 직접 관여하지 않는 DOM 및 캔버스 루프, 이미지 참조 변수들
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const chickImgRef = useRef(null);
  const navigate = useNavigate();
  
  const initialPlatforms = generatePlatforms();
  
  // React의 재렌더링을 유발하지 않고 60fps로 관리해야 하는 게임 코어 상태값
  const stateRef = useRef({
    bird: { x: 100, y: H - 80, vy: 0 },
    platforms: initialPlatforms,
    cameraY: 0,
    score: 0,
    highestId: 0,
    lastQuizScore: 0,
    keys: { left: false, right: false },
    phase: 'idle', // idle(대기), playing(진행중), quiz(퀴즈 모드), gameover(종료)
    nextPlatformId: 20,
    highestPlatformY: initialPlatforms[initialPlatforms.length - 1].y,
    rainDrops: null,
    stars: null,
    bombFlash: 0,
    reverseTimer: 0,
    caveDecor: null,
  });
  
  // UI 요소(점수, 퀴즈 창 등) 렌더링을 위한 React 상태값
  const [uiPhase, setUiPhase] = useState('idle');
  const [score, setScore] = useState(0);
  const [quiz, setQuiz] = useState(null);

  // 1. 컴포넌트 마운트 시 스크롤을 막고 기존 웹페이지의 상단 UI를 숨김 처리
  useEffect(() => {
    const topControl = document.querySelector('.top-control-layer');
    const menuBtn = document.querySelector('.global-menu-btn');
    const prevOverflow = document.body.style.overflow;
    if (topControl) topControl.style.display = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
    document.body.style.overflow = 'hidden';
    
    // 컴포넌트 언마운트 시 원래대로 복구
    return () => {
      if (topControl) topControl.style.display = '';
      if (menuBtn) menuBtn.style.display = '';
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // 2. 캔버스 렌더링 및 게임 핵심 물리 엔진 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const g = stateRef.current; // 코드 가독성을 위해 상태 객체를 g로 단축

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const LETTERBOX = '#6eb6e8';
    let lastDw = -1;
    let lastDh = -1;
    
    // 화면 크기에 맞춰 캔버스의 비율을 조정하고 레터박스를 그리는 함수
    function applyCanvasTransform() {
      const dpr = window.devicePixelRatio || 1;
      const dw = Math.max(1, canvas.clientWidth);
      const dh = Math.max(1, canvas.clientHeight);
      if (dw !== lastDw || dh !== lastDh) {
        lastDw = dw;
        lastDh = dh;
        canvas.width = Math.floor(dw * dpr);
        canvas.height = Math.floor(dh * dpr);
      }
      const scale = Math.min(dw / W, dh / H);
      const drawW = W * scale;
      const drawH = H * scale;
      const ox = (dw - drawW) / 2;
      const oy = (dh - drawH) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = LETTERBOX;
      ctx.fillRect(0, 0, dw, dh);
      ctx.imageSmoothingEnabled = true;
      if (typeof ctx.imageSmoothingQuality === 'string') ctx.imageSmoothingQuality = 'high';
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
    }

    // 캐릭터 이미지 로드
    const chickImg = new Image();
    chickImg.src = '/images/gamechick.png';
    chickImgRef.current = chickImg;

    // 효과음 로드 및 설정
    const stairJumpSfx = new Audio();
    stairJumpSfx.src = new URL('/audio/stair/stairjump.mp3', window.location.origin).href;
    stairJumpSfx.volume = 0.65;
    stairJumpSfx.load();

    function playStairJump() {
      stairJumpSfx.currentTime = 0;
      stairJumpSfx.play().catch(() => {});
    }

    function makeStairSfx(path) {
      const a = new Audio();
      a.src = new URL(path, window.location.origin).href;
      a.volume = 0.65;
      a.load();
      return a;
    }
    const stairBombSfx = makeStairSfx('/audio/stair/stairbomb.mp3');
    const dizzyStairsSfx = makeStairSfx('/audio/stair/dizzystair.mp3');
    const stairBoingSfx = makeStairSfx('/audio/stair/stairboing.mp3');
    const stairFallingSfx = makeStairSfx('/audio/stair/stairfalling.mp3');

    // 특수 효과음 재생 함수들
    function playStairBomb() {
      stairBombSfx.currentTime = 0;
      stairBombSfx.play().catch(() => {});
    }
    function playDizzyStairs() {
      dizzyStairsSfx.currentTime = 0;
      dizzyStairsSfx.play().catch(() => {});
    }
    function playStairBoing() {
      stairBoingSfx.currentTime = 0;
      stairBoingSfx.play().catch(() => {});
    }
    function playStairFalling() {
      stairFallingSfx.currentTime = 0;
      stairFallingSfx.play().catch(() => {});
    }

    /** 압축 스프링(금속 코일) 시각적 드로잉 함수 */
    function drawMetalSpringAbovePlatform(ctx, cx, platformTopY) {
      const bottomY = platformTopY - 2;
      const coilH = 20;
      const coils = 5;
      const amp = 3.8;
      const steps = coils * 26;
      ctx.save();
      const lg = ctx.createLinearGradient(cx - 6, bottomY - coilH, cx + 6, bottomY);
      lg.addColorStop(0, '#4a4d52');
      lg.addColorStop(0.25, '#9ea3ab');
      lg.addColorStop(0.5, '#f0f2f6');
      lg.addColorStop(0.72, '#8e9298');
      lg.addColorStop(1, '#3d4044');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 2.85;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = t * Math.PI * 2 * coils;
        const y = bottomY - t * coilH;
        const x = cx + Math.cos(ang) * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = t * Math.PI * 2 * coils + 0.35;
        const y = bottomY - t * coilH - 0.5;
        const x = cx + Math.cos(ang) * (amp * 0.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    /** 초반 동굴 배경의 바위 장식 드로잉 함수 */
    function drawRealisticRock(ctx, r) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.scale(1, 0.7);
      const maxR = Math.max(...r.pts.map((p) => p.rad));
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(3, maxR * 0.55, maxR * 0.95, maxR * 0.38, 0.15, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(-maxR * 0.4, -maxR * 0.45, maxR * 0.06, 0, 0, maxR * 1.2);
      g.addColorStop(0, '#c4c0b4');
      g.addColorStop(0.28, '#8a8476');
      g.addColorStop(0.55, '#5c564a');
      g.addColorStop(0.82, '#3a352e');
      g.addColorStop(1, '#1e1b18');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < r.pts.length; i++) {
        const p = r.pts[i];
        const x = Math.cos(p.ang) * p.rad;
        const y = Math.sin(p.ang) * p.rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,14,0.5)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.ellipse(-maxR * 0.32, -maxR * 0.48, maxR * 0.28, maxR * 0.16, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /** 베지어 곡선 좌표 계산 함수 (지렁이 그릴 때 사용) */
    function cubicBezierPoint(t, p0, p1, p2, p3) {
      const u = 1 - t;
      const u2 = u * u;
      const u3 = u2 * u;
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x: u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x,
        y: u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y,
      };
    }

    /** 초반 동굴 배경의 지렁이 장식 드로잉 함수 */
    function drawRealisticWorm(ctx, w) {
      const p0 = { x: w.x0, y: w.y0 };
      const p1 = { x: w.cx1, y: w.cy1 };
      const p2 = { x: w.cx2, y: w.cy2 };
      const p3 = { x: w.x1, y: w.y1 };
      const segments = 26;
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        pts.push(cubicBezierPoint(i / segments, p0, p1, p2, p3));
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const pt = pts[i];
        const t = i / segments;
        const rad = (i === 0 ? 5.2 : 2.9 + Math.sin(t * Math.PI * 5 + w.x0) * 0.45) * 0.95;
        const rg = ctx.createRadialGradient(pt.x - rad * 0.35, pt.y - rad * 0.4, 0, pt.x, pt.y, rad);
        rg.addColorStop(0, '#f5d4c8');
        rg.addColorStop(0.35, '#d88878');
        rg.addColorStop(0.65, '#a05048');
        rg.addColorStop(1, '#4a2824');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rad, rad * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(60,25,22,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i += 2) {
        const pt = pts[i];
        const rad = i === 0 ? 5 : 3.2;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rad * 0.88, rad * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,12,10,0.65)';
      ctx.beginPath();
      ctx.arc(pts[0].x + 1.2, pts[0].y - 0.8, 0.75, 0, Math.PI * 2);
      ctx.arc(pts[0].x - 0.8, pts[0].y - 0.8, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    /** 게임 시작 또는 재시작 시 상태를 초기화하는 함수 */
    function resetState() {
      const platforms = generatePlatforms();
      Object.assign(g, {
        bird: { x: 100, y: H - 80, vy: JUMP_V },
        platforms,
        cameraY: 0,
        score: 0,
        highestId: 0,
        lastQuizScore: 0,
        phase: 'playing',
        nextPlatformId: 20,
        highestPlatformY: platforms[platforms.length - 1].y,
        bombFlash: 0,
        reverseTimer: 0,
        caveDecor: null,
      });
      setScore(0);
      setUiPhase('playing');
      playStairJump();
    }

    // 키보드 이벤트 핸들러 (이동 및 스페이스바로 시작/재시작)
    const onKey = (e) => {
      if (e.type === 'keydown') {
        if (e.code === 'ArrowLeft') g.keys.left = true;
        if (e.code === 'ArrowRight') g.keys.right = true;
        if (e.code === 'Space' && (g.phase === 'idle' || g.phase === 'gameover')) resetState();
      }
      if (e.type === 'keyup') {
        if (e.code === 'ArrowLeft') g.keys.left = false;
        if (e.code === 'ArrowRight') g.keys.right = false;
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);

    // 캔버스 클릭 시 게임 시작/재시작 지원
    canvas.addEventListener('click', () => {
      if (g.phase === 'idle' || g.phase === 'gameover') resetState();
    });

    /** 매 프레임마다 실행되는 코어 게임 루프 함수 */
    function loop() {
      applyCanvasTransform();
      ctx.clearRect(0, 0, W, H);

      // 높이(고도)에 따라 배경색과 장식/이펙트가 변하는 로직
      function drawBackground() {
        const altitude = -g.cameraY; // 올라간 높이

        // 고도별 색상 테이블
        const stages = [
          { alt: 0, top: '#4a7c4e', bot: '#6aaf6e' },
          { alt: 900, top: '#87CEEB', bot: '#c8e6f8' },
          { alt: 2400, top: '#8a9bb0', bot: '#b0bec5' },
          { alt: 4500, top: '#ff8c42', bot: '#ffcc80' },
          { alt: 7500, top: '#1a1a4e', bot: '#3d2b6b' },
          { alt: 12000, top: '#000000', bot: '#0a0a1a' },
          { alt: 18000, top: '#000005', bot: '#00000a' }, // 깊은 우주
          { alt: 25000, top: '#000000', bot: '#000000' }, // 완전한 암흑
        ];

        let stageIdx = 0;
        for (let i = 0; i < stages.length - 1; i++) {
          if (altitude >= stages[i].alt) stageIdx = i;
        }
        const next = Math.min(stageIdx + 1, stages.length - 1);
        const cur = stages[stageIdx];
        const nxt = stages[next];

        // 현재 고도에 맞춰 두 색상 간 자연스러운 보간(그라데이션) 계산
        const range = stages[next].alt - stages[stageIdx].alt || 1;
        const t = Math.min((altitude - stages[stageIdx].alt) / range, 1);

        function lerpColor(c1, c2, t) {
          const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
          const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
          const r = Math.round(r1 + (r2 - r1) * t);
          const gg = Math.round(g1 + (g2 - g1) * t);
          const b = Math.round(b1 + (b2 - b1) * t);
          const hx = (n) => n.toString(16).padStart(2, '0');
          return `#${hx(r)}${hx(gg)}${hx(b)}`;
        }

        const skyTop = lerpColor(cur.top, nxt.top, t);
        const skyBot = lerpColor(cur.bot, nxt.bot, t);
        // 초반 동굴 분위기를 위한 색상 혼합
        const caveBlend = Math.max(0, Math.min(1, 1 - altitude / 900));
        const topColor = lerpColor(skyTop, '#3d2b1a', caveBlend);
        const botColor = lerpColor(skyBot, '#5c3d1e', caveBlend);

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, botColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 초반부 동굴 장식(바위, 지렁이) 렌더링
        if (caveBlend > 0.02) {
          if (!g.caveDecor) {
            const rockCount = 5 + Math.floor(Math.random() * 4);
            const wormCount = 3 + Math.floor(Math.random() * 3);
            g.caveDecor = {
              rocks: Array.from({ length: rockCount }, () => {
                const x = Math.random() * W;
                const y = 40 + Math.random() * (H - 80);
                const rot = Math.random() * Math.PI;
                const n = 7 + Math.floor(Math.random() * 4);
                const base = 10 + Math.random() * 14;
                const pts = [];
                for (let i = 0; i < n; i++) {
                  const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
                  const rad = base * (0.72 + Math.random() * 0.48);
                  pts.push({ ang, rad });
                }
                return { x, y, rot, pts };
              }),
              worms: Array.from({ length: wormCount }, () => {
                const x0 = 22 + Math.random() * (W - 75);
                const y0 = 52 + Math.random() * (H - 108);
                const len = 46 + Math.random() * 44;
                const bend = 16 + Math.random() * 24;
                const dip = (Math.random() - 0.5) * 18;
                return {
                  x0,
                  y0,
                  x1: x0 + len,
                  y1: y0 + dip,
                  cx1: x0 + len * 0.28,
                  cy1: y0 - bend,
                  cx2: x0 + len * 0.72,
                  cy2: y0 + bend * 0.55,
                };
              }),
            };
          }
          ctx.save();
          ctx.globalAlpha = caveBlend;
          for (const r of g.caveDecor.rocks) {
            drawRealisticRock(ctx, r);
          }
          for (const w of g.caveDecor.worms) {
            drawRealisticWorm(ctx, w);
          }
          ctx.restore();
        }

        // 중반부 비 내리는 효과
        if (altitude > 2100 && altitude < 4800) {
          const rainOpacity = altitude < 2400 ? (altitude - 2100) / 300
            : altitude > 4500 ? (4800 - altitude) / 300 : 1;
          if (!g.rainDrops) {
            g.rainDrops = Array.from({ length: 80 }, () => ({
              x: Math.random() * W,
              y: Math.random() * H,
              speed: 6 + Math.random() * 4,
              len: 12 + Math.random() * 8,
            }));
          }
          ctx.strokeStyle = `rgba(174,194,224,${rainOpacity * 0.6})`;
          ctx.lineWidth = 1;
          for (const d of g.rainDrops) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 2, d.y + d.len);
            ctx.stroke();
            d.y += d.speed;
            if (d.y > H) { d.y = -20; d.x = Math.random() * W; }
          }
        } else {
          g.rainDrops = null;
        }

        // 후반부 별이 빛나는 밤하늘~우주 효과
        if (altitude > 6000) {
          const starOpacity = Math.min((altitude - 6000) / 1500, 1);
          if (!g.stars) {
            g.stars = Array.from({ length: 60 }, () => ({
              x: Math.random() * W,
              y: Math.random() * H,
              r: 0.5 + Math.random() * 1.5,
              twinkle: Math.random() * Math.PI * 2,
            }));
          }
          for (const s of g.stars) {
            s.twinkle += 0.05;
            const alpha = starOpacity * (0.5 + Math.sin(s.twinkle) * 0.5);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          g.stars = null;
        }
      }

      drawBackground();

      // 조작 반전 지속 시간 감소
      if (g.reverseTimer > 0) g.reverseTimer -= 1;

      // 물리 엔진 연산 (게임 진행 중일 때만)
      if (g.phase === 'playing') {
        const bird = g.bird;

        // 중력 적용 및 상하 이동
        bird.vy += GRAVITY;
        bird.y += bird.vy;

        // 키보드 조작 (조작 반전 시 방향 반대로)
        const step = 7;
        const rev = g.reverseTimer > 0;
        if (g.keys.left) bird.x += rev ? step : -step;
        if (g.keys.right) bird.x += rev ? -step : step;

        // 화면 좌우 경계를 넘으면 반대편으로 워프
        if (bird.x < 0) bird.x = W;
        if (bird.x > W) bird.x = 0;

        // 카메라가 캐릭터를 따라 위로 올라감
        if (bird.y - g.cameraY < H * 0.4) {
          g.cameraY = bird.y - H * 0.4;
        }

        // 플랫폼 충돌 판정 (떨어질 때만 충돌 검사)
        let landed = null;
        for (const p of g.platforms) {
          if (
            bird.vy > 0 &&
            bird.y + 20 >= p.y &&
            bird.y + 20 <= p.y + PLATFORM_H + bird.vy + 2 &&
            bird.x + 10 > p.x &&
            bird.x - 10 < p.x + PLATFORM_W
          ) {
            landed = p;
            break;
          }
        }
        
        // 발판 충돌(착지) 시 로직
        if (landed) {
          const p = landed;
          bird.y = p.y - 20; // 발판 위에 정확히 고정
          const pType = p.type || 'normal';
          
          // 발판 종류별 특수 효과 분기
          if (pType === 'bomb') {
            const py = p.y;
            bird.vy = 10;
            g.bombFlash = 1; // 화면 붉어짐
            g.platforms = g.platforms.filter((pl) => Math.abs(pl.y - py) > 120); // 폭탄 터지면 주변 발판 제거
            playStairBomb();
          } else if (pType === 'spring') {
            bird.vy = JUMP_V * 3; // 크게 점프
            playStairBoing();
          } else if (pType === 'reverse') {
            bird.vy = JUMP_V;
            g.reverseTimer = 180; // 3초간 조작 반전
            playDizzyStairs();
          } else {
            bird.vy = JUMP_V; // 기본 점프
            playStairJump();
          }

          // 최고 기록 갱신 및 퀴즈 출제 조건 검사 (20계단마다)
          if (p.id > g.highestId) {
            g.highestId = p.id;
            g.score = p.id;
            setScore(p.id);

            if (g.score >= g.lastQuizScore + 20) {
              g.lastQuizScore = g.score;
              g.phase = 'quiz';
              setUiPhase('quiz');
              const q = QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];
              setQuiz(q);
            }
          }
        }

        // 화면 상단 바깥쪽으로 새 플랫폼 무한 생성
        if (g.highestPlatformY > g.cameraY - 150) {
          g.highestPlatformY -= 40 + Math.random() * 10;
          g.platforms.push({
            x: Math.random() * (W - PLATFORM_W),
            y: g.highestPlatformY,
            id: g.nextPlatformId++,
            type: rollPlatformType(),
          });
        }

        // 메모리 관리를 위해 시야에서 한참 멀어진 아래쪽 플랫폼 제거
        g.platforms = g.platforms.filter(p => p.y < g.cameraY + H + 300);

        // 캐릭터가 화면 아래로 떨어지면 게임 오버
        if (bird.y - g.cameraY > H + 90) {
          playStairFalling();
          g.phase = 'gameover';
          setUiPhase('gameover');
        }
      }

      // 화면에 발판 그리기
      for (const p of g.platforms) {
        const screenY = p.y - g.cameraY; // 실제 화면 좌표 계산
        if (screenY > -20 && screenY < H + 20) {
          const pType = p.type || 'normal';
          let fill = '#ffffff';
          let stroke = '#aaaaaa';
          let emoji = '';
          let springGraphic = false;
          
          if (pType === 'spring') {
            fill = '#44cc44';
            stroke = '#2e8b2e';
            springGraphic = true;
          } else if (pType === 'bomb') {
            fill = '#cc4444';
            stroke = '#8b2020';
            emoji = '💣';
          } else if (pType === 'reverse') {
            fill = '#9944cc';
            stroke = '#6a2a99';
            emoji = '🌀';
          }
          
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.roundRect(p.x, screenY, PLATFORM_W, PLATFORM_H, 4);
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
          
          if (springGraphic) {
            drawMetalSpringAbovePlatform(ctx, p.x + PLATFORM_W / 2, screenY);
          } else if (emoji) {
            ctx.font = '14px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#111';
            ctx.fillText(emoji, p.x + PLATFORM_W / 2, screenY - 2);
          }
        }
      }

      // 병아리 캐릭터 이미지 그리기
      const birdScreenY = g.bird.y - g.cameraY;
      const chickImgEl = chickImgRef.current;
      if (chickImgEl && chickImgEl.complete && chickImgEl.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        if (typeof ctx.imageSmoothingQuality === 'string') ctx.imageSmoothingQuality = 'high';
        const cw = 56;
        const ch = 56;
        ctx.drawImage(chickImgEl, g.bird.x - cw / 2, birdScreenY - ch / 2, cw, ch);
      } else {
        // 이미지가 로드되지 않았을 때의 대체 이모지
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐥', g.bird.x, birdScreenY);
      }

      // 폭탄 밟았을 때 화면 붉은빛 깜빡임 처리
      if (g.bombFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${g.bombFlash * 0.45})`;
        ctx.fillRect(0, 0, W, H);
        g.bombFlash -= 0.06;
        if (g.bombFlash < 0) g.bombFlash = 0;
      }

      // 조작 반전 상태일 때 경고 문구 표시
      if (g.reverseTimer > 0 && (g.phase === 'playing' || g.phase === 'quiz')) {
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 3;
        const msg = '🌀 조작 반전!';
        ctx.strokeText(msg, W / 2, 10);
        ctx.fillText(msg, W / 2, 10);
      }

      // 대기(시작 전) 화면 UI 렌더링
      if (g.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪜 무한 계단오르기', W / 2, H / 2 - 24);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('스페이스바 / 클릭으로 시작', W / 2, H / 2 + 14);
        ctx.fillText('← → 방향키로 이동', W / 2, H / 2 + 36);
      }

      // 게임오버 화면 UI 렌더링
      if (g.phase === 'gameover') {
        ctx.fillStyle = 'rgba(200,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', W / 2, H / 2 - 24);
        ctx.font = '16px sans-serif';
        ctx.fillText(`올라간 계단: ${g.score}`, W / 2, H / 2 + 10);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('클릭 / 스페이스바로 재시작', W / 2, H / 2 + 38);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // 메인 루프 시작
    rafRef.current = requestAnimationFrame(loop);

    // 컴포넌트 언마운트 시 메모리 누수 방지를 위한 정리 로직
    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      stairJumpSfx.pause();
      stairBombSfx.pause();
      dizzyStairsSfx.pause();
      stairBoingSfx.pause();
      stairFallingSfx.pause();
    };
  }, []);

  // 퀴즈 답안 선택 시 정오답 판정 함수
  const handleAnswer = (opt) => {
    const g = stateRef.current;
    if (opt === quiz.ans) {
      g.phase = 'playing'; // 정답 시 게임 계속 진행
      setUiPhase('playing');
      setQuiz(null);
    } else {
      g.phase = 'gameover'; // 오답 시 즉시 게임 오버
      setUiPhase('gameover');
      setQuiz(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 500,
      overflow: 'hidden',
      fontFamily: 'Noto Sans KR, sans-serif',
    }}>
      {/* 화면 우상단의 미니게임 돌아가기 버튼 */}
      <button
        type="button"
        onClick={() => (onBack ? onBack() : navigate('/minigame'))}
        style={{
          position: 'absolute',
          top: 16, right: 16,
          padding: '8px 18px',
          borderRadius: 12,
          border: '2px solid #e0d0b0',
          background: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 900,
          color: '#5c3d1e',
          zIndex: 600,
        }}
      >
        ← 돌아가기
      </button>
      
      {/* 실제 게임 그래픽이 렌더링되는 캔버스 영역 */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      />
      
      {/* 화면 좌상단의 타이틀 및 현재 점수 표시 UI */}
      <div style={{
        position: 'absolute',
        top: 52,
        left: 12,
        right: 12,
        zIndex: 550,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none', // 클릭 이벤트가 캔버스로 전달되도록 무시
        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
      }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>🪜 무한 계단오르기</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>계단: {score}</span>
      </div>

      {/* 모바일 방향 버튼 */}
<div style={{
  position: 'absolute',
  bottom: uiPhase === 'quiz' ? '45%' : 24,
  left: 0,
  right: 0,
  zIndex: 560,
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0 24px',
  pointerEvents: 'none',
}}>
  <button
    type="button"
    onPointerDown={() => { stateRef.current.keys.left = true; }}
    onPointerUp={() => { stateRef.current.keys.left = false; }}
    onPointerLeave={() => { stateRef.current.keys.left = false; }}
    style={{
      width: 72, height: 72,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.6)',
      background: 'rgba(0,0,0,0.35)',
      color: '#fff',
      fontSize: 28,
      fontWeight: 900,
      cursor: 'pointer',
      pointerEvents: 'auto',
      touchAction: 'none',
    }}
  >←</button>
  <button
    type="button"
    onPointerDown={() => { stateRef.current.keys.right = true; }}
    onPointerUp={() => { stateRef.current.keys.right = false; }}
    onPointerLeave={() => { stateRef.current.keys.right = false; }}
    style={{
      width: 72, height: 72,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.6)',
      background: 'rgba(0,0,0,0.35)',
      color: '#fff',
      fontSize: 28,
      fontWeight: 900,
      cursor: 'pointer',
      pointerEvents: 'auto',
      touchAction: 'none',
    }}
  >→</button>
</div>


      {/* 20계단마다 출제되는 퀴즈 모달창 (조건부 렌더링) */}
      {uiPhase === 'quiz' && quiz && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 550,
            maxHeight: 'min(42vh, 380px)',
            overflow: 'auto',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            padding: '16px 20px',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            boxSizing: 'border-box',
          }}>
            <p style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, color: '#333' }}>
              🪜 계단 퀴즈! {quiz.q}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quiz.opts.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    border: '1px solid #bbb', background: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 900,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
      )}
    </div>
  );
}