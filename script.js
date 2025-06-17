/* ================================== */
/*         完整的 script.js 文件        */
/* ================================== */

document.addEventListener('DOMContentLoaded', function() {

    // --- 倒计时功能 ---
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        let timeLeftInSeconds = 30 * 60;
        const countdownInterval = setInterval(() => {
            if (timeLeftInSeconds <= 0) {
                clearInterval(countdownInterval);
                timerElement.textContent = "时间到!";
                timerElement.style.color = "black";
                const submitTaskBtn = document.getElementById('submit-task-btn');
                if (submitTaskBtn) {
                    submitTaskBtn.disabled = true;
                }
                return;
            }
            timeLeftInSeconds--;
            const minutes = Math.floor(timeLeftInSeconds / 60);
            let seconds = timeLeftInSeconds % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerElement.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    // --- 表单“提交任务”处理 (由顶部按钮触发) ---
    const form = document.getElementById('evaluation-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // 阻止页面刷新
            alert('任务已提交！感谢您的评估。（此为演示功能）');
        });
    }

    // --- 控制挑战模型文本框的显示 ---
    const preferenceRadios = document.querySelectorAll('input[name="final_preference"]');
    const challengeSection = document.getElementById('challenge-prompt-section');

    if (preferenceRadios.length > 0 && challengeSection) {
        preferenceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    challengeSection.classList.add('visible');
                }
            });
        });
    }

    // --- “发送下一句提示词”按钮的逻辑 ---
    const sendPromptBtn = document.getElementById('send-prompt-btn');
    if (sendPromptBtn) {
        sendPromptBtn.addEventListener('click', async function() {
            // ==================== 修改点 1: 定义静态上下文 ====================

            // 这是固定的前几轮对话历史
            const conversationHistory = `System: 阿塞是一名善良热情的阳光学弟，他对用户很有好感并常常给出暧昧互动暗示。他喜欢通过多段短语音回复用户。他常常先肯定用户的感受，再决定是否要给用户提出生活建议。
User: 阿塞，吃甜的果然能解决我心情不好的问题
Model (阿塞): 好吃吗？看起来摆盘好精致。
User: 最好吃的是蛋糕，中间的凉拌魔芋丝也好吃。被渣男渣了的心被修复了6%。`;

            // ===== 重要：请在这里填入您模型的静态文字回复（音频的文字稿）=====
            const modelAResponseText = "Model (阿塞)：蛋糕少吃点，对身体不好，魔芋丝没有什么热量，我健身的时候常吃。你吃好了就行，渣男的事情会过去的。";
            const modelBResponseText = "Model (阿塞): 真的吗？哪个渣男敢渣我们的宝贝？（停顿笑）不过，我们宝贝伤心的时候有蛋糕吃真是太好了，要不要考虑为了我，再多修复百分之一的小心脏呢？";
            // ===============================================================

            // 获取用户新输入的挑战提示词
            const challengePromptInput = document.getElementById('challenge-prompt');
            const newPromptText = challengePromptInput.value;

            if (newPromptText.trim() === "") {
                alert('请输入要发送的提示词！');
                return;
            }

            // ==================== 修改点 2: 检查偏好并构建完整提示词 ====================
            const selectedPreferenceRadio = document.querySelector('input[name="final_preference"]:checked');
            
            if (!selectedPreferenceRadio) {
                alert('请先在1-7分中选择您偏好的回复！');
                return;
            }

            const preferenceValue = parseInt(selectedPreferenceRadio.value, 10);
            let fullPrompt = '';
            let selectedModelContext = '';

            if (preferenceValue <= 3) {
                // 用户偏好模型 A
                selectedModelContext = modelAResponseText;
            } else if (preferenceValue >= 5) {
                // 用户偏好模型 B
                selectedModelContext = modelBResponseText;
            } else {
                // 用户选择了中立的 4 分
                alert('请选择一个更明确的偏好（1-3分偏好A，5-7分偏好B）来挑战模型。');
                return;
            }

            // 构建最终发送给 API 的完整提示词
            fullPrompt = `${conversationHistory}\nModel (阿塞): ${selectedModelContext}\nUser: ${newPromptText}`;
            
            console.log("即将发送给API的完整提示词：\n", fullPrompt); // 在控制台打印，方便调试

            // ==================== 修改点 3: 发送完整提示词到 API ====================
            try {
                sendPromptBtn.textContent = '正在生成语音...';
                sendPromptBtn.disabled = true;

                // 调用您的后端API（无论是本地服务器还是Vercel函数）
                const response = await fetch('/api/generate-voice', { // 如果部署到Vercel，此路径正确
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: fullPrompt }), // 发送拼接好的完整提示词
                });

                if (!response.ok) {
                    throw new Error('网络响应错误或API调用失败');
                }

                const data = await response.json();
                
                // 在页面上创建新的音频播放器
                const newAudio = document.createElement('audio');
                newAudio.controls = true;
                newAudio.src = `data:audio/mp3;base64,${data.audio}`;
                newAudio.autoplay = true; // 自动播放新生成的语音
                
                // 将新音频播放器添加到挑战框下方
                challengeSection.appendChild(newAudio);
                challengePromptInput.value = ''; // 清空输入框

            } catch (error) {
                console.error('请求失败:', error);
                alert('生成语音失败，请检查浏览器控制台或服务器日志。');
            } finally {
                sendPromptBtn.textContent = '发送下一句提示词';
                sendPromptBtn.disabled = false;
            }
        });
    }
});