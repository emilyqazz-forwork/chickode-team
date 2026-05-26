import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { calculateLearningStats } from '../utils/scoring';

export function usePatternData() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("코딩 병아리");
  const [stats, setStats] = useState({
    implementation: 0,
    conceptual: 0,
    focus: 0,
    timeGrowthRate: 0,
    passedCount: 0,
    totalCount: 0,
    avgSubmits: 0,
    avgHints: 0,
    tabSwitchIssueRatio: 0,
    highMouseOutRatio: 0,
    weakestChapter: 1,
  });
  const [prescriptions, setPrescriptions] = useState({
    tab_switch: "",
    typing_frenzy: "",
    mouse_wander: "",
    weakness_analysis: "", // ✅ 취약 언어·챕터 AI 분석 추가
  });
  const [prescriptionsLoading, setPrescriptionsLoading] = useState({
    tab_switch: false,
    typing_frenzy: false,
    mouse_wander: false,
    weakness_analysis: false, // ✅ 취약 언어·챕터 AI 분석 로딩 추가
  });

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // profiles 테이블에서 실제 유저의 이름 조회
        let resolvedName = "코딩 병아리";
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single();
          if (profile?.display_name) {
            resolvedName = profile.display_name;
            setDisplayName(resolvedName);
          }
        }

        // [Table 1] 문제 시도 이력 + [Table 2] CCTV 행동 로그 병렬 fetch
        const [attemptRes, behaviorRes] = await Promise.all([
          supabase.from('submissions').select('*').eq('user_id', userId),
          supabase.from('user_behavior_logs').select('*').eq('user_id', userId),
        ]);

        if (attemptRes.error || behaviorRes.error) throw new Error("Supabase 데이터 추출 실패");

        const attemptData = attemptRes.data || [];
        const bLogs = behaviorRes.data || [];

        if (attemptData.length > 0) {
          setAttempts(attemptData);

          // 분리한 유틸리티 엔진 호출을 통한 스탯 바인딩
          const computedStats = calculateLearningStats(attemptData, bLogs);
          setStats(computedStats);

          // ✅ langCount / chapterCount 계산 — Edge Function에 넘기기 위해 여기서 조립
          const parseUnitLocal = (unit = '') => {
            const match = unit.match(/^(java|py|c)_(basic|mid|adv)_(c\d+)/);
            if (!match) return { lang: null, chapterId: null };
            return { lang: match[1], chapterId: `${match[1]}_${match[2]}_${match[3]}` };
          };

          const langCount = {};
          const chapterCount = {};
          attemptData.filter(a => a.is_correct === false).forEach(a => {
            const { lang, chapterId } = parseUnitLocal(a.unit || '');
            if (!lang) return;
            langCount[lang] = (langCount[lang] || 0) + 1;
            if (chapterId) chapterCount[chapterId] = (chapterCount[chapterId] || 0) + 1;
          });

          // 다차원 거동 기반 습관 체크 후 필요시 Claude API 동적 호출 트리거
          triggerAIPrescriptions(computedStats, resolvedName, langCount, chapterCount);
        }
      } catch (err) {
        console.error("데이터 바인딩 도중 오류 발생:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // Claude Messages API 호출 — Supabase Edge Function 경유 (API 키 클라이언트 노출 없음)
  async function fetchClaudePrescription(habitType, computedStats, name, langCount = {}, chapterCount = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('claude-prescription', {
        body: { habitType, stats: computedStats, displayName: name, langCount, chapterCount }
      });
      if (error) throw error;
      return data?.prescription ?? "🐤 병아리 선배의 통신망이 잠깐 혼잡하구! 조금 있다가 다시 열어봐!";
    } catch (err) {
      console.error(`Claude API 호출 실패 [${habitType}]:`, err);
      return "🐤 우웅.. 병아리 선배의 통신망이 잠깐 혼잡하구! 조금 있다가 다시 열어봐!";
    }
  }

  // 탐지 조건 검출 및 AI 비동기 처방 제어
  function triggerAIPrescriptions(computedStats, name, langCount, chapterCount) {
    const activeHabits = [];
    if (computedStats.tabSwitchIssueRatio >= 0.4) activeHabits.push("tab_switch");
    if (
      computedStats.avgSubmits >= 3 &&
      computedStats.totalCount > 0 &&
      computedStats.passedCount / computedStats.totalCount <= 0.7
    ) activeHabits.push("typing_frenzy");
    if (computedStats.highMouseOutRatio >= 0.3) activeHabits.push("mouse_wander");

    // ✅ 취약 분석은 오답 데이터가 있을 때 항상 호출
    const hasWrongData = Object.keys(langCount).length > 0;
    if (hasWrongData) activeHabits.push("weakness_analysis");

    if (activeHabits.length === 0) return;

    // 로딩 상태 일괄 적용
    setPrescriptionsLoading(prev => {
      const next = { ...prev };
      activeHabits.forEach(h => { next[h] = true; });
      return next;
    });

    // 병렬로 API 요청을 보내고 처리 완료 순서대로 개별 바인딩하여 속도 극대화
    activeHabits.forEach(async (habit) => {
      const text = await fetchClaudePrescription(habit, computedStats, name, langCount, chapterCount);
      setPrescriptions(prev => ({ ...prev, [habit]: text }));
      setPrescriptionsLoading(prev => ({ ...prev, [habit]: false }));
    });
  }

  return { attempts, loading, displayName, stats, prescriptions, prescriptionsLoading };
}