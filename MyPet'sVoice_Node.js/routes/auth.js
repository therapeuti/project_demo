const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('../config/passport');
const validator = require('validator');
const { User } = require('../models');
const { sendVerificationEmail } = require('../utils/email');
const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, confirmPassword, name, nickname } = req.body;

    // 유효성 검사
    if (!email || !username || !password || !confirmPassword || !name || !nickname) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: '유효한 이메일을 입력해주세요.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    }

    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return res.status(400).json({ error: '아이디는 영문, 숫자 조합 4-20자여야 합니다.' });
    }

    // 중복 체크
    const { Op } = require('sequelize');
    const existingUser = await User.findOne({
      where: { 
        [Op.or]: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
      }
    }

    // 비밀번호 해시화
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 이메일 인증 토큰 생성
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // 사용자 생성
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      name,
      nickname,
      emailVerificationToken,
      socialProvider: 'local'
    });

    // 이메일 인증 메일 발송
    const emailSent = await sendVerificationEmail(email, emailVerificationToken);

    res.status(201).json({
      message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
      emailSent,
      userId: user.id
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 이메일 인증
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: '인증 토큰이 필요합니다.' });
    }

    const user = await User.findOne({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ error: '유효하지 않은 인증 토큰입니다.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: '이미 인증된 이메일입니다.' });
    }

    // 이메일 인증 처리
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    res.redirect('/?verified=true');

  } catch (error) {
    console.error('이메일 인증 오류:', error);
    res.status(500).json({ error: '이메일 인증 중 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }

    if (!user) {
      return res.status(401).json({ error: info.message });
    }

    req.logIn(user, async (err) => {
      if (err) {
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      await user.save();

      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: '로그인 성공',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          profileImage: user.profileImage
        },
        token
      });
    });
  })(req, res, next);
});

// 로그아웃
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
    }
    req.session.destroy();
    res.json({ message: '로그아웃 되었습니다.' });
  });
});

// 아이디 중복 확인
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: '아이디를 입력해주세요.' });
    }

    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return res.status(400).json({ 
        error: '아이디는 영문, 숫자 조합 4-20자여야 합니다.',
        available: false 
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    const available = !existingUser;

    res.json({
      available,
      message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'
    });

  } catch (error) {
    console.error('아이디 중복 확인 오류:', error);
    res.status(500).json({ error: '아이디 중복 확인 중 오류가 발생했습니다.' });
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  async (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      req.user.lastLoginAt = new Date();
      await req.user.save();

      res.redirect(`/?token=${token}&login=success`);
    } catch (error) {
      console.error('Google 로그인 콜백 오류:', error);
      res.redirect('/login?error=callback');
    }
  }
);

// Kakao OAuth
router.get('/kakao', passport.authenticate('kakao'));

router.get('/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/login?error=kakao' }),
  async (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      req.user.lastLoginAt = new Date();
      await req.user.save();

      res.redirect(`/?token=${token}&login=success`);
    } catch (error) {
      console.error('Kakao 로그인 콜백 오류:', error);
      res.redirect('/login?error=callback');
    }
  }
);

// Naver OAuth
router.get('/naver', passport.authenticate('naver'));

router.get('/naver/callback',
  passport.authenticate('naver', { failureRedirect: '/login?error=naver' }),
  async (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      req.user.lastLoginAt = new Date();
      await req.user.save();

      res.redirect(`/?token=${token}&login=success`);
    } catch (error) {
      console.error('Naver 로그인 콜백 오류:', error);
      res.redirect('/login?error=callback');
    }
  }
);

// 현재 사용자 정보 조회
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        profileImage: user.profileImage,
        socialProvider: user.socialProvider
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
});

module.exports = router;