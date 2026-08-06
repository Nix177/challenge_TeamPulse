/**
 * PcmAudioPlayer — Web Audio API 24kHz PCM Audio Player with Interruption Support
 * 
 * Queues and plays 24kHz 16-bit mono PCM audio returned by Gemini Live.
 * Triggers onStart and onIdle callbacks to drive avatar speaking animations cleanly.
 */
export class PcmAudioPlayer {
  constructor({ onStart, onIdle, sampleRate = 24000 }) {
    this.onStart = onStart;
    this.onIdle = onIdle;
    this.sampleRate = sampleRate;
    this.audioContext = null;
    this.gainNode = null;
    this.scheduledTime = 0;
    this.activeSources = new Set();
    this.isPlaying = false;
    this.volume = 1.0;
    this.isMuted = false;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioContext = new AudioCtx({
        sampleRate: this.sampleRate
      });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  playChunk(base64PcmData) {
    if (!base64PcmData) return;
    this.ensureContext();

    const pcmData = this.base64ToInt16Array(base64PcmData);
    if (pcmData.length === 0) return;

    // Convert Int16 PCM to Float32 AudioBuffer
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.audioContext.currentTime;
    if (this.scheduledTime < now) {
      this.scheduledTime = now;
    }

    const startAt = this.scheduledTime;
    source.start(startAt);
    this.scheduledTime += audioBuffer.duration;

    this.activeSources.add(source);

    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.onStart) {
        this.onStart();
      }
    }

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0 && this.audioContext && this.audioContext.currentTime >= this.scheduledTime - 0.05) {
        this.isPlaying = false;
        if (this.onIdle) {
          this.onIdle();
        }
      }
    };
  }

  stop() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();
    this.scheduledTime = 0;
    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.onIdle) {
        this.onIdle();
      }
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && !this.isMuted) {
      this.gainNode.gain.value = this.volume;
    }
  }

  setMute(muted) {
    this.isMuted = Boolean(muted);
    if (this.gainNode) {
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  base64ToInt16Array(base64) {
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Int16Array(bytes.buffer);
    } catch (e) {
      console.error('[PcmAudioPlayer] Base64 decode error:', e);
      return new Int16Array(0);
    }
  }
}
