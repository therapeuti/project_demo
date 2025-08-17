# app.py
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
import json
from openai import OpenAI
from datetime import datetime
import os
from functools import wraps
import hashlib
import secrets
import asyncio
import logging
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(32))
CORS(app, supports_credentials=True)

# 로깅 설정
logging.basicConfig(level=logging.INFO)

# OpenAI 클라이언트 초기화
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key:
    client = OpenAI(api_key=openai_api_key)
else:
    logging.warning('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. 더미 클라이언트를 사용합니다.')
    client = None

# 데이터베이스 초기화
def init_db():
    """데이터베이스 초기화"""
    conn = sqlite3.connect('pet_chatbot.db')
    cursor = conn.cursor()
    
    # 사용자 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nickname TEXT,
            profile_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 반려동물 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            breed TEXT,
            personality TEXT,
            speaking_style TEXT,
            user_call TEXT,
            likes TEXT,
            dislikes TEXT,
            etc_info TEXT,
            profile_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 채팅 세션 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pet_id INTEGER NOT NULL,
            session_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (pet_id) REFERENCES pets (id)
        )
    ''')
    
    # 채팅 메시지 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 로그인 체크 데코레이터
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        return f(*args, **kwargs)
    return decorated_function

# 비밀번호 해시 함수
def hash_password(password):
    """비밀번호를 안전하게 해시화"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + pwd_hash.hex()

def verify_password(password, hashed):
    """비밀번호 검증"""
    salt = hashed[:32]
    stored_hash = hashed[32:]
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return pwd_hash.hex() == stored_hash

# 데이터베이스 연결 헬퍼
def get_db_connection():
    conn = sqlite3.connect('pet_chatbot.db')
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')  # 외래키 제약조건 활성화
    return conn

class PetPersonaGenerator:
    """반려동물 페르소나 생성 및 관리 클래스"""
    
    @staticmethod
    def create_system_prompt(pet_info):
        """반려동물 정보를 바탕으로 시스템 프롬프트 생성"""
        
        base_prompt = f"""
당신은 '{pet_info['name']}'라는 이름의 {pet_info['species']}입니다.

## 기본 정보
- 이름: {pet_info['name']}
- 종류: {pet_info['species']}
- 성격: {pet_info.get('personality', '친근하고 활발함')}
- 말투: {pet_info.get('speaking_style', '귀엽고 애교있게')}
- 사용자 호칭: {pet_info.get('user_call', '주인님')}
"""

        if pet_info.get('breed'):
            base_prompt += f"- 품종: {pet_info['breed']}\n"
        
        if pet_info.get('likes'):
            base_prompt += f"- 좋아하는 것: {pet_info['likes']}\n"
        
        if pet_info.get('dislikes'):
            base_prompt += f"- 싫어하는 것: {pet_info['dislikes']}\n"
        
        if pet_info.get('etc_info'):
            base_prompt += f"- 기타 특징: {pet_info['etc_info']}\n"

        base_prompt += f"""

## 대화 규칙
1. 항상 {pet_info['name']}의 입장에서 대답하세요.
2. 설정된 성격과 말투를 일관되게 유지하세요.
3. 사용자를 '{pet_info.get('user_call', '주인님')}'라고 부르세요.
4. 반려동물답게 순수하고 애정어린 반응을 보이세요.
5. 사용자의 일상에 관심을 보이고 공감해주세요.
6. 때로는 장난스럽거나 애교부리는 모습도 보여주세요.
7. 반려동물의 관점에서 느끼는 감정을 표현하세요.
8. 응답은 한국어로 하되, 이모지를 적절히 사용하세요.

## 주의사항
- 절대로 사람인 척하지 마세요. 당신은 반려동물입니다.
- 반려동물이 할 수 없는 행동(요리, 운전 등)은 언급하지 마세요.
- 항상 긍정적이고 사랑스러운 반응을 보이세요.
- 사용자의 안전과 건강을 걱정하는 모습을 보이세요.

이제 {pet_info['name']}가 되어 사용자와 대화를 시작하세요!
"""
        
        return base_prompt

    @staticmethod
    def generate_response(pet_info, user_message, conversation_history=None):
        """AI를 이용해 반려동물 응답 생성"""
        
        try:
            # OpenAI 클라이언트가 없으면 더미 응답 반환
            if not client:
                return f"안녕! 나는 {pet_info['name']}이야! OpenAI API 키가 설정되지 않아서 실제 AI 응답은 사용할 수 없지만, 대화는 가능해! 🐾"
            
            system_prompt = PetPersonaGenerator.create_system_prompt(pet_info)
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # 이전 대화 기록 추가 (최근 10개만)
            if conversation_history:
                for msg in conversation_history[-10:]:
                    role = "user" if msg['sender'] == 'user' else "assistant"
                    messages.append({
                        "role": role, 
                        "content": msg['content']
                    })
            
            # 현재 사용자 메시지 추가
            messages.append({"role": "user", "content": user_message})
            
            # OpenAI API 호출 (새로운 버전)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.8,
                presence_penalty=0.6,
                frequency_penalty=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logging.error(f"AI 응답 생성 오류: {e}")
            # 폴백 응답
            return f"앗, 잠깐 멍해졌어! 다시 말해줄래? 🐾"

# 메인 페이지 라우트
@app.route('/')
def index():
    """메인 페이지"""
    return '''
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>반려동물 챗봇</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; }
            .info { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .api-test { background: #f3e5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
            button { background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
            button:hover { background: #1976D2; }
            #result { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; min-height: 100px; }
            input[type="text"] { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 200px; margin: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🐾 반려동물 챗봇 API 서버</h1>
            
            <div class="info">
                <h3>📋 서버 정보</h3>
                <p><strong>상태:</strong> 정상 작동 중</p>
                <p><strong>API 베이스 URL:</strong> /api</p>
                <p><strong>개발 모드:</strong> 활성화</p>
            </div>
            
            <div class="api-test">
                <h3>🧪 API 테스트</h3>
                <button onclick="testLogin()">개발용 로그인</button>
                <button onclick="testPets()">반려동물 목록 조회</button>
                <button onclick="testAddPet()">샘플 반려동물 추가</button>
                <br><br>
                <input type="text" id="petId" placeholder="반려동물 ID" value="1">
                <input type="text" id="message" placeholder="메시지 입력" value="안녕!">
                <button onclick="testChat()">채팅 테스트</button>
                <div id="result">여기에 API 응답이 표시됩니다...</div>
            </div>
            
            <div class="info">
                <h3>📚 사용 가능한 API 엔드포인트</h3>
                <ul>
                    <li><code>POST /api/dev/login</code> - 개발용 로그인</li>
                    <li><code>GET /api/pets</code> - 반려동물 목록 조회</li>
                    <li><code>POST /api/pets</code> - 반려동물 등록</li>
                    <li><code>POST /api/chat/send</code> - 채팅 메시지 전송</li>
                    <li><code>GET /api/chat/history/{pet_id}</code> - 채팅 기록 조회</li>
                    <li><code>GET /api/chat/sessions</code> - 채팅 세션 목록</li>
                </ul>
            </div>
        </div>
        
        <script>
            async function makeRequest(url, method = 'GET', data = null) {
                const config = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                };
                
                if (data && method !== 'GET') {
                    config.body = JSON.stringify(data);
                }
                
                try {
                    const response = await fetch(url, config);
                    const result = await response.json();
                    return { status: response.status, data: result };
                } catch (error) {
                    return { status: 0, data: { error: error.message } };
                }
            }
            
            function displayResult(result) {
                document.getElementById('result').innerHTML = `
                    <strong>Status:</strong> ${result.status}<br>
                    <strong>Response:</strong><br>
                    <pre>${JSON.stringify(result.data, null, 2)}</pre>
                `;
            }
            
            async function testLogin() {
                const result = await makeRequest('/api/dev/login', 'POST', { user_id: 1 });
                displayResult(result);
            }
            
            async function testPets() {
                const result = await makeRequest('/api/pets');
                displayResult(result);
            }
            
            async function testAddPet() {
                const petData = {
                    name: '테스트펫',
                    species: '강아지',
                    breed: '시바견',
                    personality: '활발하고 장난스러움',
                    speaking_style: '귀엽고 애교있게',
                    user_call: '주인님',
                    likes: '산책, 간식',
                    dislikes: '큰 소리',
                    etc_info: '꼬리를 많이 흔들어요'
                };
                const result = await makeRequest('/api/pets', 'POST', petData);
                displayResult(result);
            }
            
            async function testChat() {
                const petId = document.getElementById('petId').value;
                const message = document.getElementById('message').value;
                
                const result = await makeRequest('/api/chat/send', 'POST', {
                    pet_id: parseInt(petId),
                    message: message
                });
                displayResult(result);
            }
        </script>
    </body>
    </html>
    '''

# API 엔드포인트들

@app.route('/api/pets', methods=['GET'])
@login_required
def get_user_pets():
    """사용자의 반려동물 목록 조회"""
    
    try:
        conn = get_db_connection()
        try:
            pets = conn.execute(
                'SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC',
                (session['user_id'],)
            ).fetchall()
        finally:
            conn.close()
        
        pets_data = []
        for pet in pets:
            pet_dict = dict(pet)
            # 페르소나 정보 구성
            pet_dict['persona'] = {
                'name': pet_dict['name'],
                'species': pet_dict['species'],
                'breed': pet_dict['breed'],
                'personality': pet_dict['personality'],
                'speaking_style': pet_dict['speaking_style'],
                'user_call': pet_dict['user_call'],
                'likes': pet_dict['likes'],
                'dislikes': pet_dict['dislikes'],
                'etc_info': pet_dict['etc_info']
            }
            pets_data.append(pet_dict)
        
        return jsonify({'pets': pets_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pets', methods=['POST'])
@login_required
def add_pet():
    """새 반려동물 등록"""
    
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['name', 'species', 'personality', 'speaking_style', 'user_call']
        for field in required_fields:
            if not data.get(field) or not isinstance(data.get(field), str) or not data.get(field).strip():
                return jsonify({'error': f'{field}는 필수 항목입니다'}), 400
        
        # 입력값 길이 제한
        if len(data['name']) > 50 or len(data['species']) > 30:
            return jsonify({'error': '입력값이 너무 깁니다'}), 400
        
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO pets (user_id, name, species, breed, personality, 
                               speaking_style, user_call, likes, dislikes, etc_info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session['user_id'],
                data['name'].strip(),
                data['species'].strip(),
                data.get('breed', '').strip(),
                data['personality'].strip(),
                data['speaking_style'].strip(),
                data['user_call'].strip(),
                data.get('likes', '').strip(),
                data.get('dislikes', '').strip(),
                data.get('etc_info', '').strip()
            ))
            
            pet_id = cursor.lastrowid
            conn.commit()
        except sqlite3.Error as e:
            conn.rollback()
            logging.error(f'Pet 등록 오류: {e}')
            return jsonify({'error': '반려동물 등록에 실패했습니다'}), 500
        finally:
            conn.close()
        
        return jsonify({'success': True, 'pet_id': pet_id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/send', methods=['POST'])
@login_required
def send_chat_message():
    """채팅 메시지 전송 및 AI 응답 생성"""
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        pet_id = data.get('pet_id')
        
        if not user_message or not pet_id:
            return jsonify({'error': '메시지와 반려동물 ID가 필요합니다'}), 400
        
        # 메시지 길이 제한
        if len(user_message) > 500:
            return jsonify({'error': '메시지가 너무 깁니다 (최대 500자)'}), 400
        
        # pet_id 정수 변환 및 검증
        try:
            pet_id = int(pet_id)
        except (ValueError, TypeError):
            return jsonify({'error': '잘못된 반려동물 ID입니다'}), 400
        
        conn = get_db_connection()
        
        try:
            # 반려동물 정보 조회
            pet = conn.execute(
                'SELECT * FROM pets WHERE id = ? AND user_id = ?',
                (pet_id, session['user_id'])
            ).fetchone()
            
            if not pet:
                return jsonify({'error': '반려동물을 찾을 수 없습니다'}), 404
            
            # 세션 조회 또는 생성
            session_row = conn.execute(
                'SELECT id FROM chat_sessions WHERE user_id = ? AND pet_id = ? ORDER BY created_at DESC LIMIT 1',
                (session['user_id'], pet_id)
            ).fetchone()
            
            if session_row:
                session_id = session_row['id']
            else:
                # 새 세션 생성
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO chat_sessions (user_id, pet_id) VALUES (?, ?)',
                    (session['user_id'], pet_id)
                )
                session_id = cursor.lastrowid
            
            # 이전 대화 기록 조회
            conversation_history = conn.execute(
                'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 20',
                (session_id,)
            ).fetchall()
            
            # 대화 기록을 리스트로 변환
            history_list = []
            for msg in reversed(conversation_history):
                history_list.append({
                    'sender': msg['sender'],
                    'content': msg['content'],
                    'timestamp': msg['timestamp']
                })
            
            # 사용자 메시지 저장
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO chat_messages (session_id, sender, content) VALUES (?, ?, ?)',
                (session_id, 'user', user_message)
            )
            
            # 반려동물 정보 구성
            pet_info = {
                'name': pet['name'],
                'species': pet['species'],
                'breed': pet['breed'],
                'personality': pet['personality'],
                'speaking_style': pet['speaking_style'],
                'user_call': pet['user_call'],
                'likes': pet['likes'],
                'dislikes': pet['dislikes'],
                'etc_info': pet['etc_info']
            }
            
            # AI 응답 생성
            ai_response = PetPersonaGenerator.generate_response(
                pet_info, user_message, history_list
            )
            
            # AI 응답 저장
            cursor.execute(
                'INSERT INTO chat_messages (session_id, sender, content) VALUES (?, ?, ?)',
                (session_id, 'bot', ai_response)
            )
            
            # 세션 마지막 메시지 시간 업데이트
            cursor.execute(
                'UPDATE chat_sessions SET last_message_time = CURRENT_TIMESTAMP WHERE id = ?',
                (session_id,)
            )
            
            conn.commit()
            return jsonify({'content': ai_response})
            
        except sqlite3.Error as e:
            conn.rollback()
            logging.error(f'채팅 메시지 저장 오류: {e}')
            return jsonify({'error': '메시지 전송에 실패했습니다'}), 500
        except Exception as e:
            logging.error(f'메시지 처리 오류: {e}')
            return jsonify({'error': '서버 오류가 발생했습니다'}), 500
        finally:
            conn.close()
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history/<int:pet_id>', methods=['GET'])
@login_required
def get_chat_history(pet_id):
    """특정 반려동물과의 최근 대화 기록 조회"""
    
    try:
        conn = get_db_connection()
        try:
            # 최근 세션 조회
            session_row = conn.execute(
                'SELECT id FROM chat_sessions WHERE user_id = ? AND pet_id = ? ORDER BY last_message_time DESC LIMIT 1',
                (session['user_id'], pet_id)
            ).fetchone()
            
            if not session_row:
                return jsonify({'messages': []})
            
            # 메시지 조회
            messages = conn.execute(
                'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC',
                (session_row['id'],)
            ).fetchall()
        finally:
            conn.close()
        
        messages_data = []
        for msg in messages:
            messages_data.append({
                'content': msg['content'],
                'sender': msg['sender'],
                'timestamp': msg['timestamp']
            })
        
        return jsonify({'messages': messages_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/sessions', methods=['GET'])
@login_required
def get_chat_sessions():
    """사용자의 모든 채팅 세션 조회"""
    
    try:
        conn = get_db_connection()
        try:
            sessions = conn.execute('''
                SELECT cs.*, p.name as pet_name,
                       cm.content as last_message
                FROM chat_sessions cs
                JOIN pets p ON cs.pet_id = p.id
                LEFT JOIN chat_messages cm ON cm.session_id = cs.id
                WHERE cs.user_id = ?
                GROUP BY cs.id
                HAVING cm.timestamp = MAX(cm.timestamp) OR cm.timestamp IS NULL
                ORDER BY cs.last_message_time DESC
                LIMIT 20
            ''', (session['user_id'],)).fetchall()
        finally:
            conn.close()
        
        sessions_data = []
        for s in sessions:
            sessions_data.append({
                'pet_id': s['pet_id'],
                'pet_name': s['pet_name'],
                'last_message': s['last_message'] or '대화를 시작해보세요',
                'last_message_time': s['last_message_time']
            })
        
        return jsonify({'sessions': sessions_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/save', methods=['POST'])
@login_required
def save_conversation():
    """대화 저장 (클라이언트에서 호출하는 경우)"""
    
    # 실제로는 메시지 전송 시 자동으로 저장되므로 
    # 이 엔드포인트는 추가적인 메타데이터 저장 등에 사용
    return jsonify({'success': True})

# 임시 로그인 세션 설정 (개발용)
@app.route('/api/dev/login', methods=['POST'])
def dev_login():
    """개발용 임시 로그인"""
    data = request.get_json()
    user_id = data.get('user_id', 1)  # 기본값 1
    session['user_id'] = user_id
    return jsonify({'success': True, 'user_id': user_id})

if __name__ == '__main__':
    # 데이터베이스 초기화
    init_db()
    
    # 개발용 샘플 데이터 추가
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 샘플 사용자 확인/추가
    user = cursor.execute('SELECT id FROM users WHERE id = 1').fetchone()
    if not user:
        hashed_pwd = hash_password('test123')  # 비밀번호 해싱
        cursor.execute('''
            INSERT INTO users (id, username, email, password_hash, nickname) 
            VALUES (1, 'test_user', 'test@example.com', ?, '테스트유저')
        ''', (hashed_pwd,))
    
    # 샘플 반려동물 확인/추가
    pet = cursor.execute('SELECT id FROM pets WHERE id = 1').fetchone()
    if not pet:
        cursor.execute('''
            INSERT INTO pets (id, user_id, name, species, breed, personality, 
                           speaking_style, user_call, likes, dislikes, etc_info) 
            VALUES (1, 1, '멍멍이', '강아지', '골든 리트리버', '활발하고 친근함', 
                   '귀엽고 애교있게', '주인님', '산책, 공놀이', '큰 소리', '꼬리를 많이 흔들어요')
        ''')
        
        cursor.execute('''
            INSERT INTO pets (id, user_id, name, species, breed, personality, 
                           speaking_style, user_call, likes, dislikes, etc_info) 
            VALUES (2, 1, '야옹이', '고양이', '러시안 블루', '도도하지만 애정많음', 
                   '츤데레', '집사', '햇볕쬐기, 참치', '물, 시끄러운 소리', '새벽에 활발해져요')
        ''')
    
    conn.commit()
    conn.close()
    
    print("반려동물 챗봇 서버가 시작됩니다...")
    app.run(debug=True, host='0.0.0.0', port=5000)