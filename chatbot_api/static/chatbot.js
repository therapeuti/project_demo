// chatbot_api.js - 실제 Flask API와 연동하는 클라이언트

class ChatbotAPI {
    constructor() {
        this.baseURL = '/api';  // Flask 서버 API 기본 URL
        this.isLoggedIn = false;
        this.checkLoginStatus();
    }

    // 로그인 상태 확인
    async checkLoginStatus() {
        try {
            const response = await this.makeRequest('/pets', 'GET');
            this.isLoggedIn = true;
            return true;
        } catch (error) {
            if (error.status === 401) {
                this.isLoggedIn = false;
                // 개발용 자동 로그인
                await this.devLogin();
            }
            return false;
        }
    }

    // 개발용 임시 로그인
    async devLogin() {
        try {
            await this.makeRequest('/dev/login', 'POST', { user_id: 1 });
            this.isLoggedIn = true;
            console.log('개발용 로그인 완료');
        } catch (error) {
            console.error('개발용 로그인 실패:', error);
        }
    }

    // HTTP 요청 헬퍼
    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'  // 세션 쿠키 포함
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(this.baseURL + endpoint, config);
        
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            error.data = await response.json().catch(() => ({}));
            throw error;
        }

        return await response.json();
    }

    // 반려동물 목록 조회
    async getPets() {
        return await this.makeRequest('/pets');
    }

    // 반려동물 등록
    async addPet(petData) {
        return await this.makeRequest('/pets', 'POST', petData);
    }

    // 채팅 메시지 전송
    async sendMessage(message, petId, persona = null, conversationHistory = []) {
        return await this.makeRequest('/chat/send', 'POST', {
            message: message,
            pet_id: petId,
            persona: persona,
            conversation_history: conversationHistory
        });
    }

    // 대화 기록 조회
    async getChatHistory(petId) {
        return await this.makeRequest(`/chat/history/${petId}`);
    }

    // 채팅 세션 목록 조회
    async getChatSessions() {
        return await this.makeRequest('/chat/sessions');
    }

    // 대화 저장
    async saveConversation(petId, messages) {
        return await this.makeRequest('/chat/save', 'POST', {
            pet_id: petId,
            messages: messages
        });
    }
}

// 개선된 PetChatbot 클래스 (실제 API 연동)
class PetChatbotReal {
    constructor() {
        this.api = new ChatbotAPI();
        this.initElements();
        this.initEventListeners();
        this.currentPetId = null;
        this.currentConversation = [];
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.dragTarget = null;
        
        // API 준비 완료 후 초기화
        this.init();
    }

    async init() {
        await this.api.checkLoginStatus();
        await this.loadPets();
    }

