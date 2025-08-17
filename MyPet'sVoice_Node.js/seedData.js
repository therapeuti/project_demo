const bcrypt = require('bcryptjs');
const { User, Pet, Diary, CommunityPost } = require('./models');

const seedData = async () => {
    try {
        console.log('시드 데이터 생성 중...');

        // 데모 사용자 생성
        const hashedPassword = await bcrypt.hash('demo1234', 12);
        
        const demoUser = await User.create({
            email: 'demo@mypetsvoice.com',
            username: 'demouser',
            password: hashedPassword,
            name: '데모 사용자',
            nickname: '반려동물러버',
            isEmailVerified: true,
            socialProvider: 'local'
        });

        console.log('데모 사용자 생성 완료');

        // 데모 반려동물들 생성
        const demoPets = [
            {
                userId: demoUser.id,
                name: '멍멍이',
                species: '개',
                breed: '골든 리트리버',
                gender: 'male',
                isNeutered: true,
                speechStyle: '활발하고 친근한 말투로 대화해요!',
                userNickname: '주인님',
                personality: '활발하고 친근하며 장난기가 많음',
                likes: '산책, 공놀이, 간식',
                dislikes: '혼자 있는 것, 큰 소리',
                habits: '아침마다 주인을 깨우고, 꼬리를 흔들며 인사'
            },
            {
                userId: demoUser.id,
                name: '야옹이',
                species: '고양이',
                breed: '러시안 블루',
                gender: 'female',
                isNeutered: true,
                speechStyle: '우아하고 도도한 고양이 말투',
                userNickname: '집사',
                personality: '독립적이고 우아하며 약간 도도함',
                likes: '햇볕 쬐기, 높은 곳, 털실',
                dislikes: '물, 시끄러운 소리, 강제 스킨십',
                habits: '창가에서 햇볕 쬐기, 밤에 활동적'
            }
        ];

        for (let petData of demoPets) {
            await Pet.create(petData);
        }

        console.log('데모 반려동물 생성 완료');

        // 데모 일기 생성
        const sampleDiaries = [
            {
                userId: demoUser.id,
                petId: 1,
                title: '오늘 산책이 너무 즐거웠어!',
                date: '2025-01-10',
                weather: '맑음',
                temperature: '15°C',
                userContent: '오늘 한강공원에서 산책했는데 멍멍이가 너무 좋아했어요. 다른 강아지들과도 놀고...',
                aiContent: `안녕! 멍멍이야~ 🐕\n\n오늘 한강공원 산책이 정말 최고였어! 주인님과 함께 넓은 잔디밭을 뛰어다니는 게 너무 행복했어. \n\n새로운 친구들도 많이 만났어! 특히 같은 골든 리트리버 친구랑 공놀이를 했는데, 정말 신났어~ 🎾\n\n주인님이 나를 위해 시간을 내주셔서 고마워! 내일은 또 어떤 재미있는 일이 있을까? 💕\n\n- 멍멍이 올림 -`,
                isPublic: true,
                likesCount: 15
            },
            {
                userId: demoUser.id,
                petId: 2,
                title: '새 장난감이 왔어!',
                date: '2025-01-09',
                weather: '흐림',
                temperature: '12°C',
                userContent: '야옹이를 위해 새로운 깃털 장난감을 샀는데 정말 좋아하네요.',
                aiContent: `냥~ 야옹이야 🐱\n\n오늘 집사가 나를 위해 새로운 선물을 사왔어! 깃털이 달린 막대기인데, 이걸 보니까 야생의 본능이 깨어나는 것 같아.\n\n처음에는 도도한 척 관심 없는 듯했지만... 사실 너무 신났어! 깃털이 흔들릴 때마다 나도 모르게 발톱이 나오더라구 😸\n\n집사도 나랑 놀아주려고 정말 열심히 흔들어줘서 고마웠어. 비록 도도한 고양이지만, 가끔은 이런 놀이도 나쁘지 않아~\n\n- 우아한 야옹이 -`,
                isPublic: true,
                likesCount: 22
            }
        ];

        for (let diaryData of sampleDiaries) {
            await Diary.create(diaryData);
        }

        console.log('데모 일기 생성 완료');

        // 데모 커뮤니티 게시글 생성
        const samplePosts = [
            {
                userId: demoUser.id,
                title: '강아지 털갈이 시기 관리법 공유해요!',
                content: '봄철이 되면서 멍멍이 털갈이가 시작됐어요. 매일 브러싱해주고 있는데, 다른 분들은 어떻게 관리하시나요? 좋은 팁 있으면 공유해주세요~',
                tags: '꿀팁,털갈이,관리법',
                likesCount: 28,
                commentsCount: 12,
                viewsCount: 156
            },
            {
                userId: demoUser.id,
                title: '고양이가 밤에 너무 활발해요 ㅠㅠ',
                content: '야옹이가 밤만 되면 집안을 뛰어다니면서 난리를 피워요. 낮에는 잠만 자고... 이런 행동이 정상인가요?',
                tags: '질문,행동,수면',
                likesCount: 15,
                commentsCount: 8,
                viewsCount: 89
            }
        ];

        for (let postData of samplePosts) {
            await CommunityPost.create(postData);
        }

        console.log('데모 커뮤니티 게시글 생성 완료');

        console.log('\n=== 시드 데이터 생성 완료! ===');
        console.log('데모 계정 정보:');
        console.log('이메일: demo@mypetsvoice.com');
        console.log('아이디: demouser');
        console.log('비밀번호: demo1234');
        console.log('==============================');

    } catch (error) {
        console.error('시드 데이터 생성 오류:', error);
    }
};

module.exports = seedData;

// 직접 실행될 때
if (require.main === module) {
    const db = require('./config/database');
    require('./models');
    
    db.sync({ force: true })
        .then(() => {
            console.log('데이터베이스 초기화 완료');
            return seedData();
        })
        .then(() => {
            console.log('시드 데이터 생성 완료');
            process.exit(0);
        })
        .catch(err => {
            console.error('오류:', err);
            process.exit(1);
        });
}