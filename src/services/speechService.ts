// Egyptian Arabic Speech Service - Human Voice Engine (Moein)

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
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

  // Play subtle navigation chime using Web Audio API
  public playChime(type: 'turn' | 'arrive' | 'alert' = 'turn') {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }
      if (!this.audioCtx) return;

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

  // Speak with human voice (Server TTS with instant Client Neural Voice fallback)
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

    // Try server human voice first (with short timeout so no lag)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

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
          const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
          const audio = new Audio(audioUrl);
          this.currentAudioElement = audio;
          audio.play().catch(() => {
            // If autoplay was blocked, fallback to speech synthesis
            this.speakWithSpeechSynthesis(cleanedText, options);
          });
          return;
        }
      }
    } catch {
      // Network timeout or error -> Proceed immediately to client neural voice
    }

    // High quality client neural voice fallback
    this.speakWithSpeechSynthesis(cleanedText, options);
  }

  private speakWithSpeechSynthesis(text: string, options?: { rate?: number }) {
    if (this.isMuted || !this.synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG'; // Egyptian Arabic
    utterance.rate = options?.rate || 0.96;
    utterance.pitch = 1.02; // Warm friendly tone

    const voices = this.synth.getVoices();
    // Prioritize natural human Egyptian & Arabic neural voices
    const preferredVoice = voices.find(v => 
      (v.lang === 'ar-EG' && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Shakir') || v.name.includes('Salma'))) ||
      v.name.includes('طارق') ||
      v.name.includes('ماجد') ||
      v.name.includes('Tariq') ||
      v.name.includes('Hoda') ||
      v.lang.startsWith('ar')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }
}

export const speechService = new SpeechService();
