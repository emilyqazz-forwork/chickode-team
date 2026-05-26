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

# CORS 설정: Netlify 도메인을 정확히 허용하는 것이 좋아 (보안상 좋음)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수 로드: VITE_가 붙지 않은 실제 키 이름을 사용하도록 수정
CLAUDE_API_KEY = os.getenv("CHICKODE_CLAUDE_API_KEY")
USERS_FILE = "users.json"

# Anthropic 클라이언트 초기화
client = Anthropic(api_key=CLAUDE_API_KEY)

# 모델 설정
CLAUDE_MODEL = "claude-3-5-sonnet-20241022" 

# --- 유저 저장소 로직 (생략: 기존과 동일) ---
def load_users():
    if not os.path.exists(USERS_FILE): return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

# --- 요청 모델 정의 ---
class ChatRequest(BaseModel):
    user_question: str
    user_code: str
    problem_context: str
    history: Optional[List[dict]] = []

class GenerationRequest(BaseModel):
    chapter_title: str
    difficulty: str
    recent_wrong_concepts: List[str]

# --- API 엔드포인트 ---

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-problem")
async def generate_problem(request: GenerationRequest):
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
        # 마크다운 방어막 추가
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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)