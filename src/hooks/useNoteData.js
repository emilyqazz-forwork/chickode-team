import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useNoteData() {
  const [wrongItems, setWrongItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWrongData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return;

        // submissions에서 오답만 + problems JOIN
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
          .order('created_at', { ascending: false });

        if (error) throw error;

        // unit에서 챕터 번호 파싱 (java_basic_c3_u2 → 3)
        const parsed = (data || []).map(item => ({
          ...item,
          chapterNum: parseChapter(item.unit),
          title: item.problems?.title || '문제',
          templateCode: item.problems?.template_code || '',
          correctAnswer: item.problems?.answer || item.answer || '',
          description: item.problems?.description || '',
        }));

        // 틀린 횟수 집계
        const wrongCountMap = {};
        parsed.forEach(item => {
          const key = item.problem_id;
          wrongCountMap[key] = (wrongCountMap[key] || 0) + 1;
        });

        const withCounts = parsed.map(item => ({
          ...item,
          wrongCount: wrongCountMap[item.problem_id] || 1,
        }));

        setWrongItems(withCounts);
      } catch (err) {
        console.error('오답 데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWrongData();
  }, []);

  return { wrongItems, loading };
}

// java_basic_c3_u2 → 3, py_basic_c2_u1 → 2
function parseChapter(unit = '') {
  const match = unit.match(/_c(\d+)_/);
  return match ? parseInt(match[1]) : null;
}