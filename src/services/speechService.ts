// Egyptian Arabic Speech Service - Shakir Voice Engine (صوت شاكر المصري الطبيعي فقط)
// Robotic female voice is strictly prohibited and permanently blocked.

class SpeechService {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private audioCache: Map<string, string> = new Map();
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-unlock audio on first user touch or click
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
          // Silent HTML5 audio tick to unlock iOS / Chrome Audio policy
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
          silentAudio.play().then(() => {
            silentAudio.pause();
            this.isAudioUnlocked = true;
          }).catch(() => {});
        } catch {}
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

      // Cancel and kill any potential browser robotic synthesis if left active
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
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

  // Speak exclusively with Shakir's Natural Egyptian Human Voice (ar-EG-ShakirNeural)
  // NEVER accesses or falls back to any robotic female voice
  public async speak(text: string, options?: { priority?: boolean; rate?: number }) {
    if (this.isMuted || !text) return;

    if (options?.priority) {
      this.stop();
    }

    const cleanedText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanedText) return;

    // Check memory cache for instant playback
    const cachedAudio = this.audioCache.get(cleanedText);
    if (cachedAudio) {
      this.playAudioUrl(cachedAudio);
      return;
    }

    // Fetch Shakir's Natural Neural Egyptian Voice from server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.available && data.audioBase64) {
          const audioUrl = `data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`;
          // Cache up to 40 frequent phrases
          if (this.audioCache.size > 40) {
            const firstKey = this.audioCache.keys().next().value;
            if (firstKey) this.audioCache.delete(firstKey);
          }
          this.audioCache.set(cleanedText, audioUrl);
          this.playAudioUrl(audioUrl);
          return;
        }
      }
    } catch (err) {
      // If network fails, do NOT fallback to any robotic voice!
      console.warn('Shakir voice generation unavailable, strictly blocking any robotic female voice.', err);
    }
  }

  private playAudioUrl(url: string) {
    if (this.isMuted) return;
    this.stop();

    try {
      const audio = new Audio(url);
      this.currentAudioElement = audio;
      audio.play().catch((err) => {
        console.warn('Audio play restricted by browser policy:', err);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public stop() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    // Ensure browser robotic synthesis is permanently killed if anything triggered it
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const speechService = new SpeechService();
