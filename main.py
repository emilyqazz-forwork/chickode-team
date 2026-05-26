import os
import json
import hashlib
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chickode.netlify.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수 로드: Railway에 설정한 변수명 그대로 사용
CLAUDE_API_KEY = os.getenv("CHICKODE_CLAUDE_API_KEY")

# 🚨 디버그 로그 추가: 서버 시작 시 키가 들어왔는지 확인
if not CLAUDE_API_KEY:
    print("🚨 ERROR: CHICKODE_CLAUDE_API_KEY가 로드되지 않았습니다! Railway Variables를 확인하세요.")
else:
    print(f"✅ SUCCESS: API Key가 로드되었습니다. (길이: {len(CLAUDE_API_KEY)})")

# Anthropic 클라이언트 초기화
client = Anthropic(api_key=CLAUDE_API_KEY)

# 모델 설정
CLAUDE_MODEL = "claude-3-5-sonnet-20241022" 

# --- (중략: 유저 로직, 모델 정의 등 기존 코드 동일) ---
# 기존 코드 그대로 유지...
# ...

# --- API 엔드포인트 ---

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    # 🚨 키값 확인 (에러 시 서버 터짐 방지)
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="서버에 AI API Key가 설정되지 않았습니다.")
        
    try:
        history_str = "\n".join([f"{h['role']}: {h['text']}" for h in request.history])
        
        system_prompt = (
            "너는 '병아리 선배' 코딩 멘토야. "
            "친근한 반말을 사용하고 '삐약!'을 붙여. "
            "정답 코드를 직접 주지 말고, 논리적 사고를 유도하는 힌트 위주로 답변해."
        )
        
        response = await asyncio.to_thread(
            client.messages.create,
            model=CLAUDE_MODEL,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": f"[맥락]{request.problem_context}\n[코드]{request.user_code}\n[기록]{history_str}\n[질문]{request.user_question}"}]
        )
        return {"answer": response.content[0].text}
    except Exception as e:
        print(f"DEBUG: Chat API Error: {str(e)}") # 로그 확인용
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-problem")
async def generate_problem(request: GenerationRequest):
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="서버에 AI API Key가 설정되지 않았습니다.")
        
    try:
        system_instruction = "응답은 무조건 JSON 형식만 출력해. 마크다운 기호(```json)를 포함하지 마."
        prompt = f"""
        Chickode 튜터로서 Java 코딩 문제를 생성해.
        주제: {request.chapter_title}, 난이도: {request.difficulty}, 취약 개념: {', '.join(request.recent_wrong_concepts)}
        응답 JSON 구조: title, description, template_code, answer, keywords, code_level
        """
        
        response = await asyncio.to_thread(
            client.messages.create,
            model=CLAUDE_MODEL,
            max_tokens=1500,
            system=system_instruction,
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.content[0].text.strip()
        if "```" in text:
            text = text.replace("```json", "").replace("```", "").strip()
            
        problem_data = json.loads(text)
        
        return {
            "title": problem_data.get("title"),
            "description": problem_data.get("description"),
            "type": "coding",
            "difficulty": request.difficulty,
            "code_level": int(problem_data.get("code_level", 3)),
            "template": problem_data.get("template_code"),
            "answer": problem_data.get("answer"),
            "keywords": problem_data.get("keywords", []),
            "unit": "ai_dynamic_challenge"
        }
    except Exception as e:
        print(f"DEBUG: Generation API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)