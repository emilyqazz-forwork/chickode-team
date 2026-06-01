import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────
// unit 코드 파싱 함수
// 예) java_basic_c3_u2 → { lang: 'java', level: 'basic', chapterId: 'java_basic_c3' }
// ─────────────────────────────────────────────
function parseUnit(unit = '') {
  // 정규식으로 언어(java|py|c), 난이도(basic|mid|adv), 챕터(c1~c9) 추출
  const match = unit.match(/^(java|py|c)_(basic|mid|adv)_(c\d+)/);
  
  // 매칭 실패 시 null 반환 (잘못된 unit 코드 방어)
  if (!match) return { lang: null, level: null, chapterId: null };
  
  const lang = match[1];                          // 'java' | 'py' | 'c'
  const level = match[2];                         // 'basic' | 'mid' | 'adv'
  const chapterId = `${lang}_${level}_${match[3]}`; // 'java_basic_c3'
  
  return { lang, level, chapterId };
}

// ─────────────────────────────────────────────
// 오답 데이터 fetch 커스텀 훅
// ─────────────────────────────────────────────
export function useNoteData() {
  const [wrongItems, setWrongItems] = useState([]); // 오답 목록
  const [loading, setLoading] = useState(true);     // 로딩 상태

  useEffect(() => {
    async function fetchWrongData() {
      try {
        setLoading(true);

        // 현재 로그인한 유저 ID 가져오기
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return;

        // submissions 테이블에서 오답(is_correct = false)만 조회
        // problems 테이블과 JOIN해서 문제 정보도 함께 가져옴
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            problems (
              title,
              description,
              template_code,
              answer,
              code_level,
              unit
            )
          `)
          .eq('user_id', userId)
          .eq('is_correct', false)
          .order('created_at', { ascending: false }); // 최신순 정렬

        if (error) throw error;

        // 문제별 틀린 횟수 집계
        // { problem_id: 횟수 } 형태의 맵 생성
        const wrongCountMap = {};
        (data || []).forEach(item => {
          wrongCountMap[item.problem_id] = (wrongCountMap[item.problem_id] || 0) + 1;
        });

        // 각 오답 항목에 파싱된 데이터 추가
        const parsed = (data || []).map(item => {
          const { lang, level, chapterId } = parseUnit(item.unit);
          return {
            ...item,
            lang,          // 언어: 'java' | 'py' | 'c'
            level,         // 난이도: 'basic' | 'mid' | 'adv'
            chapterId,     // 챕터 ID: 'java_basic_c3'
            // chapterId에서 숫자만 추출 (예: 'java_basic_c3' → 3)
            chapterNum: chapterId ? parseInt(chapterId.match(/c(\d+)$/)?.[1]) : null,
            title: item.problems?.title || '문제',
            templateCode: item.problems?.template_code || '',
            correctAnswer: item.problems?.answer || item.answer || '',
            description: item.problems?.description || '',
            wrongCount: wrongCountMap[item.problem_id] || 1, // 틀린 횟수
          };
        });

        // problem_id 기준 중복 제거 (최신 1개만 유지, wrongCount는 집계된 값 사용)
        const seen = new Set();
        const deduped = parsed.filter(item => {
          if (seen.has(item.problem_id)) return false;
          seen.add(item.problem_id);
          return true;
        });

        setWrongItems(deduped);


        
      } catch (err) {
        console.error('오답 데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWrongData();
  }, []); // 컴포넌트 마운트 시 1회 실행

  return { wrongItems, loading };
}