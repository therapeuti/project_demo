const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Diary, Pet, User } = require('../models');
const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/diary/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 일기 목록 조회 (내 일기)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { petId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (petId) {
      where.petId = petId;
    }

    const diaries = await Diary.findAndCountAll({
      where,
      include: [{
        model: Pet,
        attributes: ['id', 'name', 'species', 'profileImage']
      }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      diaries: diaries.rows,
      totalCount: diaries.count,
      totalPages: Math.ceil(diaries.count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('일기 목록 조회 오류:', error);
    res.status(500).json({ error: '일기 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 공개 일기 목록 조회
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const diaries = await Diary.findAndCountAll({
      where: { isPublic: true },
      include: [
        {
          model: Pet,
          attributes: ['id', 'name', 'species', 'profileImage']
        },
        {
          model: User,
          attributes: ['id', 'nickname', 'profileImage']
        }
      ],
      order: [['likesCount', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      diaries: diaries.rows,
      totalCount: diaries.count,
      totalPages: Math.ceil(diaries.count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('공개 일기 목록 조회 오류:', error);
    res.status(500).json({ error: '공개 일기 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 일기 상세 조회
router.get('/:diaryId', optionalAuth, async (req, res) => {
  try {
    const { diaryId } = req.params;

    const diary = await Diary.findByPk(diaryId, {
      include: [
        {
          model: Pet,
          attributes: ['id', 'name', 'species', 'breed', 'profileImage']
        },
        {
          model: User,
          attributes: ['id', 'nickname', 'profileImage']
        }
      ]
    });

    if (!diary) {
      return res.status(404).json({ error: '일기를 찾을 수 없습니다.' });
    }

    // 공개 일기가 아닌 경우 작성자만 조회 가능
    if (!diary.isPublic && (!req.user || diary.userId !== req.user.id)) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    res.json({ diary });

  } catch (error) {
    console.error('일기 조회 오류:', error);
    res.status(500).json({ error: '일기 조회 중 오류가 발생했습니다.' });
  }
});

// 일기 작성
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const {
      petId,
      title,
      date,
      userContent,
      isPublic = false
    } = req.body;

    if (!petId || !title || !userContent) {
      return res.status(400).json({ error: '반려동물, 제목, 내용을 입력해주세요.' });
    }

    // 반려동물 소유 확인
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

    // 날씨 정보 가져오기 (데모용)
    const weather = await getWeatherInfo();

    // 이미지 경로 처리
    const imagePaths = req.files ? req.files.map(file => `/uploads/diary/${file.filename}`) : [];

    // AI로 일기 내용 생성
    const aiContent = await generateDiaryContent(pet, userContent, req.user);

    const diary = await Diary.create({
      userId: req.user.id,
      petId,
      title: title.trim(),
      date: date || new Date().toISOString().split('T')[0],
      weather: weather.condition,
      weatherIcon: weather.icon,
      temperature: weather.temperature,
      images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : null,
      userContent: userContent.trim(),
      aiContent,
      isPublic: isPublic === 'true' || isPublic === true
    });

    const createdDiary = await Diary.findByPk(diary.id, {
      include: [{
        model: Pet,
        attributes: ['id', 'name', 'species', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '일기가 작성되었습니다.',
      diary: createdDiary
    });

  } catch (error) {
    console.error('일기 작성 오류:', error);
    res.status(500).json({ error: '일기 작성 중 오류가 발생했습니다.' });
  }
});

// 일기 수정
router.put('/:diaryId', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { diaryId } = req.params;
    const {
      title,
      date,
      userContent,
      isPublic,
      regenerateAI
    } = req.body;

    const diary = await Diary.findOne({
      where: { 
        id: diaryId, 
        userId: req.user.id 
      },
      include: [{ model: Pet }]
    });

    if (!diary) {
      return res.status(404).json({ error: '일기를 찾을 수 없습니다.' });
    }

    const updateData = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (date !== undefined) updateData.date = date;
    if (userContent !== undefined) updateData.userContent = userContent.trim();
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;

    // 새 이미지가 업로드된 경우
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map(file => `/uploads/diary/${file.filename}`);
      updateData.images = JSON.stringify(imagePaths);
    }

    // AI 내용 재생성 요청 시
    if (regenerateAI === 'true' && userContent) {
      const aiContent = await generateDiaryContent(diary.Pet, userContent, req.user);
      updateData.aiContent = aiContent;
    }

    await diary.update(updateData);

    const updatedDiary = await Diary.findByPk(diary.id, {
      include: [{
        model: Pet,
        attributes: ['id', 'name', 'species', 'profileImage']
      }]
    });

    res.json({
      message: '일기가 수정되었습니다.',
      diary: updatedDiary
    });

  } catch (error) {
    console.error('일기 수정 오류:', error);
    res.status(500).json({ error: '일기 수정 중 오류가 발생했습니다.' });
  }
});

// 일기 삭제
router.delete('/:diaryId', authenticateToken, async (req, res) => {
  try {
    const { diaryId } = req.params;

    const diary = await Diary.findOne({
      where: { 
        id: diaryId, 
        userId: req.user.id 
      }
    });

    if (!diary) {
      return res.status(404).json({ error: '일기를 찾을 수 없습니다.' });
    }

    await diary.destroy();

    res.json({ message: '일기가 삭제되었습니다.' });

  } catch (error) {
    console.error('일기 삭제 오류:', error);
    res.status(500).json({ error: '일기 삭제 중 오류가 발생했습니다.' });
  }
});

// 일기 좋아요/북마크 토글
router.post('/:diaryId/like', authenticateToken, async (req, res) => {
  try {
    const { diaryId } = req.params;

    const diary = await Diary.findByPk(diaryId);
    if (!diary) {
      return res.status(404).json({ error: '일기를 찾을 수 없습니다.' });
    }

    if (!diary.isPublic) {
      return res.status(403).json({ error: '비공개 일기입니다.' });
    }

    // 실제로는 별도의 Like 테이블을 만들어야 하지만, 데모에서는 단순하게 처리
    diary.likesCount += 1;
    await diary.save();

    res.json({
      message: '좋아요가 추가되었습니다.',
      likesCount: diary.likesCount
    });

  } catch (error) {
    console.error('좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다.' });
  }
});

// 날씨 정보 가져오기 함수 (데모용)
async function getWeatherInfo() {
  try {
    if (process.env.WEATHER_API_KEY) {
      // 실제 날씨 API 호출
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${process.env.WEATHER_API_KEY}&units=metric&lang=kr`
      );
      
      return {
        condition: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        temperature: `${Math.round(response.data.main.temp)}°C`
      };
    } else {
      // 데모용 랜덤 날씨
      const conditions = ['맑음', '흐림', '비', '눈', '구름 조금'];
      const icons = ['01d', '02d', '10d', '13d', '03d'];
      const randomIndex = Math.floor(Math.random() * conditions.length);
      
      return {
        condition: conditions[randomIndex],
        icon: icons[randomIndex],
        temperature: `${Math.floor(Math.random() * 30 + 5)}°C`
      };
    }
  } catch (error) {
    console.error('날씨 정보 조회 오류:', error);
    return {
      condition: '맑음',
      icon: '01d',
      temperature: '20°C'
    };
  }
}

// AI 일기 내용 생성 함수
async function generateDiaryContent(pet, userContent, user) {
  const prompt = `
    당신은 ${pet.name}라는 이름의 ${pet.species}입니다.
    주인이 오늘 있었던 일에 대해 "${userContent}"라고 적었습니다.
    
    이 내용을 바탕으로 ${pet.name}의 관점에서 하루 일기를 작성해주세요.
    - 반려동물의 시각에서 귀엽고 사랑스럽게 작성
    - 주인과의 추억과 감정을 중심으로 표현
    - 3-5문단 정도의 적당한 길이
    - 이모티콘 적절히 사용
    - 반려동물다운 순수하고 따뜻한 감정 표현
  `;

  try {
    if (process.env.OPENAI_API_KEY) {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: 800,
          temperature: 0.8
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } else {
      // 데모용 모의 일기 생성
      return generateMockDiary(pet, userContent);
    }
  } catch (error) {
    console.error('AI 일기 생성 오류:', error);
    return generateMockDiary(pet, userContent);
  }
}

// 데모용 모의 일기 생성
function generateMockDiary(pet, userContent) {
  return `안녕! ${pet.name}이야~ 🐾

오늘 하루 정말 즐거웠어! 주인님과 함께 보낸 시간이 너무 행복했어. ${userContent}에 대해 이야기해줘서 고마워!

주인님이 나를 많이 사랑해주는 게 느껴져서 정말 기뻐! 💕 매일매일 이렇게 함께 있을 수 있어서 너무 좋아. 

내일은 또 어떤 재미있는 일들이 기다리고 있을까? 주인님과 함께라면 뭐든 즐거울 것 같아! 

오늘도 고마웠어, 주인님! 많이 사랑해~ 🥰

- ${pet.name} 올림 -`;
}

module.exports = router;