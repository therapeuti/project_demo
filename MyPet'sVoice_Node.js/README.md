# MyPet's Voice - 반려동물 소통 플랫폼

반려동물과의 상호작용을 통한 종합적인 반려동물 관리 및 커뮤니티 서비스입니다.

## 🐾 주요 기능

### Phase 1 (구현 완료)
- ✅ **회원가입/로그인**: 자체 회원가입 및 소셜 로그인 (Google, Kakao, Naver)
- ✅ **반려동물 프로필 관리**: CRUD 기능, AI 채팅용 설정
- ✅ **기본 AI 대화**: 반려동물 페르소나 기반 맞춤형 대화
- ✅ **마이페이지**: 사용자 프로필 및 반려동물 관리

### Phase 2 (준비 중)
- 🔄 **일기 작성**: 반려동물 관점의 그림일기
- 🔄 **커뮤니티**: 게시글, 댓글, 태그 시스템
- 🔄 **반려동물 케어**: 건강 관리, 루틴 관리

### Phase 3 (예정)
- 📅 **지도 서비스**: 반려동물 동반 가능 장소
- 📅 **여행지 정보**: 반려동물 여행 정보
- 📅 **고급 AI 기능**: Function Calling, TTS

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (개발용), MySQL (프로덕션)
- **ORM**: Sequelize
- **Authentication**: Passport.js (Local, OAuth)
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **언어**: Vanilla JavaScript
- **스타일**: CSS3 (Flexbox, Grid)
- **아이콘**: Font Awesome
- **폰트**: Noto Sans KR

### AI & External APIs
- **AI Chat**: OpenAI GPT-3.5-turbo
- **이메일**: Nodemailer
- **파일 업로드**: Multer
- **날씨 API**: OpenWeatherMap
- **소셜 로그인**: Google, Kakao, Naver OAuth

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 16.x 이상
- npm 또는 yarn

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd project3_MyPet'sVoice
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.example`을 참고하여 `.env` 파일을 생성하고 필요한 값을 설정합니다.

**기본 데모 실행용 (최소 설정)**:
```env
SESSION_SECRET=demo-secret-key
JWT_SECRET=demo-jwt-secret
PORT=3000
NODE_ENV=development
```

**완전한 기능 사용시 추가 필요**:
- OpenAI API 키 (AI 채팅)
- 소셜 로그인 클라이언트 ID/Secret
- SMTP 이메일 설정
- 날씨 API 키

### 4. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 5. 접속
브라우저에서 `http://localhost:3000`으로 접속

## 📁 프로젝트 구조

```
project3_MyPet'sVoice/
├── config/
│   ├── database.js      # 데이터베이스 설정
│   └── passport.js      # 인증 전략 설정
├── models/
│   ├── User.js          # 사용자 모델
│   ├── Pet.js           # 반려동물 모델
│   ├── Diary.js         # 일기 모델
│   ├── Community.js     # 커뮤니티 모델
│   └── index.js         # 모델 관계 설정
├── routes/
│   ├── auth.js          # 인증 라우터
│   ├── user.js          # 사용자 라우터
│   ├── pet.js           # 반려동물 라우터
│   ├── diary.js         # 일기 라우터
│   ├── community.js     # 커뮤니티 라우터
│   └── ai.js            # AI 채팅 라우터
├── middleware/
│   └── auth.js          # 인증 미들웨어
├── utils/
│   └── email.js         # 이메일 유틸리티
├── public/
│   ├── css/style.css    # 스타일시트
│   ├── js/app.js        # 프론트엔드 로직
│   ├── images/          # 이미지 파일
│   └── index.html       # 메인 HTML
├── uploads/             # 업로드된 파일 저장
├── server.js            # 메인 서버 파일
├── package.json         # 프로젝트 설정
└── README.md           # 프로젝트 문서
```

## 🔧 API 엔드포인트

### 인증 (Authentication)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/verify-email` - 이메일 인증
- `POST /api/auth/check-username` - 아이디 중복 확인

### 사용자 (User)
- `GET /api/user/profile` - 프로필 조회
- `PUT /api/user/profile` - 프로필 수정
- `POST /api/user/profile/image` - 프로필 이미지 업로드

### 반려동물 (Pet)
- `GET /api/pet` - 반려동물 목록
- `GET /api/pet/:petId` - 반려동물 상세
- `POST /api/pet` - 반려동물 등록
- `PUT /api/pet/:petId` - 반려동물 수정
- `DELETE /api/pet/:petId` - 반려동물 삭제

### AI 채팅 (AI)
- `POST /api/ai/chat` - AI와 채팅
- `POST /api/ai/tts` - 텍스트 음성 변환 (준비 중)

## 🎨 UI/UX 특징

- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **직관적인 네비게이션**: 단일 페이지 애플리케이션 (SPA) 구조
- **사용자 친화적**: 반려동물 테마의 따뜻한 색감과 이모티콘
- **접근성**: 키보드 네비게이션 및 스크린 리더 지원

## 🔐 보안 기능

- **비밀번호 암호화**: bcryptjs를 사용한 해시화
- **JWT 토큰**: 안전한 인증 토큰 관리
- **세션 관리**: 보안 세션 설정
- **CORS 보호**: 교차 도메인 요청 제어
- **Rate Limiting**: API 호출 제한
- **Helmet**: 보안 헤더 설정

## 🚨 알려진 이슈

1. **소셜 로그인**: 실제 클라이언트 키 설정 필요
2. **이메일 인증**: SMTP 서버 설정 필요
3. **AI 채팅**: OpenAI API 키 없을 시 모의 응답 제공
4. **파일 업로드**: 프로덕션 환경에서는 클라우드 스토리지 권장

## 🔄 향후 업데이트

- [ ] 일기 작성 기능 완성
- [ ] 커뮤니티 기능 활성화
- [ ] 반려동물 케어 루틴 관리
- [ ] 지도 서비스 연동
- [ ] 모바일 앱 버전
- [ ] 다국어 지원
- [ ] PWA (Progressive Web App) 지원

## 📞 지원 및 문의

프로젝트 관련 문의나 버그 리포트는 Issues 탭을 이용해주세요.

---

**MyPet's Voice** - 우리 반려동물과 함께하는 특별한 소통의 시간 🐾