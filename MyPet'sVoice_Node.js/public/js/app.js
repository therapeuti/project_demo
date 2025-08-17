// 전역 변수
let currentUser = null;
let currentPets = [];
let currentChatPet = null;
let chatMessages = [];

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

// 추가적인 디버깅을 위한 글로벌 함수
window.testLogin = function() {
    console.log('테스트 로그인 함수 호출됨');
    const event = { preventDefault: () => console.log('preventDefault 호출됨') };
    handleLogin(event);
};

// 앱 초기화
function initializeApp() {
    hideLoading();
    showSection('home');
    loadPopularContent();
    loadCommunityPosts();
    loadPopularTags();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    console.log('이벤트 리스너 설정 시작');
    
    // 로그인 폼
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('로그인 폼 이벤트 리스너 추가 완료');
    } else {
        console.error('로그인 폼을 찾을 수 없습니다');
    }
    
    // 회원가입 폼
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('회원가입 폼 이벤트 리스너 추가 완료');
    }
    
    // 프로필 폼
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
        console.log('프로필 폼 이벤트 리스너 추가 완료');
    }
    
    // 콘텐츠 탭
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchContentTab(tabName);
        });
    });
    
    // URL 파라미터 확인 (소셜 로그인 콜백)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
        const token = urlParams.get('token');
        localStorage.setItem('token', token);
        window.location.replace('/');
    }
    
    if (urlParams.get('verified') === 'true') {
        showAlert('success', '이메일 인증 완료', '이메일 인증이 완료되었습니다. 로그인해주세요.');
    }
}

// 로딩 표시/숨김
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

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
    
    const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // 섹션별 데이터 로드
    switch(sectionName) {
        case 'chat':
            loadPetsForChat();
            break;
        case 'diary':
            loadDiaries();
            break;
        case 'mypage':
            loadMypage();
            break;
    }
}

// 인증 상태 확인
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        showGuestUI();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showUserUI();
            await loadUserPets();
        } else {
            localStorage.removeItem('token');
            showGuestUI();
        }
    } catch (error) {
        console.error('인증 확인 오류:', error);
        showGuestUI();
    }
}

// 게스트 UI 표시
function showGuestUI() {
    document.getElementById('nav-auth').style.display = 'flex';
    document.getElementById('nav-user').style.display = 'none';
    document.getElementById('nav-chat').style.display = 'none';
    document.getElementById('nav-diary').style.display = 'none';
    document.getElementById('nav-mypage').style.display = 'none';
}

// 로그인 사용자 UI 표시
function showUserUI() {
    document.getElementById('nav-auth').style.display = 'none';
    document.getElementById('nav-user').style.display = 'block';
    document.getElementById('nav-chat').style.display = 'inline';
    document.getElementById('nav-diary').style.display = 'inline';
    document.getElementById('nav-mypage').style.display = 'inline';
    
    // 사용자 정보 표시
    document.getElementById('user-nickname').textContent = currentUser.nickname;
    if (currentUser.profileImage) {
        document.getElementById('user-avatar').src = currentUser.profileImage;
    }
}

// 사용자 메뉴 토글
function toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.toggle('active');
}

// 모바일 메뉴 토글
function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

// 모달 표시
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// 모달 닫기
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 알림 표시
function showAlert(type, title, message) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    document.getElementById('alert-icon').textContent = icons[type] || icons.info;
    document.getElementById('alert-icon').className = `alert-icon ${type}`;
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    showModal('alert-modal');
}

// 로그인 모달 표시
function showLoginModal() {
    showModal('login-modal');
}

