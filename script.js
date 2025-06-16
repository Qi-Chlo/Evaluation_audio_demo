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
            // 在实际应用中，这里会用 fetch() 将整个表单数据发送到服务器
        });
    }

    // ===== 修改点：恢复监听器功能 =====
    // --- 控制挑战模型文本框的显示 ---
    const preferenceRadios = document.querySelectorAll('input[name="final_preference"]');
    const challengeSection = document.getElementById('challenge-prompt-section');

    if (preferenceRadios.length > 0 && challengeSection) {
        // 为每个 Likert 单选按钮添加事件监听器
        preferenceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // 只要任何一个按钮被选中，就显示挑战区域
                if (radio.checked) {
                    challengeSection.classList.add('visible');
                }
            });
        });
    }

    // --- “发送下一句提示词”按钮的逻辑 ---
    const sendPromptBtn = document.getElementById('send-prompt-btn');
    if (sendPromptBtn) {
        sendPromptBtn.addEventListener('click', function() {
            // 获取挑战文本框中的内容
            const challengePrompt = document.getElementById('challenge-prompt').value;

            if (challengePrompt.trim() === "") {
                alert('请输入要发送的提示词！');
                return;
            }

            // 显示一个提示，表示功能被触发
            alert(`已发送提示词：\n"${challengePrompt}"\n（此为演示功能）`);

            // 在实际应用中，这里会用 fetch() 将 challengePrompt 发送到服务器
        });
    }

});