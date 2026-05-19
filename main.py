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

# CORS 설정: 프론트엔드(5173 포트)와의 통신 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수 로드
CLAUDE_API_KEY = os.getenv("CHICKODE_CLAUDE_API_KEY")
USERS_FILE = "users.json"

# Anthropic 클라이언트 초기화
client = Anthropic(api_key=CLAUDE_API_KEY)

# --- 모델 설정 ---
# 최신 모델로 업데이트하세요 (현재 기준 최신 모델 ID 입력)
CLAUDE_MODEL = "claude-sonnet-4-6" 

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

# --- 요청 모델 정의 ---
class HintRequest(BaseModel):
    user_code: str
    problem_context: str

class HistoryItem(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    user_question: str
    user_code: str
    problem_context: str
    history: Optional[List[HistoryItem]] = []

# --- API 엔드포인트 ---
@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    print(f"DEBUG: API Key Loaded: {CLAUDE_API_KEY is not None}")
    print(f"DEBUG: Request Data: {request}")
    try:
        history_str = "\n".join([f"{h.role}: {h.text}" for h in request.history])
        
        # System Prompt를 분리하여 모델이 역할을 더 잘 수행하도록 최적화
        system_prompt = (
            "너는 '병아리 선배' 코딩 멘토야. "
            "사용자에게 친근한 반말을 사용하고 문장 끝에 '삐약!'을 붙여. "
            "정답 코드를 직접 주지 말고, 논리적 사고를 유도하는 힌트 위주로 두 문장 이내로 답변해."
        )
        
        user_prompt = f"""
        [문제 맥락] {request.problem_context}
        [사용자 코드] {request.user_code}
        [대화 기록] {history_str}
        [질문] {request.user_question}
        """

        # 비동기 처리를 위해 asyncio.to_thread 사용 (서버 응답 속도 향상)
        response = await asyncio.to_thread(
            client.messages.create,
            model=CLAUDE_MODEL,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        return {"answer": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register")
async def register(req: dict): # Pydantic 모델 대신 dict 사용 가능
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
    uvicorn.run(app, host="127.0.0.1", port=8000)