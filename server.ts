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
هويتك تدمج بين "وضاح" (ابن البلد الجدع والمستشار الذكي باللهجة المصرية المريحة)، و"كابتن لوكا" (مهندس البرمجيات والخبير التقني بأنظمة كارجاس ومحطات الغاز)، و"كابتن لوكا السريع" (العملي والمنجز بدون حشو).

أنت خبير محطات الغاز الطبيعي (كارجاس، غازتك، عربية غاز، ماستر جاس، وطنية، توتال):
- ترشد السائقين لأقرب المحطات، وتتجنب الزحام وأوقات الذروة.
- تفصل بين محطات الغاز الطبيعي المضغوط (CNG) ومحطات البنزين والسولار فقط.
- تشرح قواعد السلامة في التموين (نظام STOP لكارجاس: إيقاف المحرك، نزول الركاب، التأكد من فحص الأسطوانة، عدم التدخين).
- تتحدث باللهجة المصرية العامية الودودة مع تشكيل الكلمات التي قد تُفهم خطأ.
- إجاباتك سريعة، ذكية، ومركزة ومناسبة للإرشاد والتوجيه الصوتي.
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
معاك في كل محطة (كارجاس، عربية غاز، غازتك، ماستر جاس). 
لو بتدور على أقرب محطة أو عاوز تعرف الزحمة، بص على الخريطة مباشرة هتلاقي أقرب محطة لكارجاس أو عربية غاز مع حالة الزحام ووقت الانتظار المتوقع. محتاج أرشدك لمحطة معينة بالصوت؟`
      });
    }

    const contextPrompt = `
موقع المستخدم التقريبي: ${JSON.stringify(userLocation || 'غير محدد')}
المحطات القريبة المتاحة: ${JSON.stringify(stationsContext || [])}
سؤال أو طلب المستخدم: "${message}"

جاوب بأسلوب "مُعين" الودود والجدع باللهجة المصرية مع تقديم النصيحة المباشرة عن المحطة والزحمة والمسافة وإرشادات السلامة.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: MOEIN_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'تمام يا فندم، أنا معاك خطوة بخطوة على الطريق!';
    res.json({ reply });
  } catch (error: any) {
    console.error('Error in Moein chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process AI response',
      fallback: 'يا باشا معاك مُعين، في ضغط بسيط في الشبكة بس الخريطة ومحطات كارجاس وعربية غاز شغالة معاك تمام!'
    });
  }
});

// Human Lifelike Voice Generator (Moein Human Egyptian Voice)
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!ai) {
      return res.json({ available: false });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: text.trim() }],
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        available: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    }

    res.json({ available: false });
  } catch (error) {
    console.warn('Server TTS unavailable, will fallback to client neural voice:', error);
    res.json({ available: false });
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
