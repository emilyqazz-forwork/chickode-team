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
    const { templateCode, userCode, correctAnswer, title, description, unitLevel } = await req.json();

    const systemPrompt = `너는 게임화 코딩 플랫폼 'Chickode(치코드)'의 귀엽고 똑똑한 AI 튜터 '병아리 선배🐣'야.
학습자의 오답을 분석해서 아래 3가지를 JSON으로 반환해줘.
반드시 JSON만 출력하고 다른 텍스트는 절대 쓰지 마.

{
  "annotatedAnswer": "정답 코드 전체를 핵심 줄마다 한국어 주석을 달아서 반환. 주석은 // 형식으로.",
  "wrongReason": "틀린 이유를 1-2문장으로 객관적이고 명확하게. 예: '조건식의 비교 연산자가 누락되었습니다.'",
  "hint": "병아리 선배🐣 말투로 따뜻하게 힌트. '~구!', '~해봐!', '삐약!' 어조. <strong> 태그로 핵심 키워드 강조. 2-3문장."
}`;

    const userPrompt = `문제 제목: ${title}
문제 설명: ${description}
난이도: ${unitLevel}
템플릿 코드: 
${templateCode}

학습자가 제출한 답:
${userCode}

정답:
${correctAnswer}

위 정보를 바탕으로 분석해줘!`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("note-analysis error:", err);
    return new Response(
      JSON.stringify({ error: "분석 실패", detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});