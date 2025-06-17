// api/generate-voice.js

// 只需要这一个库！
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 这是Vercel无服务器函数的标准导出格式
module.exports = async (req, res) => {
    // 设置CORS头，允许您的网页访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理浏览器的预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 确保是POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // 初始化客户端，密钥从Vercel的环境变量中读取
        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // 利用自然语言提示来控制“阿塞”的人设和语气！
        const finalPromptForTts = `(Using a kind, warm, and slightly flirtatious tone, as the character '阿塞') Respond to the user's last message based on the conversation history:\n\n${prompt}`;
        
        console.log("发送给Gemini TTS API的最终提示：", finalPromptForTts);

        // --- 关键：调用新的单一API ---
        const response = await ai.models.generateContent({
            // 使用文档中提到的新模型
            model: "gemini-2.5-flash-preview-tts", 
            // 传入我们精心构建的、带有风格指导的提示词
            contents: [{ parts: [{ text: finalPromptForTts }] }],
            // 配置API，告诉它我们想要音频输出
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        // 'Kore' 是一个听起来不错的男性声音，您可以从文档列表中选择其他声音
                        prebuiltVoiceConfig: { voiceName: 'Puck' }, 
                    },
                },
            },
        });

        // 从响应中提取Base64编码的音频数据
        const data = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!data) {
            throw new Error("API did not return audio data.");
        }
        
        // 将音频数据以JSON格式发回给前端
        res.status(200).json({ audio: data });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to generate voice response.' });
    }
};