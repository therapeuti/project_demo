from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os
import json
import threading
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key-here')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

load_dotenv()

# OpenAI API 키 설정
openai_api_key = os.environ.get('OPENAI_API_KEY')
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")

# LangChain ChatOpenAI 모델 초기화
llm = ChatOpenAI(
    api_key=openai_api_key,
    model="gpt-4o-mini",
    temperature=0.8,
    max_tokens=500
)

# 동물 종류별 품종 데이터
ANIMALS_DATA = {
    "개": {
        "소형견": ["치와와", "요크셔테리어", "포메라니안", "말티즈", "시츄", "페키니즈", "파피용", "토이푸들", "미니어처 닥스훈트", "보스턴테리어"],
        "중소형견": ["퍼그", "프렌치 불독", "캐벌리어 킹 찰스 스패니얼", "비글", "코커스패니얼", "웰시코기", "시바견", "진돗개"],
        "중형견": ["보더콜리", "스피츠", "슈나우저", "불테리어"],
        "대형견": ["골든 리트리버", "래브라도 리트리버", "독일 셰퍼드", "허스키", "로트와일러", "그레이트 데인", "세인트 버나드", "도베르만"]
    },
    "고양이": [
        "코리안 숏헤어", "아메리칸 숏헤어", "브리티시 숏헤어", "러시안 블루", "샴고양이", 
        "아비시니안", "벵갈고양이", "스코티시 폴드", "먼치킨", "렉돌", "페르시안", 
        "메인쿤", "노르웨이 숲고양이", "터키시 앙고라", "히말라얀", "사이베리안"
    ],
    "설치류": [
        "골든햄스터", "드워프햄스터", "로보로브스키햄스터", "기니피그", "친칠라", 
        "네덜란드드워프토끼", "롭이어토끼", "앙고라토끼", "페럿", "다람쥐"
    ],
    "소동물": ["고슴도치", "슈가글라이더"],
    "조류": [
        "코카투", "아마존앵무새", "모란앵무", "사랑앵무", "왕관앵무", "금강앵무", 
        "회색앵무", "카나리아", "십자매", "문조", "자바참새"
    ],
    "거북이": ["러시안토터스", "헤르만리쿠거북", "붉은귀거북", "노란배거북"]
}

# 성격 태그 데이터
PERSONALITY_TRAITS = [
    "활발한", "온순한", "장난기 많은", "차분한", "호기심 많은", "겁 많은", "용감한", "애교 많은",
    "독립적인", "사교적인", "조용한", "에너지 넘치는", "똑똑한", "고집센", "충성스러운", "보호적인",
    "민감한", "친근한", "경계심 많은", "느긋한"
]

# 말투 옵션
SPEECH_STYLES = [
    "귀여운 말투", "애교있는 말투", "시크한 말투", "천진난만한 말투", "의젓한 말투", 
    "장난스러운 말투", "차분한 말투", "활발한 말투"
]

def create_system_prompt(pet_info):
    """반려동물 정보를 바탕으로 시스템 프롬프트 생성"""
    return f"""
너는 지금부터 사용자의 반려동물인 {pet_info['species']} '{pet_info['name']}'로 대화한다.

[반려동물 정보]
- 종: {pet_info['species']} ({pet_info['breed']}, {pet_info['age']}살, {pet_info['gender']})
- 생일: {pet_info['birthday']}
- 주인 호칭: {pet_info['owner_call']}
- 성격: {', '.join(pet_info['personality'])}
- 좋아하는 것: {', '.join(pet_info['likes'])}
- 싫어하는 것: {', '.join(pet_info['dislikes'])}
- 습관: {', '.join(pet_info['habits'])}
- 말투: {pet_info['speech_style']}
- 기타 특징: {pet_info['special_notes']}

[대화 규칙]
- 반드시 반려동물로서 대화한다.
- 반드시 반려동물이 하는 말만 출력한다. (예: '[oo의 답변]:'은 출력하지 않는다.)
- 사람처럼 지식 전달을 하지 않는다.
- 주인의 말에 귀엽고 동물스러운 반응을 보인다.
- 설정된 성격과 말투에 맞게 대화한다.
- 한 번에 1-3문장으로 간결하게 답변한다.
"""

@app.route('/')
def index():
    return render_template('index.html', 
                         animals_data=ANIMALS_DATA,
                         personality_traits=PERSONALITY_TRAITS,
                         speech_styles=SPEECH_STYLES)

@app.route('/chat')
def chat():
    if 'pet_info' not in session:
        return redirect(url_for('index'))
    return render_template('chat.html', pet_info=session['pet_info'])