    initElements() {
        this.trigger = document.getElementById('chatbotTrigger');
        this.window = document.getElementById('chatbotWindow');
        this.header = document.getElementById('chatbotHeader');
        this.title = document.getElementById('chatbotTitle');
        this.closeBtn = document.getElementById('closeBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.petSelect = document.getElementById('petSelect');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.historyModal = document.getElementById('historyModal');
        this.historyList = document.getElementById('historyList');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    }

    initEventListeners() {
        // 챗봇 트리거 버튼
        this.trigger.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.toggleChatbot();
            }
        });
        
        // 드래그 이벤트 (트리거 버튼)
        this.trigger.addEventListener('mousedown', (e) => this.startDrag(e, this.trigger));
        
        // 드래그 이벤트 (챗봇 헤더)
        this.header.addEventListener('mousedown', (e) => this.startDrag(e, this.window));
        
        // 글로벌 드래그 이벤트
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // 터치 이벤트 (모바일 지원)
        this.trigger.addEventListener('touchstart', (e) => this.startDrag(e, this.trigger));
        this.header.addEventListener('touchstart', (e) => this.startDrag(e, this.window));
        document.addEventListener('touchmove', (e) => this.onDrag(e));
        document.addEventListener('touchend', () => this.stopDrag());
        
        // 챗봇 컨트롤
        this.closeBtn.addEventListener('click', () => this.closeChatbot());
        this.historyBtn.addEventListener('click', () => this.showHistory());
        this.closeHistoryBtn.addEventListener('click', () => this.hideHistory());
        
        // 반려동물 선택
        this.petSelect.addEventListener('change', () => this.onPetChange());
        
        // 메시지 전송
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 입력 필드 활성화
        this.chatInput.addEventListener('input', () => {
            this.sendBtn.disabled = !this.chatInput.value.trim() || !this.currentPetId;
        });
    }

    // 드래그 관련 메서드
    startDrag(e, element) {
        // 컨트롤 버튼 클릭 시 드래그 방지
        if (e.target.closest('.control-btn') || e.target.closest('.pet-select')) return;
        
        this.isDragging = true;
        this.dragTarget = element;
        
        // 터치 이벤트와 마우스 이벤트 모두 지원
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const rect = element.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        element.classList.add('dragging');
        e.preventDefault();
    }

    onDrag(e) {
        if (!this.isDragging || !this.dragTarget) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = clientX - this.dragOffset.x;
        const y = clientY - this.dragOffset.y;
        
        // 화면 경계 확인
        const maxX = window.innerWidth - this.dragTarget.offsetWidth;
        const maxY = window.innerHeight - this.dragTarget.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(maxX, x));
        const boundedY = Math.max(0, Math.min(maxY, y));
        
        this.dragTarget.style.left = boundedX + 'px';
        this.dragTarget.style.top = boundedY + 'px';
        this.dragTarget.style.right = 'auto';
        this.dragTarget.style.bottom = 'auto';
        
        e.preventDefault();
    }

    stopDrag() {
        if (this.isDragging && this.dragTarget) {
            this.dragTarget.classList.remove('dragging');
            this.isDragging = false;
            this.dragTarget = null;
        }
    }

    // 챗봇 표시/숨김
    toggleChatbot() {
        this.window.classList.toggle('active');
        if (this.window.classList.contains('active')) {
            this.chatInput.focus();
        }
    }

    closeChatbot() {
        this.window.classList.remove('active');
    }

    // 반려동물 로드
    async loadPets() {
        try {
            const response = await this.api.getPets();
            const pets = response.pets || [];
            
            this.petSelect.innerHTML = '<option value="">반려동물을 선택하세요</option>';
            
            if (pets.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '등록된 반려동물이 없습니다';
                option.disabled = true;
                this.petSelect.appendChild(option);
                return;
            }
            
            pets.forEach(pet => {
                const option = document.createElement('option');
                option.value = pet.id;
                option.textContent = `${pet.name} (${pet.species})`;
                option.dataset.persona = JSON.stringify(pet.persona);
                this.petSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('반려동물 정보 로드 실패:', error);
            this.showError('반려동물 정보를 불러오지 못했습니다.');
        }
    }

    // 반려동물 변경 시
    async onPetChange() {
        const selectedOption = this.petSelect.selectedOptions[0];
        if (selectedOption && selectedOption.value) {
            this.currentPetId = parseInt(selectedOption.value);
            const petName = selectedOption.textContent.split(' (')[0];
            this.title.textContent = `${petName}와 대화하기`;
            
            this.chatInput.disabled = false;
            this.chatInput.placeholder = `${petName}에게 메시지를 보내세요...`;
            
            await this.loadConversation(this.currentPetId);
        } else {
            this.currentPetId = null;
            this.title.textContent = '반려동물과 대화하기';
            this.chatInput.disabled = true;
            this.chatInput.placeholder = '반려동물을 먼저 선택해주세요';
            this.sendBtn.disabled = true;
            this.renderWelcomeMessage();
        }
    }

    // 대화 내용 로드
    async loadConversation(petId) {
        try {
            const response = await this.api.getChatHistory(petId);
            this.currentConversation = response.messages || [];
            this.renderMessages();
        } catch (error) {
            console.error('대화 기록 로드 실패:', error);
            this.currentConversation = [];
            this.renderMessages();
        }
    }

    // 메시지 렌더링
    renderMessages() {
        this.chatMessages.innerHTML = '';
        
        if (this.currentConversation.length === 0) {
            this.renderWelcomeMessage();
        } else {
            this.currentConversation.forEach(msg => {
                this.addMessageToChat(msg.content, msg.sender, new Date(msg.timestamp), false);
            });
        }
        
        this.scrollToBottom();
    }

    renderWelcomeMessage() {
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'message bot';
        
        if (this.currentPetId) {
            const petName = this.petSelect.selectedOptions[0]?.textContent.split(' (')[0] || '반려동물';
            welcomeMsg.innerHTML = `
                <div>안녕! 나는 ${petName}이야! 나와 대화해보자! 🐾</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            `;
        } else {
            welcomeMsg.innerHTML = `
                <div>안녕하세요! 반려동물을 선택하고 대화를 시작해보세요 🐾</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            `;
        }
        
        this.chatMessages.appendChild(welcomeMsg);
    }

    // 메시지 전송
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || !this.currentPetId) return;

        // 사용자 메시지 추가
        this.addMessageToChat(message, 'user', new Date());
        this.chatInput.value = '';
        this.sendBtn.disabled = true;

        // 타이핑 인디케이터 표시
        this.showTypingIndicator();

        try {
            // 선택된 반려동물 페르소나 정보
            const selectedOption = this.petSelect.selectedOptions[0];
            const persona = JSON.parse(selectedOption.dataset.persona || '{}');
            
            // AI 응답 요청
            const response = await this.api.sendMessage(
                message, 
                this.currentPetId, 
                persona, 
                this.currentConversation.slice(-10) // 최근 10개 메시지만
            );
            
            // 타이핑 인디케이터 숨김
            this.hideTypingIndicator();
            
            // AI 응답 추가
            this.addMessageToChat(response.content, 'bot', new Date());
            
            // 대화 내용 업데이트
            this.currentConversation.push({
                content: message,
                sender: 'user',
                timestamp: new Date().toISOString()
            });
            this.currentConversation.push({
                content: response.content,
                sender: 'bot',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('AI 응답 오류:', error);
            
            let errorMessage = '죄송해요, 지금은 대답할 수 없어요. 잠시 후 다시 시도해주세요.';
            if (error.status === 401) {
                errorMessage = '로그인이 필요합니다.';
            } else if (error.status === 404) {
                errorMessage = '반려동물 정보를 찾을 수 없습니다.';
            }
            
            this.addMessageToChat(errorMessage, 'bot', new Date());
        }
    }

    // 메시지를 채팅창에 추가
    addMessageToChat(content, sender, timestamp, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `
            <div>${this.formatMessageContent(content)}</div>
            <div class="message-time">${this.formatTime(timestamp)}</div>
        `;
        
        // 타이핑 인디케이터 앞에 삽입
        this.chatMessages.insertBefore(messageDiv, this.typingIndicator);
        
        this.scrollToBottom();
    }

    // 메시지 내용 포맷팅 (이모지, 링크 등 처리)
    formatMessageContent(content) {
        // HTML 이스케이프
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // 줄바꿈 처리
        return escaped.replace(/\n/g, '<br>');
    }

    // 타이핑 인디케이터
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    // 대화 기록 표시
    async showHistory() {
        try {
            const response = await this.api.getChatSessions();
            const sessions = response.sessions || [];
            
            this.historyList.innerHTML = '';
            
            if (sessions.length === 0) {
                this.historyList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">대화 기록이 없습니다.</div>';
            } else {
                sessions.forEach(session => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <div class="history-date">${this.formatDate(new Date(session.last_message_time))}</div>
                        <div class="history-preview"><strong>${session.pet_name}</strong>: ${session.last_message.slice(0, 50)}${session.last_message.length > 50 ? '...' : ''}</div>
                    `;
                    item.addEventListener('click', () => this.loadHistorySession(session));
                    this.historyList.appendChild(item);
                });
            }
            
            this.historyModal.classList.add('active');
        } catch (error) {
            console.error('대화 기록 로드 실패:', error);
            this.showError('대화 기록을 불러오지 못했습니다.');
        }
    }

    hideHistory() {
        this.historyModal.classList.remove('active');
    }

    // 히스토리 세션 로드
    async loadHistorySession(session) {
        this.petSelect.value = session.pet_id;
        await this.onPetChange();
        this.hideHistory();
        this.toggleChatbot(); // 챗봇 창 열기
    }

    // 에러 메시지 표시
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot';
        errorDiv.style.color = '#dc3545';
        errorDiv.innerHTML = `
            <div>⚠️ ${message}</div>
            <div class="message-time">${this.formatTime(new Date())}</div>
        `;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    // 유틸리티 메서드
    formatTime(date) {
        return date.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatDate(date) {
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '오늘';
        } else if (diffDays === 1) {
            return '어제';
        } else if (diffDays < 7) {
            return `${diffDays}일 전`;
        } else {
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// DOM 로드 후 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    new PetChatbotReal();
});