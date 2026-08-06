/**
 * ReportAvatarAnimator — Image Sequence Character Animator for Report Assistant
 * 
 * Preloads WebP frames from avatar-manifest.json and handles idle, listening, thinking,
 * and speaking states with reduced-motion and image-load error resilience.
 */
export class ReportAvatarAnimator {
  constructor({ containerEl, imgEl, manifestPath = 'public/assets/report-assistant/avatar-manifest.json' }) {
    this.containerEl = containerEl;
    this.imgEl = imgEl || null;
    this.manifestPath = manifestPath;
    this.manifest = null;
    this.currentState = 'idle';
    this.currentFrameIndex = 0;
    this.animationTimer = null;
    this.preloadedImages = new Map();
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    this.init();
  }

  async init() {
    if (!this.imgEl && this.containerEl && typeof this.containerEl.querySelector === 'function') {
      this.imgEl = this.containerEl.querySelector('img');
    }
    if (!this.imgEl && typeof document !== 'undefined' && typeof document.createElement === 'function') {
      this.imgEl = document.createElement('img');
      this.imgEl.className = 'report-avatar-image';
      this.imgEl.alt = 'Assistant Rapport Team Pulse';
      if (this.containerEl && typeof this.containerEl.appendChild === 'function') {
        this.containerEl.appendChild(this.imgEl);
      }
    }

    if (this.imgEl) {
      this.imgEl.onerror = () => {
        if (this.imgEl.getAttribute('src') !== 'public/assets/report-assistant/idle.webp') {
          this.imgEl.src = 'public/assets/report-assistant/idle.webp';
        }
      };
    }

    try {
      if (typeof fetch === 'function') {
        const res = await fetch(this.manifestPath);
        if (res.ok) {
          this.manifest = await res.json();
          this.preloadAll();
        }
      }
    } catch (e) {
      console.warn('[ReportAvatarAnimator] Failed to load manifest, using default assets:', e.message);
    }

    // Default fallback image
    if (this.imgEl && (!this.imgEl.src || this.imgEl.src.endsWith('placeholder-avatar.svg'))) {
      this.imgEl.src = 'public/assets/report-assistant/idle.webp';
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopLoop();
        } else if (this.currentState === 'speaking' && !this.reducedMotion) {
          this.startSpeakingLoop();
        }
      });
    }

    this.updateDisplay();
  }

  preloadAll() {
    if (!this.manifest || typeof Image === 'undefined') return;
    const states = ['idle', 'listening', 'thinking', 'speaking'];
    states.forEach(state => {
      const frames = this.manifest[state];
      if (Array.isArray(frames)) {
        frames.forEach(src => {
          if (!this.preloadedImages.has(src)) {
            const img = new Image();
            img.src = src;
            this.preloadedImages.set(src, img);
          }
        });
      }
    });
  }

  setState(newState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.currentFrameIndex = 0;

    const isHidden = (typeof document !== 'undefined' && document.hidden);
    if (newState === 'speaking' && !this.reducedMotion && !isHidden) {
      this.startSpeakingLoop();
    } else {
      this.stopLoop();
      this.updateDisplay();
    }
  }

  startSpeakingLoop() {
    this.stopLoop();
    const fps = (this.manifest && typeof this.manifest.fps === 'number') ? this.manifest.fps : 10;
    const interval = Math.max(40, 1000 / fps);

    this.animationTimer = setInterval(() => {
      const frames = (this.manifest && Array.isArray(this.manifest.speaking) && this.manifest.speaking.length > 0)
        ? this.manifest.speaking
        : ['public/assets/report-assistant/idle.webp'];

      this.currentFrameIndex = (this.currentFrameIndex + 1) % frames.length;
      this.updateDisplay();
    }, interval);
  }

  stopLoop() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  updateDisplay() {
    if (!this.imgEl) return;

    let frames = [];
    if (this.manifest && Array.isArray(this.manifest[this.currentState]) && this.manifest[this.currentState].length > 0) {
      frames = this.manifest[this.currentState];
    } else {
      frames = ['public/assets/report-assistant/idle.webp'];
    }

    // In reduced motion mode for speaking, stick to first speaking frame cleanly
    if (this.currentState === 'speaking' && this.reducedMotion) {
      this.currentFrameIndex = 0;
    }

    const index = Math.min(this.currentFrameIndex, frames.length - 1);
    const targetSrc = frames[index] || 'public/assets/report-assistant/idle.webp';

    if (this.imgEl.getAttribute('src') !== targetSrc) {
      this.imgEl.src = targetSrc;
    }
  }
}
