const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { Pet } = require('../models');
const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/pets/');
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

// 반려동물 목록 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pets = await Pet.findAll({
      where: { userId: req.user.id, status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    res.json({ pets });

  } catch (error) {
    console.error('반려동물 목록 조회 오류:', error);
    res.status(500).json({ error: '반려동물 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 반려동물 상세 정보 조회
router.get('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await Pet.findOne({
      where: { 
        id: petId, 
        userId: req.user.id,
        status: 'active' 
      }
    });

    if (!pet) {
      return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
    }

    res.json({ pet });

  } catch (error) {
    console.error('반려동물 정보 조회 오류:', error);
    res.status(500).json({ error: '반려동물 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 반려동물 등록
router.post('/', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const {
      name,
      species,
      breed,
      gender,
      isNeutered,
      birthDate,
      speechStyle,
      userNickname,
      personality,
      likes,
      dislikes,
      habits,
      characteristics,
      family,
      otherInfo,
      allergies,
      diseases,
      surgeries,
      healthNotes
    } = req.body;

    if (!name || !species) {
      return res.status(400).json({ error: '반려동물 이름과 종류는 필수 입력사항입니다.' });
    }

    const petData = {
      userId: req.user.id,
      name: name.trim(),
      species: species.trim(),
      breed: breed?.trim(),
      gender: gender || null,
      isNeutered: isNeutered !== undefined ? isNeutered === 'true' : null,
      birthDate: birthDate || null,
      profileImage: req.file ? `/uploads/pets/${req.file.filename}` : null,
      speechStyle: speechStyle?.trim(),
      userNickname: userNickname?.trim(),
      personality: personality?.trim(),
      likes: likes?.trim(),
      dislikes: dislikes?.trim(),
      habits: habits?.trim(),
      characteristics: characteristics?.trim(),
      family: family?.trim(),
      otherInfo: otherInfo?.trim(),
      allergies: allergies?.trim(),
      diseases: diseases?.trim(),
      surgeries: surgeries?.trim(),
      healthNotes: healthNotes?.trim()
    };

    const pet = await Pet.create(petData);

    res.status(201).json({
      message: '반려동물이 등록되었습니다.',
      pet
    });

  } catch (error) {
    console.error('반려동물 등록 오류:', error);
    res.status(500).json({ error: '반려동물 등록 중 오류가 발생했습니다.' });
  }
});

// 반려동물 정보 수정
router.put('/:petId', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const { petId } = req.params;
    const {
      name,
      species,
      breed,
      gender,
      isNeutered,
      birthDate,
      speechStyle,
      userNickname,
      personality,
      likes,
      dislikes,
      habits,
      characteristics,
      family,
      otherInfo,
      allergies,
      diseases,
      surgeries,
      healthNotes
    } = req.body;

    const pet = await Pet.findOne({
      where: { 
        id: petId, 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!pet) {
      return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
    }

    if (!name || !species) {
      return res.status(400).json({ error: '반려동물 이름과 종류는 필수 입력사항입니다.' });
    }

    // 업데이트할 데이터 준비
    const updateData = {
      name: name.trim(),
      species: species.trim(),
      breed: breed?.trim(),
      gender: gender || null,
      isNeutered: isNeutered !== undefined ? isNeutered === 'true' : null,
      birthDate: birthDate || null,
      speechStyle: speechStyle?.trim(),
      userNickname: userNickname?.trim(),
      personality: personality?.trim(),
      likes: likes?.trim(),
      dislikes: dislikes?.trim(),
      habits: habits?.trim(),
      characteristics: characteristics?.trim(),
      family: family?.trim(),
      otherInfo: otherInfo?.trim(),
      allergies: allergies?.trim(),
      diseases: diseases?.trim(),
      surgeries: surgeries?.trim(),
      healthNotes: healthNotes?.trim()
    };

    // 새 프로필 이미지가 업로드된 경우
    if (req.file) {
      updateData.profileImage = `/uploads/pets/${req.file.filename}`;
    }

    await pet.update(updateData);

    res.json({
      message: '반려동물 정보가 수정되었습니다.',
      pet: await pet.reload()
    });

  } catch (error) {
    console.error('반려동물 정보 수정 오류:', error);
    res.status(500).json({ error: '반려동물 정보 수정 중 오류가 발생했습니다.' });
  }
});

// 반려동물 삭제
router.delete('/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await Pet.findOne({
      where: { 
        id: petId, 
        userId: req.user.id,
        status: 'active' 
      }
    });

    if (!pet) {
      return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
    }

    // 소프트 삭제 (상태 변경)
    await pet.update({ status: 'inactive' });

    res.json({ message: '반려동물이 삭제되었습니다.' });

  } catch (error) {
    console.error('반려동물 삭제 오류:', error);
    res.status(500).json({ error: '반려동물 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;