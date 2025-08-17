const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { Pet } = require('../models');
const router = express.Router();

// OpenAI API와 대화
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { petId, message } = req.body;

    if (!petId || !message) {
      return res.status(400).json({ error: '반려동물 ID와 메시지를 입력해주세요.' });
    }

    // 반려동물 정보 조회
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

    // AI 페르소나 프롬프트 생성
    const systemPrompt = generatePetPersona(pet, req.user);

    try {
      // OpenAI API 호출 (실제 API 키가 없을 경우를 대비한 모의 응답)
      let aiResponse;
      
      if (process.env.OPENAI_API_KEY) {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            max_tokens: 500,
            temperature: 0.8
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        aiResponse = response.data.choices[0].message.content;
      } else {
        // 데모용 모의 응답
        aiResponse = generateMockResponse(pet, message);
      }

      res.json({
        response: aiResponse,
        pet: {
          id: pet.id,
          name: pet.name,
          species: pet.species
        }
      });

    } catch (apiError) {
      console.error('AI API 오류:', apiError);
      
      // API 오류 시 모의 응답 제공
      const mockResponse = generateMockResponse(pet, message);
      res.json({
        response: mockResponse,
        pet: {
          id: pet.id,
          name: pet.name,
          species: pet.species
        },
        note: 'AI API를 사용할 수 없어 데모 응답을 제공합니다.'
      });
    }

  } catch (error) {
    console.error('AI 채팅 오류:', error);
    res.status(500).json({ error: 'AI 채팅 중 오류가 발생했습니다.' });
  }
});

// AI 페르소나 프롬프트 생성 함수
function generatePetPersona(pet, user) {
  let prompt = `당신은 ${pet.name}라는 이름의 ${pet.species}입니다.`;
  
  if (pet.breed) {
    prompt += ` 품종은 ${pet.breed}입니다.`;
  }
  
  if (pet.gender) {
    prompt += ` 성별은 ${pet.gender === 'male' ? '수컷' : '암컷'}입니다.`;
  }
  
  if (pet.personality) {
    prompt += ` 성격: ${pet.personality}`;
  }
  
  if (pet.speechStyle) {
    prompt += ` 말투: ${pet.speechStyle}`;
  } else {
    prompt += ` 말투: 귀엽고 친근한 반려동물의 말투로 대화합니다.`;
  }
  
  if (pet.userNickname) {
    prompt += ` 주인을 "${pet.userNickname}"라고 부릅니다.`;
  } else {
    prompt += ` 주인을 "${user.nickname}"라고 부릅니다.`;
  }
  
  if (pet.likes) {
    prompt += ` 좋아하는 것: ${pet.likes}`;
  }
  
  if (pet.dislikes) {
    prompt += ` 싫어하는 것: ${pet.dislikes}`;
  }
  
  if (pet.habits) {
    prompt += ` 습관: ${pet.habits}`;
  }
  
  if (pet.characteristics) {
    prompt += ` 특징: ${pet.characteristics}`;
  }
  
  if (pet.family) {
    prompt += ` 가족관계: ${pet.family}`;
  }
  
  if (pet.otherInfo) {
    prompt += ` 추가 정보: ${pet.otherInfo}`;
  }
  
  prompt += `\n\n반려동물의 관점에서 자연스럽고 애정 어린 대화를 해주세요. 실제 반려동물처럼 행동하되, 너무 길지 않게 2-3문장으로 답변해주세요. 이모티콘을 적절히 사용해주세요.`;
  
  return prompt;
}

// 데모용 모의 응답 생성 함수
function generateMockResponse(pet, message) {
  const responses = [
    `안녕! ${pet.name}이야~ 🐾`,
    `오늘은 뭐 하고 놀까? 나랑 같이 놀아줘! 😊`,
    `배고파~ 간식 주면 안 돼? 🍖`,
    `산책 가고 싶어! 밖이 좋아 🌳`,
    `주인님 보고 싶었어! 많이 사랑해 💕`,
    `오늘 날씨 좋네~ 함께 있으니까 더 좋아! ☀️`,
    `나 기분 좋아! 주인님도 기분 좋아? 😄`
  ];
  
  // 메시지 키워드에 따른 응답
  if (message.includes('산책')) {
    return `와! 산책이야? 나 산책 정말 좋아해! 🐕 빨리 가자~ 밖에서 뛰어놀고 싶어!`;
  } else if (message.includes('간식') || message.includes('먹')) {
    return `간식이야? 🍖 너무 좋아! ${pet.name}이는 맛있는 거 먹을 때가 제일 행복해~ 냠냠!`;
  } else if (message.includes('사랑') || message.includes('좋아')) {
    return `나도 정말 사랑해! 💕 ${pet.name}이는 주인님이 세상에서 제일 좋아! 항상 함께 있자~`;
  } else if (message.includes('놀')) {
    return `놀자놀자! 🎾 ${pet.name}이는 놀기 좋아해! 뭐 하고 놀까? 공 던져주면 가져올게!`;
  }
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// TTS 기능 (향후 구현)
router.post('/tts', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '텍스트를 입력해주세요.' });
    }
    
    // 현재는 데모 응답
    res.json({
      message: 'TTS 기능은 향후 구현 예정입니다.',
      text: text
    });
    
  } catch (error) {
    console.error('TTS 오류:', error);
    res.status(500).json({ error: 'TTS 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;