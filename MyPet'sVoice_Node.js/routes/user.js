const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { User, Pet } = require('../models');
const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 사용자 프로필 조회
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'name', 'nickname', 'profileImage', 'socialProvider', 'createdAt'],
      include: [{
        model: Pet,
        attributes: ['id', 'name', 'species', 'breed', 'profileImage']
      }]
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user });

  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자 프로필 수정
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    }

    if (nickname.length < 2 || nickname.length > 50) {
      return res.status(400).json({ error: '닉네임은 2-50자 사이여야 합니다.' });
    }

    const user = await User.findByPk(req.user.id);
    user.nickname = nickname;
    await user.save();

    res.json({
      message: '프로필이 수정되었습니다.',
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
    console.error('프로필 수정 오류:', error);
    res.status(500).json({ error: '프로필 수정 중 오류가 발생했습니다.' });
  }
});

// 프로필 이미지 업로드
router.post('/profile/image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지를 선택해주세요.' });
    }

    const user = await User.findByPk(req.user.id);
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: '프로필 이미지가 변경되었습니다.',
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error('프로필 이미지 업로드 오류:', error);
    res.status(500).json({ error: '프로필 이미지 업로드 중 오류가 발생했습니다.' });
  }
});

// 다른 사용자 프로필 조회 (공개 정보만)
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'nickname', 'profileImage', 'createdAt'],
      include: [{
        model: Pet,
        attributes: ['id', 'name', 'species', 'profileImage']
      }]
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user });

  } catch (error) {
    console.error('사용자 프로필 조회 오류:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;