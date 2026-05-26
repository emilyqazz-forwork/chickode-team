import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { habitType, stats, displayName, langCount, chapterCount } = await req.json();

    const VALID_HABITS = ["tab_switch", "typing_frenzy", "mouse_wander", "weakness_analysis"];
    if (!VALID_HABITS.includes(habitType)) {
      return new Response(JSON.stringify({ error: "invalid habitType" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const habitContextMap = {
      tab_switch: `에디터 창을 이탈해 외부 탭으로 전환한 비율이 ${(stats.tabSwitchIssueRatio * 100).toFixed(0)}%로 기준치(40%)를 초과함`,
      typing_frenzy: `문항당 평균 제출 오답수 ${stats.avgSubmits.toFixed(1)}회, 합격률 ${(stats.passedCount / stats.totalCount * 100).toFixed(0)}%로 즉흥 제출 패턴 감지됨`,
      mouse_wander: `마우스 가시영역 이탈 비율 ${(stats.highMouseOutRatio * 100).toFixed(0)}%로 기준치(30%)를 초과함`,
    };

    let systemPrompt = "";
    let userPrompt = "";

    if (habitType === "weakness_analysis") {
      // 언어별 오답 현황 텍스트 조립
      const LANG_LABEL = { java: "Java", py: "Python", c: "C언어" };
      const langSummary = Object.entries(langCount)
        .sort((a, b) => b[1] - a[1])
        .map(([lang, count]) => `${LANG_LABEL[lang] || lang}: ${count}회`)
        .join(", ");

      // 챕터별 오답 현황 텍스트 조립 (상위 3개)
      const chapterSummary = Object.entries(chapterCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ch, count]) => `${ch}: ${count}회`)
        .join(", ");

      // 감지된 습관 목록 조립
      const detectedHabits = [];
      if (stats.tabSwitchIssueRatio >= 0.4) detectedHabits.push(`탭 이탈 비율 ${(stats.tabSwitchIssueRatio * 100).toFixed(0)}%`);
      if (stats.avgSubmits >= 3 && stats.passedCount / stats.totalCount <= 0.7) detectedHabits.push(`즉흥 제출 평균 ${stats.avgSubmits.toFixed(1)}회`);
      if (stats.highMouseOutRatio >= 0.3) detectedHabits.push(`마우스 이탈 비율 ${(stats.highMouseOutRatio * 100).toFixed(0)}%`);
      const habitSummary = detectedHabits.length > 0 ? detectedHabits.join(", ") : "특이 습관 없음";

      systemPrompt = `너는 게임화 코딩 플랫폼 'Chickode(치코드)'의 귀엽고 똑똑한 AI 튜터 '병아리 선배🐣'야.
학습자의 오답 데이터와 학습 습관을 분석해서 어느 언어와 단원이 왜 취약한지, 어떤 습관과 연결되는지 설명해줘.
- 말투: 반드시 "~구!", "~해봐!", "~잖아!", "삐약!" 같은 병아리 선배 전용 어조. 딱딱한 말투 절대 금지!
- <strong> 태그로 핵심 키워드 강조해줘.
- 분석 텍스트만 출력해. 접두어나 따옴표 없이 바로 시작해.
- 3~4문장으로 작성해줘.`;

      userPrompt = `학생: ${displayName}
스탯: 구현력 ${stats.implementation}점, 이해력 ${stats.conceptual}점, 집중력 ${stats.focus}점
언어별 오답 현황: ${langSummary}
취약 챕터 TOP3: ${chapterSummary}
감지된 학습 습관: ${habitSummary}

이 데이터를 바탕으로 어느 언어/단원이 왜 취약한지, 어떤 학습 습관과 연결되는지 분석해줘!`;

    } else {
      systemPrompt = `너는 게임화 코딩 플랫폼 'Chickode(치코드)'의 귀엽고 똑똑한 AI 튜터 '병아리 선배🐣'야.
학습자의 나쁜 코딩 버릇을 교정하는 처방전을 200자 내외로 써줘.
- 말투: 반드시 "~구!", "~해봐!", "~잖아!", "삐약!" 같은 병아리 선배 전용 어조를 써야 해. 딱딱한 말투는 절대 금지!
- 예시 말투: "에디터 창 닫고 삐약이한테 물어봐!", "10초만 손 떼고 눈 디버깅해봐 삐약!", "검색창 닫아봐구~ 혼자 해결할 수 있어 삐약!"
- <strong> 태그로 핵심 처방 키워드를 강조해줘.
- 처방 텍스트만 출력해. 접두어나 따옴표 없이 바로 시작해.`;

      userPrompt = `학생: ${displayName}
스탯: 구현력 ${stats.implementation}점, 개념이해 ${stats.conceptual}점, 시선몰입 ${stats.focus}점
감지된 습관: ${habitContextMap[habitType]}

이 수치에 핀포인트를 맞춘 따끔하고 실천적인 교정 처방을 작성해줘!`;
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const prescription = claudeData.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ prescription }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: "처방 생성 실패", detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});