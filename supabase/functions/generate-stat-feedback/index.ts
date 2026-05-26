import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. CORS 설정을 위한 헤더 (리액트 호스트가 달라도 통신이 허용되도록 설정)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS 프리플라이트 예비 요청 차단 해제
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Supabase 금고에 저장되어 있는 ANTHROPIC_API_KEY를 시스템에서 꺼내옴
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      throw new Error('Supabase 클라우드 금고에 ANTHROPIC_API_KEY가 세팅되지 않았구..')
    }

    // 3. 프론트엔드(React)에서 전송한 body 데이터(payload) 파싱
    const { current, baseline } = await req.json()

    // 4. Claude에게 역할을 부여할 페르소나와 프롬프트 조립
    const systemPrompt = `
      당신은 초보 코딩 교육 플랫폼 'Chickode(치코드)'의 마스코트이자 AI 튜터인 '병아리 선배'입니다.
      학생들의 주간 코딩 역량 계측 데이터를 기반으로 다정하고 유능하게 피드백을 주어야 합니다.

      [말투 규칙]
      - 항상 친근하고 귀여운 말투를 쓰며, 문장 끝에 '~구', '삐빅!', '~네!' 등을 적절히 섞어 쓰세요.
      - 기술적인 원리를 은유나 비유 없이 직접적이고 명확하게 풀어서 설명해 주세요.

      [출력 규칙]
      - 리액트의 dangerouslySetInnerHTML에 주입될 예정이므로 텍스트 내에 핵심 강조 키워드는 '<strong>강조 단어</strong>' 태그로 감싸서 출력해 주세요.
      - 줄바꿈이 필요한 곳은 '<br />' 태그를 사용하세요. markdown 형식(#, **)은 사용하지 마세요.
      - 분량은 3~4문장 내외로 간결하고 스캔하기 쉽게 작성해 주세요.
    `

    const userPrompt = `
      [이번 주 데이터]
      - 구현력: ${current.implementation}점 (지난주 대비 변동폭: ${current.implementation - baseline.implementation}점)
      - 이해력: ${current.conceptual}점 (지난주 대비 변동폭: ${current.conceptual - baseline.conceptual}점)
      - 집중력: ${current.focus}점 (지난주 대비 변동폭: ${current.focus - baseline.focus}점)
      - 제출 횟수: ${current.avgSubmits}회, 힌트 조회 횟수: ${current.avgHints}회
      - 탭 전환 이슈 비율: ${current.tabSwitchRatio}%, 마우스 이탈 비율: ${current.mouseOutRatio}%
      - 성공 문항 수: ${current.passedCount}/${current.totalCount}

      이 지표를 종합 분석해서 수치들의 원인과 실제 소스코드 제어력이 얼마나 성장했는지 격려 섞인 종합 해설을 작성해 줘.
    `

    // 5. Anthropic Claude API 호출 (Claude 3.5 Sonnet 지정)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022", // 가장 성능이 뛰어난 Sonnet 최신 지정 명칭
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Anthropic API 에러 발생했구: ${result.error?.message || response.statusText}`)
    }

    const aiFeedback = result.content[0].text

    // 6. 가공 완료된 결과를 JSON 포맷으로 프론트엔드에 최종 반환
    return new Response(
      JSON.stringify({ feedback: aiFeedback }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})