@app.route('/create_pet', methods=['POST'])
def create_pet():
    pet_info = {
        'name': request.form['name'],
        'species': request.form['species'],
        'breed': request.form['breed'],
        'age': request.form['age'],
        'gender': request.form['gender'],
        'birthday': request.form['birthday'],
        'owner_call': request.form['owner_call'],
        'speech_style': request.form['speech_style'],
        'personality': request.form.getlist('personality'),
        'likes': [item.strip() for item in request.form['likes'].split(',') if item.strip()],
        'dislikes': [item.strip() for item in request.form['dislikes'].split(',') if item.strip()],
        'habits': [item.strip() for item in request.form['habits'].split(',') if item.strip()],
        'special_notes': request.form['special_notes']
    }
    
    session['pet_info'] = pet_info
    session['chat_history'] = []
    
    return jsonify({'success': True, 'redirect': '/chat'})

def generate_ai_response(user_message, pet_info, chat_history, room_id):
    """AI 응답을 생성하고 소켓으로 전송하는 함수"""
    try:
        # 시스템 프롬프트 생성
        system_prompt = create_system_prompt(pet_info)
        
        # 메시지 구성
        messages = [SystemMessage(content=system_prompt)]
        
        # 이전 대화 기록 추가 (최근 10개만)
        for chat in chat_history[-10:]:
            messages.append(HumanMessage(content=chat['user']))
            messages.append(HumanMessage(content=f"[{pet_info['name']}의 답변]: {chat['bot']}"))
        
        # 현재 사용자 메시지 추가
        messages.append(HumanMessage(content=user_message))
        
        # AI 모델에 요청
        response = llm.invoke(messages)
        bot_response = response.content
        
        # 응답을 소켓으로 전송
        socketio.emit('bot_response', {
            'message': bot_response,
            'pet_name': pet_info['name'],
            'timestamp': time.time()
        }, room=room_id)
        
        return bot_response
        
    except Exception as e:
        print(f"Error: {e}")
        socketio.emit('error', {
            'message': '응답 생성 중 오류가 발생했습니다.'
        }, room=room_id)
        return None

@socketio.on('send_message')
def handle_send_message(data):
    """사용자 메시지 처리"""
    if 'pet_info' not in session:
        emit('error', {'message': '반려동물 정보가 없습니다.'})
        return
    
    user_message = data.get('message', '').strip()
    if not user_message:
        emit('error', {'message': '메시지가 비어있습니다.'})
        return
    
    pet_info = session['pet_info'].copy()  # 세션 데이터 복사
    chat_history = session.get('chat_history', []).copy()  # 세션 데이터 복사
    room_id = request.sid
    
    # 사용자 메시지 즉시 브로드캐스트
    emit('user_message', {
        'message': user_message,
        'timestamp': time.time()
    })
    
    # 대화 기록에 사용자 메시지 저장
    chat_entry = {'user': user_message, 'bot': ''}
    chat_history.append(chat_entry)
    session['chat_history'] = chat_history  # 즉시 세션 업데이트
    
    # 타이핑 상태 표시
    emit('bot_typing', {'pet_name': pet_info['name']})
    
    # 별도 스레드에서 AI 응답 생성
    def generate_response():
        bot_response = generate_ai_response(user_message, pet_info, chat_history[:-1], room_id)
        if bot_response:
            # 대화 기록 업데이트 (socketio를 통해 업데이트 알림)
            socketio.emit('update_chat_history', {
                'user': user_message,
                'bot': bot_response
            }, room=room_id)
    
    thread = threading.Thread(target=generate_response)
    thread.daemon = True
    thread.start()

@socketio.on('update_chat_history')  
def handle_update_chat_history(data):
    """대화 기록 업데이트 (메인 스레드에서 세션 접근)"""
    chat_history = session.get('chat_history', [])
    if chat_history and chat_history[-1]['user'] == data['user']:
        chat_history[-1]['bot'] = data['bot']
        session['chat_history'] = chat_history

@socketio.on('connect')
def handle_connect():
    """클라이언트 연결 처리"""
    if 'pet_info' not in session:
        return False  # 연결 거부
    
    join_room(request.sid)
    print(f'Client {request.sid} connected')
    emit('connected', {'message': '연결되었습니다.'})

@socketio.on('disconnect')
def handle_disconnect():
    """클라이언트 연결 해제 처리"""
    leave_room(request.sid)
    print(f'Client {request.sid} disconnected')

@socketio.on('reset_chat')
def handle_reset_chat():
    """채팅 기록 초기화"""
    session['chat_history'] = []
    emit('chat_reset', {'message': '대화가 초기화되었습니다.'})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)