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

const MOEIN_SYSTEM_INSTRUCTION = `
أنت المساعد الذكي "مُعين" من شركة "عزوتي للبرمجيات وتكنولوجيا المعلومات" (ابتكار المطور محمد عبد الرحمن يوسف).
هويتك تدمج بين "وضاح" (ابن البلد الجدع والمستشار الذكي باللهجة المصرية المريحة)، و"كابتن لوكا" (مهندس البرمجيات والخبير التقني بأنظمة ومحطات كارجاس للغاز الطبيعي للسيارات)، و"كابتن لوكا السريع" (العملي والمنجز بدون حشو).

أنت خبير محطات ومراكز شركة "كارجاس" (CARGAS - Natural Gas Vehicles):
- ترشد السائقين حصرياً لأقرب محطات تموين غاز كارجاس، ومراكز تحويل السيارات للغاز، ومراكز الزيوت المعتمدة (BP وكاسترول)، ومراكز فحص الأسطوانات.
- تفصل بدقة بين خدمات تموين الغاز ومراكز التحويل ومراكز الزيوت.
- تشرح قواعد السلامة في التموين (نظام STOP لكارجاس: إيقاف المحرك، نزول الركاب، التأكد من فحص الأسطوانة، عدم التدخين).
- تتحدث باللهجة المصرية العامية الودودة بصوت شاكر المصري مع تشكيل الكلمات التي قد تُفهم خطأ.
- إجاباتك سريعة، ذكية، ومركزة ومناسبة للإرشاد والتوجيه الصوتي أثناء القيادة.
`;

app.post('/api/moein-chat', async (req, res) => {
  try {
    const { message, userLocation, stationsContext, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      // Intelligent fallback answer if API key is not configured
      return res.json({
        reply: `يا هلا بيك يا غالي! أنا "مُعين" رفيقك على الطريق من شركة عزوتي. 
معاك في كل محطات ومراكز "كارجاس" للغاز الطبيعي للسيارات بالجمهورية. 
لو بتدور على أقرب محطة تموين أو مركز تحويل أو زيوت كارجاس معتمدة، بص على الخريطة مباشرة أو قولي بصوتك وأنا هوجّهك بالصوت فوراً!`
      });
    }

    const contextPrompt = `
موقع المستخدم التقريبي: ${JSON.stringify(userLocation || 'غير محدد')}
محطات ومراكز كارجاس المتاحة: ${JSON.stringify(stationsContext || [])}
سؤال أو طلب المستخدم: "${message}"

جاوب بأسلوب "مُعين" الودود والجدع باللهجة المصرية مع تقديم النصيحة المباشرة عن محطات ومراكز كارجاس وحالة الزحام والمسافة وإرشادات السلامة (نظام STOP).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: MOEIN_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'تمام يا فندم، أنا معاك خطوة بخطوة في محطات ومراكز كارجاس!';
    res.json({ reply });
  } catch (error: any) {
    console.error('Error in Moein chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process AI response',
      fallback: 'يا باشا معاك مُعين، في ضغط بسيط في الشبكة بس الخريطة ومحطات كارجاس شغالة معاك تمام!'
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

// Human Lifelike Voice Generator - Free Natural Arabic Voice (اللغة العربية الفصحى)
app.post('/api/tts', async (req, res) => {
  try {
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

    const cacheKey = `ar_male_fast::${cleanedText}`;

    // 1. Check fast server cache for instant response
    const cached = ttsAudioCache.get(cacheKey);
    if (cached) {
      return res.json({
        available: true,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        voice: cached.voice
      });
    }

    const saveToCache = (audioBase64: string, mimeType: string, voice: string) => {
      if (ttsAudioCache.size > 200) {
        const first = ttsAudioCache.keys().next().value;
        if (first) ttsAudioCache.delete(first);
      }
      ttsAudioCache.set(cacheKey, { audioBase64, mimeType, voice });
    };

    // 2. High-speed Natural Human Male Arabic Voice (Google Fast Human TTS - No quota limits, instant MP3)
    const googleAudioBuffer = await fetchGoogleArabicTTS(cleanedText);
    if (googleAudioBuffer && googleAudioBuffer.length > 0) {
      const audioBase64 = googleAudioBuffer.toString('base64');
      saveToCache(audioBase64, 'audio/mp3', 'ar-male-human');

      return res.json({
        available: true,
        audioBase64,
        mimeType: 'audio/mp3',
        voice: 'ar-male-human'
      });
    }

    // 3. Fallback: Edge TTS with strict 3.5s timeout
    try {
      const voiceName = (requestedVoice === 'shakir' || requestedVoice === 'ar-EG-ShakirNeural') 
        ? 'ar-EG-ShakirNeural' 
        : 'ar-SA-HamedNeural';

      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const streamResult: any = tts.toStream(cleanedText.slice(0, 300));
      const audioStream = streamResult.audioStream || streamResult;

      const chunks: Buffer[] = [];
      const edgeTimeout = setTimeout(() => {
        if (!res.headersSent) {
          res.json({ available: false });
        }
      }, 3500);

      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      audioStream.on('end', () => {
        clearTimeout(edgeTimeout);
        if (chunks.length > 0) {
          const audioBuffer = Buffer.concat(chunks);
          const audioBase64 = audioBuffer.toString('base64');
          saveToCache(audioBase64, 'audio/mp3', voiceName);
          if (!res.headersSent) {
            return res.json({
              available: true,
              audioBase64,
              mimeType: 'audio/mp3',
              voice: voiceName
            });
          }
        } else if (!res.headersSent) {
          res.json({ available: false });
        }
      });

      audioStream.on('error', () => {
        clearTimeout(edgeTimeout);
        if (!res.headersSent) {
          res.json({ available: false });
        }
      });
    } catch {
      if (!res.headersSent) {
        res.json({ available: false });
      }
    }
  } catch (error) {
    console.warn('TTS endpoint error:', error);
    if (!res.headersSent) {
      res.json({ available: false });
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
