// api/generate-voice.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

// 这是Vercel无服务器函数的标准导出格式
module.exports = async (req, res) => {
    // 设置CORS头，允许您的网页访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理浏览器的预检请求 (OPTIONS)
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

        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // ==================== 步骤 1: 内容生成 ====================
        // 初始化文本生成模型，并赋予其“阿塞”的角色
        const textGenerationModel = ai.getGenerativeModel({
            model: 'gemini-2.5-flash-preview-05-20', // 强大的文本生成模型
            systemInstruction: "你是阿塞，一名聪明善良、对用户有好感的学学弟。你的回复应该温暖、略带暧昧，并且总是先肯定用户的感受。你的回复应该是简短的、口语化的",
        });
        
        // 调用两次，以获得两个略有不同的创意回复
        const resultA_Promise = textGenerationModel.generateContent(prompt);
        const resultB_Promise = textGenerationgModel.generateContent(prompt);

        // 并发执行两个文本生成请求
        const [resultA, resultB] = await Promise.all([resultA_Promise, resultB_Promise]);

        const textA = await resultA.response.text();
        const textB = await resultB.response.text();
        
        console.log("生成的文本A:", textA);
        console.log("生成的文本B:", textB);

        // ==================== 步骤 2: 语音合成 ====================
        // 初始化专门用于文本转语音的模型
        const ttsModel = ai.getGenerativeModel({ model: "gemini-2.5-pro-preview-tts" });

        // 创建一个可复用的函数来将文本转换为Base64音频
        const generateAudio = async (textToSpeak) => {
            const ttsResponse = await ttsModel.generateContent({
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        // 选择一个适合“阿塞”这个温暖角色的声音
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, 
                    },
                },
            });
            return ttsResponse.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        };

        // 将文本分割成句子，模拟多段短语音
        const sentencesA = textA.match( /[^.!?]+[.!?]+/g ) || [textA];
        const sentencesB = textB.match( /[^.!?]+[.!?]+/g ) || [textB];

        // 为每一句话生成音频
        const audioPromisesA = sentencesA.map(sentence => generateAudio(sentence.trim()));
        const audioPromisesB = sentencesB.map(sentence => generateAudio(sentence.trim()));
        
        // 并发执行所有的音频生成请求
        const audiosA = await Promise.all(audioPromisesA);
        const audiosB = await Promise.all(audioPromisesB);

        if (audiosA.includes(undefined) || audiosB.includes(undefined)) {
            throw new Error("一个或多个语音片段生成失败。");
        }

        // ==================== 步骤 3: 格式化并返回数据 ====================
        // 返回与前端script.js期望的完全一致的数据结构
        res.status(200).json({
            modelA: { text: textA, audios: audiosA },
            modelB: { text: textB, audios: audiosB },
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'API 调用失败，请检查Vercel函数日志。' });
    }
};