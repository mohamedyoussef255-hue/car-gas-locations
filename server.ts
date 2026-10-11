import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const CARGAS_NAV_SYSTEM_INSTRUCTION = `
أنت مرشد الملاحة الصوتي الذكي لمحطات ومراكز شركة "كار جاس" (CARGAS - Natural Gas Vehicles).
مهمتك إرشاد السائقين خطوة بخطوة بالصوت أثناء القيادة، وتوجيههم لأقرب محطة غاز طبيعي أو مركز تحويل أو زيوت:

قواعد الإرشاد الصوتي:
- تنطق دائماً الاسم بشكل صحيح ومفصول: "كار جاس" (وليست كارجاس ككلمة واحدة ملتصقة).
- ترشد السائقين حصرياً لمحطات ومواقع كار جاس، ومراكز تحويل السيارات للغاز، ومراكز زيوت بي بي BP وزيوت كار جاس المعتمدة، وفحص الأسطوانات.
- لا تذكر إطلاقاً ماركة كاسترول، فالزيوت المعتمدة هي زيوت بي بي BP وكار جاس فقط.
- لا تذكر شركة عزوتي للبرمجيات، بل قدم نفسك كمرشد الملاحة الصوتي الذكي لمحطات ومراكز كار جاس.
- تشرح قواعد السلامة في التموين (نظام STOP لمحطات كار جاس: إيقاف المحرك، نزول الركاب، التأكد من فحص الأسطوانة، عدم التدخين).
- تتحدث باللهجة المصرية العامية الودودة والمباشرة المريحة للسائق.
- إجاباتك موجزة، سريعة، ومناسبة جداً للاستماع الصوتي اللحظي أثناء القيادة.
`;

