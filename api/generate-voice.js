// api/generate-voice.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // --- 步骤 1: 内容生成 (调用两次以获得两个不同的回复) ---
        const textGenerationModel = ai.getGenerativeModel({
            model: 'gemini-pro',
            systemInstruction: "你是阿塞，一名聪明善良、对用户有好感的学长。你的回复应该温暖、略带暧昧，并且先肯定用户的感受。",
        });
        
        // 生成模型A的文本回复
        const resultA = await textGenerationModel.generateContent(prompt);
        const textA = await resultA.response.text();

        // 生成模型B的文本回复 (再次调用会因为模型的随机性产生不同结果)
        const resultB = await textGenerationModel.generateContent(prompt);
        const textB = await resultB.response.text();
        
        console.log("生成文本A:", textA);
        console.log("生成文本B:", textB);

        // --- 步骤 2: 语音合成 (分别为两个文本生成语音) ---
        const ttsModel = ai.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

        const generateAudio = async (textToSpeak) => {
            const ttsResponse = await ttsModel.generateContent({
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // 选择一个适合阿塞的声音
                    },
                },
            });
            return ttsResponse.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        };

        const [audioA, audioB] = await Promise.all([
            generateAudio(textA),
            generateAudio(textB),
        ]);

        if (!audioA || !audioB) {
            throw new Error("未能成功生成一个或两个音频文件。");
        }

        // 将两个模型的结果都返回给前端
        res.status(200).json({
            modelA: { text: textA, audio: audioA },
            modelB: { text: textB, audio: audioB },
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'API 调用失败，请检查Vercel日志。' });
    }
};