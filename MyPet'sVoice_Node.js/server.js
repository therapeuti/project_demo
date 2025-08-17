const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 데이터베이스 모델 초기화
require('./models');
const db = require('./config/database');

// 라우터 import
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const petRoutes = require('./routes/pet');
const diaryRoutes = require('./routes/diary');
const communityRoutes = require('./routes/community');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어 (개발 환경에서는 CSP 비활성화)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  // 개발 환경에서는 CSP 비활성화
  app.use(helmet({
    contentSecurityPolicy: false
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});
app.use(limiter);

// CORS 설정
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// 미들웨어 설정
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// Passport 설정 불러오기
require('./config/passport');

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 라우터 설정
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pet', petRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', aiRoutes);

// 메인 페이지 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA를 위한 catch-all 핸들러
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? '서버 오류가 발생했습니다.' 
      : err.message 
  });
});

// 데이터베이스 연결 및 서버 시작
db.sync()
  .then(() => {
    console.log('데이터베이스 연결 성공');
    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
  })
  .catch(err => {
    console.error('데이터베이스 연결 실패:', err);
  });