// 회원가입 모달 표시
function showRegisterModal() {
    showModal('register-modal');
}

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    console.log('로그인 시도 시작');
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    console.log('입력값:', { username, password: password ? '***' : '없음' });
    
    if (!username || !password) {
        console.log('유효성 검사 실패');
        showAlert('error', '오류', '아이디와 비밀번호를 입력해주세요.');
        return;
    }
    
    console.log('API 호출 시작');
    showLoading();
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('API 응답 상태:', response.status);
        const data = await response.json();
        console.log('API 응답 데이터:', data);
        
        if (response.ok) {
            console.log('로그인 성공, 토큰 저장');
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            document.getElementById('login-form').reset();
            closeModal('login-modal');
            showUserUI();
            await loadUserPets();
            showAlert('success', '로그인 성공', '환영합니다!');
        } else {
            console.log('로그인 실패:', data.error);
            showAlert('error', '로그인 실패', data.error);
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        showAlert('error', '오류', '로그인 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 회원가입 처리
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('register-name').value,
        nickname: document.getElementById('register-nickname').value,
        email: document.getElementById('register-email').value,
        username: document.getElementById('register-username').value,
        password: document.getElementById('register-password').value,
        confirmPassword: document.getElementById('register-confirm-password').value
    };
    
    // 유효성 검사
    if (Object.values(formData).some(value => !value.trim())) {
        showAlert('error', '오류', '모든 필드를 입력해주세요.');
        return;
    }
    
    if (formData.password !== formData.confirmPassword) {
        showAlert('error', '오류', '비밀번호가 일치하지 않습니다.');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('register-modal');
            showAlert('success', '회원가입 완료', '이메일을 확인하여 인증을 완료해주세요.');
            document.getElementById('register-form').reset();
        } else {
            showAlert('error', '회원가입 실패', data.error);
        }
    } catch (error) {
        console.error('회원가입 오류:', error);
        showAlert('error', '오류', '회원가입 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 아이디 중복 확인
async function checkUsername() {
    const username = document.getElementById('register-username').value;
    
    if (!username) {
        showAlert('error', '오류', '아이디를 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/check-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        const feedback = document.getElementById('username-feedback');
        
        if (data.available) {
            feedback.textContent = data.message;
            feedback.className = 'form-feedback success';
        } else {
            feedback.textContent = data.message;
            feedback.className = 'form-feedback error';
        }
    } catch (error) {
        console.error('아이디 중복 확인 오류:', error);
        showAlert('error', '오류', '아이디 중복 확인 중 오류가 발생했습니다.');
    }
}

// 로그아웃
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    } catch (error) {
        console.error('로그아웃 오류:', error);
    } finally {
        localStorage.removeItem('token');
        currentUser = null;
        currentPets = [];
        showGuestUI();
        showSection('home');
        showAlert('info', '로그아웃', '로그아웃되었습니다.');
    }
}

// 사용자 반려동물 로드
async function loadUserPets() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/pet', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentPets = data.pets;
        }
    } catch (error) {
        console.error('반려동물 목록 로드 오류:', error);
    }
}

// 채팅용 반려동물 로드
function loadPetsForChat() {
    const select = document.getElementById('chat-pet-select');
    select.innerHTML = '<option value="">대화할 반려동물을 선택하세요</option>';
    
    currentPets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = `${pet.name} (${pet.species})`;
        select.appendChild(option);
    });
}

// 채팅 반려동물 선택
function selectChatPet() {
    const select = document.getElementById('chat-pet-select');
    const petId = select.value;
    
    if (petId) {
        currentChatPet = currentPets.find(pet => pet.id == petId);
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send-btn').disabled = false;
        
        // 환영 메시지 표시
        showWelcomeMessage();
    } else {
        currentChatPet = null;
        document.getElementById('chat-input').disabled = true;
        document.getElementById('chat-send-btn').disabled = true;
        clearChatMessages();
    }
}

// 환영 메시지 표시
function showWelcomeMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message pet';
    welcomeDiv.innerHTML = `
        <div class="message-avatar">${getPetEmoji(currentChatPet.species)}</div>
        <div class="message-bubble">
            안녕! 나는 ${currentChatPet.name}이야! 🐾<br>
            오늘은 뭐 하고 놀까? 나랑 대화해봐!
        </div>
    `;
    
    messagesContainer.appendChild(welcomeDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 채팅 메시지 전송
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !currentChatPet) return;
    
    // 사용자 메시지 표시
    addChatMessage('user', message);
    input.value = '';
    
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                petId: currentChatPet.id,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // AI 응답 표시
            setTimeout(() => {
                addChatMessage('pet', data.response);
            }, 1000);
        } else {
            addChatMessage('pet', '미안해... 지금은 대화하기 힘들어 😢');
        }
    } catch (error) {
        console.error('채팅 오류:', error);
        addChatMessage('pet', '오류가 발생했어... 잠시 후 다시 시도해줘!');
    }
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
            <div class="message-avatar">${getPetEmoji(currentChatPet.species)}</div>
            <div class="message-bubble">${message}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 채팅 메시지 초기화
function clearChatMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="pet-avatar">🐾</div>
            <p>반려동물을 선택하고 대화를 시작해보세요!</p>
        </div>
    `;
}

// 채팅 키보드 이벤트
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 반려동물 이모지 반환
function getPetEmoji(species) {
    const emojis = {
        '개': '🐕',
        '고양이': '🐱',
        '새': '🐦',
        '물고기': '🐠',
        '햄스터': '🐹',
        '토끼': '🐰'
    };
    return emojis[species] || '🐾';
}

// 인기 콘텐츠 로드
async function loadPopularContent() {
    // 데모 데이터
    const popularContent = document.getElementById('popular-content');
    popularContent.innerHTML = `
        <div class="diary-card">
            <div class="diary-image">🐕</div>
            <div class="diary-content">
                <div class="diary-title">오늘 산책이 너무 즐거웠어!</div>
                <div class="diary-preview">주인과 함께한 공원 산책이 정말 행복했어. 새로운 친구들도 만나고...</div>
                <div class="diary-footer">
                    <div class="diary-pet">
                        <div class="diary-pet-avatar">🐕</div>
                        <span>멍멍이</span>
                    </div>
                    <div class="diary-stats">
                        <span>❤️ 15</span>
                        <span>👀 32</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="diary-card">
            <div class="diary-image">🐱</div>
            <div class="diary-content">
                <div class="diary-title">새 장난감이 왔어!</div>
                <div class="diary-preview">오늘 주인이 새로운 장난감을 사줬어! 깃털이 달린 막대기인데...</div>
                <div class="diary-footer">
                    <div class="diary-pet">
                        <div class="diary-pet-avatar">🐱</div>
                        <span>야옹이</span>
                    </div>
                    <div class="diary-stats">
                        <span>❤️ 22</span>
                        <span>👀 45</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 콘텐츠 탭 전환
function switchContentTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 탭별 콘텐츠 로드
    if (tabName === 'popular-diaries') {
        loadPopularContent();
    } else if (tabName === 'popular-posts') {
        loadPopularPosts();
    }
}

// 인기 게시글 로드
function loadPopularPosts() {
    const popularContent = document.getElementById('popular-content');
    popularContent.innerHTML = `
        <div class="post-item">
            <div class="post-header">
                <div class="post-user">
                    <div class="post-user-avatar"></div>
                    <div class="post-user-info">
                        <h4>반려동물러버</h4>
                        <p>2시간 전</p>
                    </div>
                </div>
                <div class="post-tags">
                    <span class="post-tag">꿀팁</span>
                </div>
            </div>
            <div class="post-title">강아지 털갈이 시기 관리법</div>
            <div class="post-content">
                봄철 강아지 털갈이 시기에 도움되는 관리법들을 공유합니다. 매일 브러싱하고...
            </div>
            <div class="post-stats">
                <span>❤️ 28</span>
                <span>💬 12</span>
                <span>👀 156</span>
            </div>
        </div>
    `;
}

// 커뮤니티 게시글 로드
async function loadCommunityPosts() {
    const postsContainer = document.getElementById('community-posts');
    
    // 데모 데이터
    postsContainer.innerHTML = `
        <div class="post-item">
            <div class="post-header">
                <div class="post-user">
                    <div class="post-user-avatar"></div>
                    <div class="post-user-info">
                        <h4>멍멍맘</h4>
                        <p>1시간 전</p>
                    </div>
                </div>
                <div class="post-tags">
                    <span class="post-tag">산책해요</span>
                </div>
            </div>
            <div class="post-title">한강공원에서 같이 산책하실 분!</div>
            <div class="post-content">
                이번 주말 한강공원에서 강아지들과 함께 산책하실 분 모집해요~
            </div>
            <div class="post-stats">
                <span>❤️ 5</span>
                <span>💬 8</span>
                <span>👀 42</span>
            </div>
        </div>
        <div class="post-item">
            <div class="post-header">
                <div class="post-user">
                    <div class="post-user-avatar"></div>
                    <div class="post-user-info">
                        <h4>고양이집사</h4>
                        <p>3시간 전</p>
                    </div>
                </div>
                <div class="post-tags">
                    <span class="post-tag">질문</span>
                </div>
            </div>
            <div class="post-title">고양이가 밥을 안 먹어요 ㅠㅠ</div>
            <div class="post-content">
                평소에 잘 먹던 사료를 갑자기 안 먹네요. 어떻게 해야 할까요?
            </div>
            <div class="post-stats">
                <span>❤️ 3</span>
                <span>💬 15</span>
                <span>👀 67</span>
            </div>
        </div>
    `;
}

// 인기 태그 로드
function loadPopularTags() {
    const tagsContainer = document.getElementById('popular-tags');
    const tags = ['산책해요', '꿀팁', '질문', '자랑', '일상', '건강', '훈련', '놀이'];
    
    tagsContainer.innerHTML = tags.map(tag => 
        `<button class="tag-btn" onclick="filterByTag('${tag}')">${tag}</button>`
    ).join('');
}

// 태그로 필터링
function filterByTag(tag) {
    console.log('태그 필터:', tag);
    // 실제로는 서버에서 해당 태그의 게시글을 가져옵니다
}

