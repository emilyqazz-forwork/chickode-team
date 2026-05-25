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
    const { question, chatHistory, title, templateCode, correctAnswer, userCode } = await req.json();

    const systemPrompt = `너는 게임화 코딩 플랫폼 'Chickode(치코드)'의 귀엽고 똑똑한 AI 튜터 '병아리 선배🐣'야.
        학습자가 코딩 문제를 풀다가 모르는 개념을 질문하면 친절하게 답해줘.
        - 말투: "~구!", "~해봐!", "~잖아!", "삐약!" 같은 병아리 선배 전용 어조
        - 학습자의 질문에 정확하게 답해줘. 엉뚱한 답변 절대 금지!
        - 초보자 눈높이에 맞게 쉽고 친절하게 설명해줘
        - 필요하면 예시 코드도 보여줘
        - <strong> 태그로 핵심 키워드 강조
        - 답변은 3-4문장 이내로 간결하게`;

    // 대화 히스토리 포맷팅
    const messages = [
      {
        role: 'user',
        content: `문제 제목: ${title}
        문제 템플릿:
        ${templateCode || ''}

        정답:
        ${correctAnswer || ''}

        학습자가 제출한 코드:
        ${userCode || ''}

        ---
        위 문제 맥락을 참고해서 아래 질문에 답해줘.`
      },
      { role: 'assistant', content: '알겠어! 질문해봐 삐약! 🐣' },
      // 이전 대화 히스토리 추가
      ...(chatHistory || []).map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text
      })),
      // 현재 질문
      { role: 'user', content: question }
    ];

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const answer = claudeData.content?.[0]?.text ?? "삐약... 잠깐 연결이 안 됐어! 다시 물어봐줘!";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("note-chat error:", err);
    return new Response(
      JSON.stringify({ answer: "삐약... 잠깐 연결이 안 됐어! 다시 물어봐줘!" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});