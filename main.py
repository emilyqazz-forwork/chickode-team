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

# CORS 설정: 프론트엔드 도메인 명시
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chickode.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수 로드
CLAUDE_API_KEY = os.getenv("CHICKODE_CLAUDE_API_KEY")

if not CLAUDE_API_KEY:
    print("🚨 ERROR: CHICKODE_CLAUDE_API_KEY가 로드되지 않았습니다!")
else:
    print(f"✅ SUCCESS: API Key가 로드되었습니다. (길이: {len(CLAUDE_API_KEY)})")

client = Anthropic(api_key=CLAUDE_API_KEY)
CLAUDE_MODEL = "claude-sonnet-4-6"
USERS_FILE = "users.json"

# --- 유저 저장소 로직 ---
def load_users():
    if not os.path.exists(USERS_FILE): return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

# --- [중요] 요청 모델 정의 (함수들보다 위에 위치해야 함) ---
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
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="서버에 AI API Key가 설정되지 않았습니다.")
        
    try:
        history_str = "\n".join([f"{h.get('role', 'user')}: {h.get('text', '')}" for h in request.history])
        
        system_prompt = "너는 '병아리 선배' 코딩 멘토야. 친근한 반말을 사용하고 '삐약!'을 붙여. 정답 코드를 직접 주지 말고, 논리적 사고를 유도하는 힌트 위주로 답변해."
        
        response = await asyncio.to_thread(
            client.messages.create,
            model=CLAUDE_MODEL,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": f"[맥락]{request.problem_context}\n[코드]{request.user_code}\n[기록]{history_str}\n[질문]{request.user_question}"}]
        )
        return {"answer": response.content[0].text}
    except Exception as e:
        print(f"DEBUG: Chat API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-problem")
async def generate_problem(request: GenerationRequest):
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="서버에 AI API Key가 설정되지 않았습니다.")
        
    try:
        system_instruction = "응답은 무조건 JSON 형식만 출력해. 마크다운 기호(```json)를 포함하지 마."
        prompt = f"Chickode 튜터로서 Java 코딩 문제를 생성해. 주제: {request.chapter_title}, 난이도: {request.difficulty}, 취약 개념: {', '.join(request.recent_wrong_concepts)}. JSON 구조: title, description, template_code, answer, keywords, code_level"
        
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

@app.post("/register")
async def register(req: dict):
    users = load_users()
    if req["username"] in users: return {"success": False, "message": "이미 존재하는 아이디야 삐약!"}
    users[req["username"]] = {"password": hash_password(req["password"]), "nickname": req["nickname"]}
    save_users(users)
    return {"success": True, "message": "가입 완료! 삐약! 🐥"}

@app.post("/login")
async def login(req: dict):
    users = load_users()
    user = users.get(req["username"])
    if not user or user["password"] != hash_password(req["password"]):
        return {"success": False, "message": "아이디나 비밀번호가 틀렸어 삐약!"}
    return {"success": True, "nickname": user["nickname"]}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)