/* ================================== */
/*         完整的 script.js 文件        */
/* ================================== */

document.addEventListener('DOMContentLoaded', function() {
    // 全局变量，用于追踪轮次和对话历史
    let roundCounter = 1;
    let conversationLog = [];

    // --- 模板引用 ---
    const roundTemplate = document.getElementById('round-template');
    const roundsContainer = document.getElementById('evaluation-rounds-container');

    // --- 初始化 ---
    initializePage();

    /**
     * 页面加载时执行的初始化函数
     */
    function initializePage() {
        // 1. 从HTML中读取初始对话历史，填充到JS变量中
        const initialLogElements = document.querySelectorAll('#conversation-log .chat-bubble');
        initialLogElements.forEach(el => {
            const type = el.classList.contains('user') ? 'User' : 'Model';
            const text = el.querySelector('p').textContent;
            conversationLog.push(`${type}: ${text}`);
        });

        // 2. 为HTML中静态存在的第一轮绑定事件
        const firstRoundElement = document.getElementById('round-1');
        bindRoundEvents(firstRoundElement, roundCounter);

        // 3. 绑定全局静态事件（计时器和总提交按钮）
        setupStaticListeners();
    }

    /**
     * 为指定轮次的动态元素绑定事件
     * @param {HTMLElement} roundElement - 轮次div元素
     * @param {number} roundNum - 当前轮次编号
     */
    function bindRoundEvents(roundElement, roundNum) {
        // 显示挑战框的逻辑
        const preferenceRadios = roundElement.querySelectorAll(`input[name="final_preference_r${roundNum}"]`);
        const challengeSection = roundElement.querySelector('.challenge-section');
        preferenceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    challengeSection.style.display = 'block';
                }
            });
        });

        // “发送提示词”按钮的逻辑
        const sendBtn = roundElement.querySelector('.send-prompt-btn');
        sendBtn.addEventListener('click', () => handleSendNewPrompt(roundElement, roundNum));
        
        // 高亮当前活动轮次，并滚动到视图中
        document.querySelectorAll('.evaluation-round').forEach(r => r.classList.remove('active'));
        roundElement.classList.add('active');
        if (roundNum > 1) { // 第一轮不需要滚动
            roundElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * 处理点击“发送下一句提示词”的核心逻辑
     * @param {HTMLElement} currentRoundElement - 触发事件的轮次div
     * @param {number} currentRoundNum - 触发事件的轮次编号
     */
    async function handleSendNewPrompt(currentRoundElement, currentRoundNum) {
        const challengeInput = currentRoundElement.querySelector(`#challenge-prompt_r${currentRoundNum}`);
        const newPromptText = challengeInput.value.trim();

        if (!newPromptText) {
            alert('请输入要发送的提示词！');
            return;
        }

        const selectedPreferenceRadio = currentRoundElement.querySelector(`input[name="final_preference_r${currentRoundNum}"]:checked`);
        if (!selectedPreferenceRadio) {
            alert('请先在1-7分中选择您偏好的回复！');
            return;
        }
        
        // 禁用当前轮次的发送按钮，防止重复点击
        currentRoundElement.querySelector('.send-prompt-btn').disabled = true;

        // 根据偏好选择，获取上一轮模型的隐藏文字稿作为上下文
        const preferenceValue = parseInt(selectedPreferenceRadio.value, 10);
        let preferredModelText;
        if (preferenceValue <= 3) {
            preferredModelText = currentRoundElement.querySelectorAll('.transcript-text')[0].textContent;
        } else if (preferenceValue >= 5) {
            preferredModelText = currentRoundElement.querySelectorAll('.transcript-text')[1].textContent;
        } else {
            alert('请选择一个更明确的偏好（1-3分偏好A，5-7分偏好B）来挑战模型。');
            currentRoundElement.querySelector('.send-prompt-btn').disabled = false;
            return;
        }

        // 更新并显示对话历史
        updateConversationLog('Model', preferredModelText);
        updateConversationLog('User', newPromptText);

        const fullContextPrompt = conversationLog.join('\n');
        
        // 显示加载动画
        const loadingSpinner = document.getElementById('loading-spinner');
        loadingSpinner.style.display = 'block';
        loadingSpinner.scrollIntoView({ behavior: 'smooth' });

        try {
            const response = await fetch('/api/generate-voice', { // 调用您的后端函数
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: fullContextPrompt }),
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            
            // 成功后，创建并显示新的一轮
            createNewRound(data);

        } catch (error) {
            console.error('API请求失败:', error);
            alert('生成新回复失败，请检查浏览器控制台或服务器日志。');
        } finally {
            // 无论成功失败，都隐藏加载动画
            loadingSpinner.style.display = 'none';
        }
    }
    
    /**
     * 使用API返回的数据创建新一轮评估卡片
     * @param {Object} apiData - API返回的数据
     */
    function createNewRound(apiData) {
        roundCounter++;
        const newRound = roundTemplate.content.cloneNode(true).firstElementChild;
        newRound.id = `round-${roundCounter}`;

        // 填充新轮次的标题
        newRound.querySelector('.round-title').textContent = `模型回复评估 (第 ${roundCounter} 轮)`;
        
        // 填充模型A的数据
        const panelA = newRound.querySelectorAll('.model-panel')[0];
        const audioClipsA = panelA.querySelector('.audio-clips');
        // 假设API返回的audios是一个数组
        apiData.modelA.audios.forEach((audioBase64, index) => {
            audioClipsA.innerHTML += `<p class="audio-label">回复 ${index + 1}:</p><audio controls src="data:audio/mp3;base64,${audioBase64}"></audio>`;
        });
        panelA.querySelector('.transcript-text').textContent = apiData.modelA.text;

        // 填充模型B的数据
        const panelB = newRound.querySelectorAll('.model-panel')[1];
        const audioClipsB = panelB.querySelector('.audio-clips');
        apiData.modelB.audios.forEach((audioBase64, index) => {
            audioClipsB.innerHTML += `<p class="audio-label">回复 ${index + 1}:</p><audio controls src="data:audio/mp3;base64,${audioBase64}"></audio>`;
        });
        panelB.querySelector('.transcript-text').textContent = apiData.modelB.text;

        // 填充问题和表单部分 (这部分可以从模板复制，以保持结构一致)
        // 注意：为简化，此示例不重新复制问题和表单。一个更完整的实现会从模板复制它们。
        
        // 将新轮次添加到页面容器中
        roundsContainer.appendChild(newRound);
        
        // 为新生成的轮次绑定事件
        bindRoundEvents(newRound, roundCounter);
    }

    /**
     * 更新全局对话历史数组，并在UI上显示新消息
     * @param {string} type - 'User' or 'Model'
     * @param {string} text - 对话内容
     */
    function updateConversationLog(type, text) {
        conversationLog.push(`${type}: ${text}`);
        
        const logContainer = document.getElementById('conversation-log');
        const bubble = document.createElement('div');
        const bubbleClass = type === 'User' ? 'user' : 'model-response';
        bubble.classList.add('chat-bubble', bubbleClass);
        bubble.innerHTML = `<p>${text}</p>`;
        logContainer.appendChild(bubble);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * 设置只绑定一次的全局静态事件监听器
     */
    function setupStaticListeners() {
        // 计时器
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            let timeLeftInSeconds = 30 * 60;
            const interval = setInterval(() => {
                if (timeLeftInSeconds <= 0) {
                    clearInterval(interval);
                    timerElement.textContent = "时间到!";
                    document.getElementById('submit-task-btn').disabled = true;
                } else {
                    timeLeftInSeconds--;
                    const minutes = Math.floor(timeLeftInSeconds / 60);
                    let seconds = timeLeftInSeconds % 60;
                    seconds = seconds < 10 ? '0' + seconds : seconds;
                    timerElement.textContent = `${minutes}:${seconds}`;
                }
            }, 1000);
        }
        
        // “提交所有评估”按钮
        const submitTaskBtn = document.getElementById('submit-task-btn');
        submitTaskBtn.addEventListener('click', () => {
            alert(`正在提交所有 ${roundCounter} 轮的评估数据。（此为演示功能）`);
            // 在实际应用中，这里会遍历所有.evaluation-round来收集数据
        });
    }
});