// api/generate-voice.js

// 注意：在Vercel环境中，我们不需要 dotenv 库
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');

// 这是Vercel无服务器函数的标准导出格式
module.exports = async (req, res) => {
    // Vercel会自动处理CORS，但为保险起见可以手动设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // 对于Google Cloud的JSON凭证，Vercel有特殊处理方式
        const ttsClient = new textToSpeech.TextToSpeechClient();

        // --- 1. 生成文本 ---
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const textResponse = await result.response.text();

        // --- 2. 生成音频 ---
        const request = {
            input: { text: textResponse },
            voice: { languageCode: 'cmn-CN', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [audioResponse] = await ttsClient.synthesizeSpeech(request);
        
        const audioContent = audioResponse.audioContent.toString('base64');
        
        // 返回成功响应
        res.status(200).json({ audio: audioContent });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to generate voice response.' });
    }
};