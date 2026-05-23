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

# CORS 설정: 프론트엔드(5173 포트 등)와의 자유로운 비동기 통신 허용
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
# 최신 비동기 통신 모델 지정
CLAUDE_MODEL = "claude-3-5-sonnet-20241022" 

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

# 📝 AI 문제 자동 생성 전용 요청 바디 모델 정의
class GenerationRequest(BaseModel):
    user_id: Optional[str] = None
    chapter_title: str                  # 예: "제어문과 반복문"
    difficulty: str                     # '기초', '중급', '고급'
    recent_wrong_concepts: List[str]    # 취약 지표 기반 핵심 키워드 목록 (예: ['while', 'break'])

# --- API 엔드포인트 ---

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    print(f"DEBUG: API Key Loaded: {CLAUDE_API_KEY is not None}")
    print(f"DEBUG: Request Data: {request}")
    try:
        history_str = "\n".join([f"{h.role}: {h.text}" for h in request.history])
        
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

# 🎯 [신규 엔드포인트 추가] 개인 맞춤형 AI 보충 문제 실시간 생성 API
@app.post("/generate-problem")
async def generate_problem(request: GenerationRequest):
    print(f"DEBUG: API Key Loaded: {CLAUDE_API_KEY is not None}")
    print(f"DEBUG: Problem Generation Request: {request}")
    try:
        # Claude의 출력 포맷을 JSON 데이터 구조로 한정 
        system_instruction = (
            "당신은 오직 요구된 교육용 JSON 데이터 구조만 정확하게 출력하는 백엔드 프로그램 엔진입니다. "
            "마크다운(```json)이나 다른 인사말, 주석 텍스트를 절대로 응답에 포함하지 마십시오."
        )

        prompt = f"""
        당신은 코딩 교육 플랫폼 'Chickode'의 인공지능 튜터 '병아리 선배'입니다.
        아래 조건에 완벽히 부합하는 초보자 맞춤형 Java 코딩 문제를 생성해 주세요.

        [조건]
        1. 대단원: {request.chapter_title}
        2. 난이도: {request.difficulty}
        3. 학습자 취약 개념 (코드 요구사항 및 템플릿에 적극 반영할 것): {', '.join(request.recent_wrong_concepts)}
        4. 문제 유형: 'coding' (에디터 타이핑 작성형)

        [출력 규격]
        반드시 JSON 형식으로만 응답해야 하며, 다음 키(Key)를 정확히 포함해야 합니다:
        - title: 문제의 제목 (짧고 명료하게)
        - description: 초보자가 쉽게 이해할 수 있는 친절하고 구체적인 문제 설명 (병아리 선배의 '~삐약' 체를 적절히 섞을 것)
        - template_code: 에디터에 주입될 초기 Java 코드 구조 (개행은 \\n 문자열로 표현)
        - answer: 채점 시 사용자가 반드시 작성해야 할 정답 소스코드 구문 (공백 제외 매칭용)
        - keywords: 채점 시 코드 내 필수 포함 여부를 확인할 핵심 예약어/메서드 배열 (예: ["while", "break"])
        - code_level: 코드 작성량에 따른 난이도 수치 (1, 3, 5 중 하나 선택)

        출력은 다른 텍스트 설명 없이 오직 완성된 하나의 JSON 문자열만 반환해야 합니다.
        """

        # 비동기 처리를 위해 asyncio.to_thread 적용하여 성능 부하 관리
        response = await asyncio.to_thread(
            client.messages.create,
            model=CLAUDE_MODEL,
            max_tokens=1500,
            temperature=0.5,
            system=system_instruction,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()
        print(f"DEBUG: Raw Claude Response: {response_text}")

        # 만약 Claude가 마크다운 포맷(```json ... ```)을 우회 적용하여 출력했을 시 파싱 안전 방어막 가동
        if response_text.startswith("```"):
            response_text = response_text.split("```json")[-1].split("```")[0].strip()

        problem_data = json.loads(response_text)
        
        # Supabase의 problems 테이블 및 프론트엔드 quizList 데이터 매핑 규격에 정확히 동기화하여 가공 반환
        return {
            "title": problem_data.get("title", "AI 보충 도전 문제"),
            "description": problem_data.get("description", "제시된 요구 사항에 맞추어 코드를 구현해봐 삐약!"),
            "type": "coding",
            "difficulty": request.difficulty,
            "code_level": int(problem_data.get("code_level", 3)),
            "template": problem_data.get("template_code", "public class Main {\n    public static void main(String[] args) {\n        // 코드를 작성하세요\n    }\n}"),
            "answer": problem_data.get("answer", ""),
            "keywords": problem_data.get("keywords", []),
            "unit": "ai_dynamic_challenge"
        }

    except Exception as e:
        print("AI 문제 생성 오류:", str(e))
        raise HTTPException(status_code=500, detail=f"AI가 문제를 조립하는 도중 알 수 없는 에러가 발생했습니다: {str(e)}")

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
    uvicorn.run(app, host="127.0.0.1", port=8000)