// 커뮤니티 검색
function searchCommunity() {
    const keyword = document.getElementById('community-search').value;
    console.log('검색 키워드:', keyword);
    // 실제로는 서버에서 검색 결과를 가져옵니다
}

// 커뮤니티 정렬
function sortCommunity() {
    const sortBy = document.getElementById('community-sort').value;
    console.log('정렬 기준:', sortBy);
    // 실제로는 선택된 기준으로 정렬된 게시글을 가져옵니다
}

// 일기 로드
function loadDiaries() {
    console.log('일기 로드');
    // 실제로는 서버에서 일기 목록을 가져옵니다
}

// 일기 필터링
function filterDiaries() {
    const petId = document.getElementById('diary-pet-filter').value;
    console.log('반려동물 필터:', petId);
}

// 일기 보기 모드 전환
function toggleDiaryView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    console.log('일기 보기 모드:', view);
}

// 마이페이지 로드
function loadMypage() {
    if (!currentUser) return;
    
    // 프로필 정보 표시
    document.getElementById('profile-image').src = currentUser.profileImage || '/images/default-avatar.png';
    document.getElementById('profile-nickname').textContent = currentUser.nickname;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-nickname-input').value = currentUser.nickname;
    
    // 계정 설정 정보
    document.getElementById('settings-email').textContent = currentUser.email;
    document.getElementById('settings-provider').textContent = 
        currentUser.socialProvider === 'local' ? '일반 회원가입' : currentUser.socialProvider.toUpperCase();
    
    loadMyPets();
}

// 마이페이지 탭 전환
function showMypageTab(tabName) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// 내 반려동물 로드
function loadMyPets() {
    const petsGrid = document.getElementById('pets-grid');
    
    if (currentPets.length === 0) {
        petsGrid.innerHTML = `
            <div style="text-align: center; color: #666; grid-column: 1/-1;">
                <p>등록된 반려동물이 없습니다.</p>
                <button class="btn btn-primary" onclick="showPetAddModal()">첫 반려동물 등록하기</button>
            </div>
        `;
        return;
    }
    
    petsGrid.innerHTML = currentPets.map(pet => `
        <div class="pet-card-mypage">
            <img src="${pet.profileImage || '/images/default-pet.png'}" alt="${pet.name}">
            <h4>${pet.name}</h4>
            <p>${pet.species}${pet.breed ? ` • ${pet.breed}` : ''}</p>
            <div class="pet-actions">
                <button class="pet-edit" onclick="editPet(${pet.id})">수정</button>
                <button class="pet-delete" onclick="deletePet(${pet.id})">삭제</button>
            </div>
        </div>
    `).join('');
}

// 프로필 업데이트
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const nickname = document.getElementById('profile-nickname-input').value.trim();
    
    if (!nickname) {
        showAlert('error', '오류', '닉네임을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ nickname })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.nickname = data.user.nickname;
            document.getElementById('user-nickname').textContent = data.user.nickname;
            document.getElementById('profile-nickname').textContent = data.user.nickname;
            showAlert('success', '성공', '프로필이 수정되었습니다.');
        } else {
            showAlert('error', '오류', data.error);
        }
    } catch (error) {
        console.error('프로필 수정 오류:', error);
        showAlert('error', '오류', '프로필 수정 중 오류가 발생했습니다.');
    }
}

// 프로필 이미지 업로드
function uploadProfileImage() {
    document.getElementById('profile-image-input').click();
}

function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('profileImage', file);
    
    fetch('/api/user/profile/image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.profileImage) {
            document.getElementById('profile-image').src = data.profileImage;
            document.getElementById('user-avatar').src = data.profileImage;
            showAlert('success', '성공', '프로필 이미지가 변경되었습니다.');
        }
    })
    .catch(error => {
        console.error('프로필 이미지 업로드 오류:', error);
        showAlert('error', '오류', '이미지 업로드 중 오류가 발생했습니다.');
    });
}

// 반려동물 추가 모달 (향후 구현)
function showPetAddModal() {
    showAlert('info', '준비 중', '반려동물 추가 기능을 준비 중입니다.');
}

function showDiaryWriteModal() {
    showAlert('info', '준비 중', '일기 작성 기능을 준비 중입니다.');
}

function showPostWriteModal() {
    showAlert('info', '준비 중', '게시글 작성 기능을 준비 중입니다.');
}

function editPet(petId) {
    showAlert('info', '준비 중', '반려동물 수정 기능을 준비 중입니다.');
}

function deletePet(petId) {
    showAlert('info', '준비 중', '반려동물 삭제 기능을 준비 중입니다.');
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
});