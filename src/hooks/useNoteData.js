import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function parseUnit(unit = '') {
  const match = unit.match(/^(java|py|c)_(basic|mid|adv)_(c\d+)/);
  if (!match) return { lang: null, level: null, chapterId: null };
  const lang = match[1];
  const level = match[2];
  const chapterId = `${lang}_${level}_${match[3]}`;
  return { lang, level, chapterId };
}

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

        // 문제별 틀린 횟수 집계
        const wrongCountMap = {};
        (data || []).forEach(item => {
          wrongCountMap[item.problem_id] = (wrongCountMap[item.problem_id] || 0) + 1;
        });

        // 파싱 + 중복 제거 (problem_id 기준 최신 1개만)
        const seen = new Set();
        const deduped = (data || [])
          .filter(item => {
            if (seen.has(item.problem_id)) return false;
            seen.add(item.problem_id);
            return true;
          })
          .map(item => {
            const { lang, level, chapterId } = parseUnit(item.unit);
            return {
              ...item,
              lang,
              level,
              chapterId,
              chapterNum: chapterId ? parseInt(chapterId.match(/c(\d+)$/)?.[1]) : null,
              title: item.problems?.title || '문제',
              templateCode: item.problems?.template_code || '',
              correctAnswer: item.problems?.answer || item.answer || '',
              description: item.problems?.description || '',
              wrongCount: wrongCountMap[item.problem_id] || 1,
            };
          });

        setWrongItems(deduped);
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