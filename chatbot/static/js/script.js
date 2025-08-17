// 현재 선택된 반려동물
let currentChatPet = null;

// 섹션 전환
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionName).classList.add('active');
    
    // 네비게이션 링크 활성화
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    event.target.classList.add('active');
}

// 사용자 메뉴 토글
function toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.toggle('active');
}

// 채팅 반려동물 선택
function selectChatPet() {
    const select = document.getElementById('chat-pet-select');
    const petId = select.value;
    const messagesContainer = document.getElementById('chat-messages');
    
    if (petId === '1') {
        currentChatPet = { id: 1, name: '멍멍이', species: '개', emoji: '🐕' };
        messagesContainer.innerHTML = `
            <div class="message pet">
                <div class="message-avatar">🐕</div>
                <div class="message-bubble">
                    안녕! 나는 멍멍이야! 🐾<br>
                    오늘은 뭐 하고 놀까? 나랑 대화해봐!
                </div>
            </div>
        `;
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send-btn').disabled = false;
    } else if (petId === '2') {
        currentChatPet = { id: 2, name: '야옹이', species: '고양이', emoji: '🐱' };
        messagesContainer.innerHTML = `
            <div class="message pet">
                <div class="message-avatar">🐱</div>
                <div class="message-bubble">
                    냥~ 나는 야옹이야 🐱<br>
                    무엇을 도와드릴까요, 집사님?
                </div>
            </div>
        `;
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send-btn').disabled = false;
    } else {
        currentChatPet = null;
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">🐾</div>
                <p>반려동물을 선택하고 대화를 시작해보세요!</p>
            </div>
        `;
        document.getElementById('chat-input').disabled = true;
        document.getElementById('chat-send-btn').disabled = true;
    }
}

// 채팅 메시지 전송
function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !currentChatPet) return;
    
    // 사용자 메시지 추가
    addChatMessage('user', message);
    input.value = '';
    
    // AI 응답 시뮬레이션
    setTimeout(() => {
        let response = '';
        if (currentChatPet.id === 1) {
            const responses = [
                '와! 그거 정말 재미있겠다! 🐕',
                '나도 그거 좋아해! 같이 하자!',
                '주인님 최고야! 항상 고마워 💕',
                '오늘도 산책 갈까? 너무 기대돼!',
                '그런 일이 있었구나! 정말 신기해!'
            ];
            response = responses[Math.floor(Math.random() * responses.length)];
        } else if (currentChatPet.id === 2) {
            const responses = [
                '흠... 그럴 수도 있겠네요 🐱',
                '집사님, 그보다 간식은 언제 주실 건가요?',
                '도도한 척하지만 사실 관심 있어요 😸',
                '냥~ 오늘은 햇볕이 좋네요',
                '그런 건 별로 중요하지 않아요... 츤데레'
            ];
            response = responses[Math.floor(Math.random() * responses.length)];
        }
        addChatMessage('pet', response);
    }, 1000);
}

// 채팅 메시지 추가
function addChatMessage(sender, message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="message-bubble">${message}</div>
            <div class="message-avatar">👤</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">${currentChatPet.emoji}</div>
            <div class="message-bubble">${message}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 채팅 키보드 이벤트
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 일기 보기 모드 전환
function toggleDiaryView(button, view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    console.log('일기 보기 모드:', view);
}

// 마이페이지 탭 전환
function showMypageTab(button, tabName) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    button.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// 프로필 업데이트
function handleProfileUpdate(event) {
    event.preventDefault();
    alert('프로필이 수정되었습니다! (데모)');
}

// 페이지 외부 클릭 시 사용자 메뉴 닫기
window.addEventListener('click', function(event) {
    const userMenu = document.getElementById('user-menu');
    const userProfile = document.querySelector('.user-profile');
    
    if (!userProfile.contains(event.target)) {
        userMenu.classList.remove('active');
    }
});