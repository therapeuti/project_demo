# My Pet's Voice - 반려동물 채팅 앱

이 애플리케이션은 반려동물의 정보를 입력받아 AI를 통해 반려동물의 페르소나를 생성하고, 사용자와 반려동물이 대화할 수 있는 Flask 웹 애플리케이션입니다.

## 주요 기능

- 반려동물 정보 입력 (이름, 종류, 품종, 성격, 말투 등)
- AI 기반 반려동물 페르소나 생성
- 실시간 채팅 인터페이스
- 반려동물의 특성에 맞는 대화 스타일 구현

## 기술 스택

- **Backend**: Flask, LangChain, OpenAI GPT-4
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **AI**: OpenAI GPT-4o-mini 모델

## 설치 및 실행

### 1. 필요 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 OpenAI API 키를 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 편집:
```
OPENAI_API_KEY=your_actual_openai_api_key
FLASK_SECRET_KEY=your_secret_key
```

### 3. 애플리케이션 실행

```bash
python app.py
```

애플리케이션이 http://localhost:5000 에서 실행됩니다.

## 사용 방법

1. **반려동물 정보 입력**
   - 메인 페이지에서 반려동물의 기본 정보를 입력
   - 이름, 종류, 품종, 나이, 성별 등 필수 정보
   - 성격, 말투, 좋아하는 것/싫어하는 것, 습관 등 선택 정보

2. **채팅 시작**
   - 정보 입력 완료 후 채팅 페이지로 이동
   - 좌측에 반려동물 정보 패널 표시
   - 우측에서 실시간 대화 진행

3. **대화하기**
   - 입력창에 메시지 입력
   - AI가 설정한 반려동물 페르소나로 응답
   - 대화 기록 자동 저장 및 표시

## 파일 구조

```
chat/
├── app.py                 # Flask 메인 애플리케이션
├── requirements.txt       # Python 패키지 의존성
├── .env.example          # 환경변수 예시 파일
├── README.md             # 프로젝트 설명서
├── templates/            # HTML 템플릿
│   ├── index.html        # 메인 페이지 (반려동물 정보 입력)
│   └── chat.html         # 채팅 페이지
└── static/               # 정적 파일
    ├── css/
    │   ├── style.css     # 메인 페이지 스타일
    │   └── chat.css      # 채팅 페이지 스타일
    └── js/
        └── script.js     # JavaScript 로직
```

## API 엔드포인트

- `GET /` - 메인 페이지 (반려동물 정보 입력)
- `GET /chat` - 채팅 페이지
- `POST /create_pet` - 반려동물 정보 저장
- `POST /send_message` - 채팅 메시지 전송
- `POST /reset_chat` - 채팅 기록 초기화

## 환경 변수

- `OPENAI_API_KEY`: OpenAI API 키 (필수)
- `FLASK_SECRET_KEY`: Flask 세션 암호화 키
- `FLASK_DEBUG`: 개발 모드 설정

## 주의사항

- OpenAI API 키가 필요합니다. (https://platform.openai.com/api-keys)
- API 사용량에 따라 비용이 발생할 수 있습니다.
- 개발 환경에서만 사용하시고, 프로덕션 환경에서는 추가 보안 설정이 필요합니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.