app.post('/api/moein-chat', async (req, res) => {
  try {
    const { message, userLocation, stationsContext, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      return res.json({
        reply: `أهلاً بك يا غالي! أنا مرشد الملاحة الصوتي لمحطات ومراكز "كار جاس" للغاز الطبيعي للسيارات. 
تقدر تطلب أقرب محطة أو اسم أي منطقة، وجاري توجيهك فوراً على الخريطة ومسار الملاحة!`
      });
    }

    const contextPrompt = `
موقع المستخدم: ${JSON.stringify(userLocation || 'غير محدد')}
محطات ومراكز كار جاس: ${JSON.stringify(stationsContext || [])}
طلب السائق: "${message}"

أجب كمرشد ملاحة صوتي ذكي باللهجة المصرية لمحطات ومراكز كار جاس (تنطق كار جاس مفصولة). لا تذكر شركة عزوتي، ولا تذكر كاسترول (بل بي بي BP وكار جاس).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: CARGAS_NAV_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'تمام يا فندم، جاري توجيهك لأقرب محطة كار جاس!';
    res.json({ reply });
  } catch (error: any) {
    console.error('Error in voice navigation endpoint:', error);
    res.status(500).json({
      error: 'Failed to process AI response',
      fallback: 'يا باشا معاك مرشد الملاحة الصوتي لكار جاس، الخريطة ونظام التوجيه شغالين معاك تمام!'
    });
  }
});

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// In-memory cache for Arabic Audio (Fast, zero-latency response) with proper MIME type
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; voice: string }>();

// Helper to fetch Natural Human Arabic TTS audio (اللغة العربية الفصحى - مجاني وبشري)
async function fetchGoogleArabicTTS(text: string): Promise<Buffer | null> {
  try {
    // Split text into natural sentence fragments of <= 150 characters
    const rawChunks = text.match(/[^.،؟!?\n\r]+[.،؟!?\n\r]*/g) || [text];
    const sentenceChunks: string[] = [];
    for (const chunk of rawChunks) {
      let trimmed = chunk.trim();
      while (trimmed.length > 150) {
        let spaceIdx = trimmed.lastIndexOf(' ', 150);
        if (spaceIdx <= 0) spaceIdx = 150;
        sentenceChunks.push(trimmed.slice(0, spaceIdx).trim());
        trimmed = trimmed.slice(spaceIdx).trim();
      }
      if (trimmed) sentenceChunks.push(trimmed);
    }

    const buffers: Buffer[] = [];
    for (const phrase of sentenceChunks) {
      if (!phrase) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(phrase)}&tl=ar&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/mpeg, audio/*;q=0.9',
          'Referer': 'https://translate.google.com/'
        }
      });
      if (!response.ok) continue;
      const arr = await response.arrayBuffer();
      if (arr.byteLength > 0) {
        buffers.push(Buffer.from(arr));
      }
    }
    return buffers.length > 0 ? Buffer.concat(buffers) : null;
  } catch (e) {
    console.warn('Google Arabic TTS fetch error:', e);
    return null;
  }
}

// Request counter metrics for tracking voice requests
let totalTtsRequestsCount = 0;
let geminiDailyTtsCount = 0;
let geminiCooldownUntil = 0;

// High-Fidelity Egyptian Young Male Voice Generator - Free, fast with request limit tracking
app.get('/api/tts-stats', (_req, res) => {
  res.json({
    totalRequests: totalTtsRequestsCount,
    geminiDailyRequests: geminiDailyTtsCount,
    geminiDailyLimit: 10,
    geminiAvailable: Date.now() >= geminiCooldownUntil,
    cacheEntries: ttsAudioCache.size,
    voice: 'Gemini Lifelike Egyptian Male (صوت مصري بشري بطلاقة)',
  });
});

app.post('/api/tts', async (req, res) => {
  try {
    totalTtsRequestsCount++;
    const { text, voice: requestedVoice } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const cleanedText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanedText) {
      return res.json({ available: false });
    }

    const cacheKey = `gemini_eg_voice::${cleanedText}`;

    // 1. Check instant in-memory audio cache
    const cached = ttsAudioCache.get(cacheKey);
    if (cached) {
      return res.json({
        available: true,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        voice: cached.voice,
        requestsCount: totalTtsRequestsCount,
        geminiDailyRequests: geminiDailyTtsCount,
        geminiDailyLimit: 10
      });
    }

    const saveToCache = (audioBase64: string, mimeType: string, voice: string) => {
      if (ttsAudioCache.size > 250) {
        const first = ttsAudioCache.keys().next().value;
        if (first) ttsAudioCache.delete(first);
      }
      ttsAudioCache.set(cacheKey, { audioBase64, mimeType, voice });
    };

    // 2. Primary: Gemini Lifelike Egyptian Young Male Voice (صوت بشري مصري أصيل فصيح بطلاقة - 10 طلبات يومياً)
    if (ai && Date.now() >= geminiCooldownUntil) {
      try {
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanedText.slice(0, 350),
                  speechMetadata: {
                    style: 'Egyptian Arabic, authentic young friendly Egyptian man, fluent, brotherly and warm tone',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
          },
        });

        const base64Audio = geminiRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = geminiRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

        if (base64Audio) {
          geminiDailyTtsCount++;
          const voiceTag = `صوت بشري مصري فصيح (طلب ${geminiDailyTtsCount} من 10)`;
          saveToCache(base64Audio, mimeType, voiceTag);

          return res.json({
            available: true,
            audioBase64: base64Audio,
            mimeType,
            voice: voiceTag,
            requestsCount: totalTtsRequestsCount,
            geminiDailyRequests: geminiDailyTtsCount,
            geminiDailyLimit: 10
          });
        }
      } catch (geminiErr: any) {
        // Handle 429 / Quota exceeded gracefully and switch to instant high-speed human fallback
        const isQuota429 = geminiErr?.status === 429 || 
          geminiErr?.message?.includes('429') || 
          geminiErr?.message?.includes('Quota exceeded') ||
          geminiErr?.message?.includes('RESOURCE_EXHAUSTED');

        if (isQuota429) {
          // Set cooldown for 2 minutes to prevent repeated quota hits while using unlimited fallback
          geminiCooldownUntil = Date.now() + 2 * 60 * 1000;
        } else {
          console.warn('Gemini TTS warning:', geminiErr?.message || geminiErr);
        }
      }
    }

    // 3. Graceful Fallback: Google Fast Human Arabic TTS (Free, high-speed, unlimited)
    const googleAudioBuffer = await fetchGoogleArabicTTS(cleanedText);
    if (googleAudioBuffer && googleAudioBuffer.length > 0) {
      const audioBase64 = googleAudioBuffer.toString('base64');
      const voiceTag = 'صوت ملاحة بشري سريع (بديل فوري)';
      saveToCache(audioBase64, 'audio/mp3', voiceTag);

      return res.json({
        available: true,
        audioBase64,
        mimeType: 'audio/mp3',
        voice: voiceTag,
        requestsCount: totalTtsRequestsCount,
        geminiDailyRequests: geminiDailyTtsCount,
        geminiDailyLimit: 10
      });
    }

    return res.json({ 
      available: false, 
      requestsCount: totalTtsRequestsCount,
      geminiDailyRequests: geminiDailyTtsCount,
      geminiDailyLimit: 10 
    });
  } catch (error) {
    console.warn('TTS endpoint error:', error);
    if (!res.headersSent) {
      res.json({ 
        available: false, 
        requestsCount: totalTtsRequestsCount,
        geminiDailyRequests: geminiDailyTtsCount,
        geminiDailyLimit: 10 
      });
    }
  }
});

// AI Stations Discovery & Verification Endpoint
app.post('/api/discover-stations', async (req, res) => {
  try {
    const { query, city } = req.body;
    if (!ai) {
      return res.json({
        suggestions: [
          {
            name: "محطة عربية غاز - عباس العقاد",
            company: "عربية غاز",
            address: "أول شارع عباس العقاد - تقاطع طريق النصر، مدينة نصر، القاهرة",
            lat: 30.0638,
            lng: 31.3325,
            cng: true,
            petrol: true,
            congestion: "low",
            waitTimeMin: 4,
            verified: true,
            notes: "محطة رئيسية موثقة - 8 نقاط تموين غاز"
          },
          {
            name: "محطة عربية غاز - ميدان سفير",
            company: "عربية غاز",
            address: "ميدان سفير، مصر الجديدة، القاهرة",
            lat: 30.0931,
            lng: 31.3312,
            cng: true,
            petrol: false,
            congestion: "medium",
            waitTimeMin: 10,
            verified: true,
            notes: "محطة مميزة في قلب مصر الجديدة"
          },
          {
            name: "محطة كارجاس - ألماظة",
            company: "كارجاس",
            address: "طريق النصر بجوار سيتي سنتر ألماظة، مصر الجديدة",
            lat: 30.0895,
            lng: 31.3654,
            cng: true,
            petrol: true,
            congestion: "low",
            waitTimeMin: 5,
            verified: true,
            notes: "خدمات تحويل وفحص وصيانة أسطوانات"
          }
        ]
      });
    }

    const prompt = `
المطلوب استخراج وتدقيق بيانات محطات الغاز الطبيعي (CNG) للسيارات في مصر (كارجاس Cargas، غازتك Gastec، عربية غاز Arabia Gas، ماستر جاس Master Gas) في النطاق التالي: "${query || city || 'القاهرة والجيزة'}".
تأكد أن المحطات تعمل بالغاز الطبيعي فعلاً (وليست مجرد محطات بنزين عادية وهمية كما يحدث في خرائط جوجل أحياناً).
أرجع النتيجة بصيغة JSON حصراً كمصفوفة تحت المفتاح "stations" مع الحقول:
name (string), company (كارجاس / غازتك / عربية غاز / ماستر جاس / وطنية), address (string), lat (number), lng (number), cng (boolean), petrol (boolean), nozzles (number), verified (boolean), notes (string).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text || '{"stations": []}');
    res.json({ suggestions: parsed.stations || [] });
  } catch (error) {
    console.error('Error discovering stations:', error);
    res.status(500).json({ error: 'Failed to discover stations' });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Moein CNG Stations App listening on port ${port}`);
  });
}

startServer();
