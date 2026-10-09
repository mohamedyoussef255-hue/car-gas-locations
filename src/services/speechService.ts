// Human Arabic Speech Service - Natural Male Voice Engine (صوت رجل بشري طبيعي وسريع باللغة العربية)

class SpeechService {
  private isMuted: boolean = false;
  private speechRate: number = 1.25; // Speaks faster (1.25x default speed as requested)
  private audioCtx: AudioContext | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private audioCache: Map<string, string> = new Map();
  private isAudioUnlocked: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-unlock audio on user interaction
      const unlockAudio = () => {
        if (this.isAudioUnlocked) return;
        try {
          if (!this.audioCtx) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
          // Silent tick
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
          silentAudio.play().then(() => {
            silentAudio.pause();
            this.isAudioUnlocked = true;
          }).catch(() => {});
        } catch {}
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });

      // Cache voices when browser loads them
      if ('speechSynthesis' in window) {
        const updateVoices = () => {
          try {
            this.availableVoices = window.speechSynthesis.getVoices();
          } catch {}
        };
        updateVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = updateVoices;
        }
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.8, Math.min(2.0, rate));
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  // Play navigation subtle chime
  public playChime(type: 'turn' | 'arrive' | 'alert' = 'turn') {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      if (type === 'turn') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'arrive') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.25); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // AudioContext handled gracefully
    }
  }

  // Speak with Natural Human Male Arabic Voice (صوت رجل بشري طبيعي وسريع)
  public async speak(text: string, options?: { priority?: boolean; rate?: number; voice?: string }) {
    if (this.isMuted || !text) return;

    if (options?.priority !== false) {
      this.stop();
    }

    const effectiveRate = options?.rate || this.speechRate;

    const cleanedText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanedText) return;

    // Check memory cache for instant playback
    const cachedAudio = this.audioCache.get(cleanedText);
    if (cachedAudio) {
      this.playAudioUrl(cachedAudio, effectiveRate);
      return;
    }

    // Tier 1: Fetch Natural Human Male Arabic Voice from server endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: cleanedText,
          voice: options?.voice || 'male'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.available && data.audioBase64) {
          // Detect actual format from base64 header bytes (MP3 starts with /v/ or // while WAV starts with UklG)
          let detectedMime = data.mimeType || 'audio/mp3';
          if (data.audioBase64.startsWith('UklG')) {
            detectedMime = 'audio/wav';
          } else if (data.audioBase64.startsWith('//') || data.audioBase64.startsWith('/+')) {
            detectedMime = 'audio/mp3';
          }
          const audioUrl = `data:${detectedMime};base64,${data.audioBase64}`;
          if (this.audioCache.size > 80) {
            const firstKey = this.audioCache.keys().next().value;
            if (firstKey) this.audioCache.delete(firstKey);
          }
          this.audioCache.set(cleanedText, audioUrl);
          const played = await this.playAudioUrl(audioUrl, effectiveRate);
          if (played) return;
        }
      }
    } catch (err) {
      console.warn('Server TTS fetch failed, trying direct browser fallbacks:', err);
    }

    // Tier 2: Direct Google Human Arabic Audio link with speed boost
    try {
      const firstPhrase = cleanedText.length > 120 
        ? cleanedText.slice(0, 120).replace(/ [^ ]*$/, '') 
        : cleanedText;
      const directAudioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(firstPhrase)}&tl=ar&client=tw-ob`;
      const played = await this.playAudioUrl(directAudioUrl, effectiveRate);
      if (played) return;
    } catch {
      // Continue to Tier 3
    }

    // Tier 3: Browser Web Speech API with Male Arabic voice
    this.speakWithWebSpeech(cleanedText, effectiveRate);
  }

  // Fallback Web Speech API
  private speakWithWebSpeech(text: string, rate: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = Math.min(1.4, Math.max(0.9, rate));
      utterance.pitch = 0.85;

      const voices = this.availableVoices.length > 0 ? this.availableVoices : window.speechSynthesis.getVoices();
      const maleVoice = voices.find(v => 
        (v.lang.startsWith('ar') || v.lang.includes('ar-')) && 
        (v.name.toLowerCase().includes('male') || 
         v.name.includes('Maged') || 
         v.name.includes('Tarik') || 
         v.name.includes('Naayf') ||
         v.name.includes('Hamed') ||
         v.name.includes('Shakir'))
      ) || voices.find(v => v.lang.startsWith('ar') || v.lang.includes('ar-'));

      if (maleVoice) {
        utterance.voice = maleVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  private playAudioUrl(url: string, rate?: number): Promise<boolean> {
    if (this.isMuted) return Promise.resolve(false);
    this.stop();

    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        const effectiveRate = rate || this.speechRate;
        audio.playbackRate = effectiveRate;
        audio.defaultPlaybackRate = effectiveRate;
        this.currentAudioElement = audio;

        // Resume suspended AudioContext if present
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        audio.onended = () => {
          this.currentAudioElement = null;
        };

        audio.onerror = () => {
          console.warn('Audio element error playing URL, falling back');
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audio.playbackRate = effectiveRate;
              resolve(true);
            })
            .catch((err) => {
              console.warn('Audio play restricted by browser policy:', err);
              const playOnUserTap = () => {
                audio.playbackRate = effectiveRate;
                audio.play().catch(() => {});
                window.removeEventListener('click', playOnUserTap);
                window.removeEventListener('touchstart', playOnUserTap);
              };
              window.addEventListener('click', playOnUserTap, { once: true, passive: true });
              window.addEventListener('touchstart', playOnUserTap, { once: true, passive: true });
              resolve(false);
            });
        } else {
          resolve(true);
        }
      } catch (e) {
        console.warn('Audio play error:', e);
        resolve(false);
      }
    });
  }

  public stop() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const speechService = new SpeechService();
