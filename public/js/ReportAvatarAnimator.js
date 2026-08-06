/**
 * ReportAvatarAnimator — Image Sequence Character Animator for Report Assistant
 * 
 * Preloads frames from avatar-manifest.json and handles idle, listening, thinking,
 * and speaking states cleanly with reduced-motion and missing-image support.
 */
export class ReportAvatarAnimator {
  constructor({ containerEl, manifestPath = 'public/assets/report-assistant/avatar-manifest.json' }) {
    this.containerEl = containerEl;
    this.manifestPath = manifestPath;
    this.imgEl = null;
    this.manifest = null;
    this.currentState = 'idle';
    this.currentFrameIndex = 0;
    this.animationTimer = null;
    this.preloadedImages = new Map();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  async init() {
    if (!this.containerEl) return;

    // Create img element inside container if not present
    this.imgEl = this.containerEl.querySelector('img');
    if (!this.imgEl) {
      this.imgEl = document.createElement('img');
      this.imgEl.className = 'report-avatar-image';
      this.imgEl.alt = 'Assistant Rapport Team Pulse';
      this.containerEl.appendChild(this.imgEl);
    }

    try {
      const res = await fetch(this.manifestPath);
      if (res.ok) {
        this.manifest = await res.json();
        this.preloadAll();
      }
    } catch (e) {
      console.warn('[ReportAvatarAnimator] Failed to load manifest, using fallback placeholder:', e);
    }

    // Default fallback image
    if (!this.imgEl.src) {
      this.imgEl.src = 'public/assets/report-assistant/placeholder-avatar.svg';
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.currentState === 'speaking') {
        this.startSpeakingLoop();
      }
    });

    this.updateDisplay();
  }

  preloadAll() {
    if (!this.manifest) return;
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

    if (newState === 'speaking' && !this.reducedMotion && !document.hidden) {
      this.startSpeakingLoop();
    } else {
      this.stopLoop();
      this.updateDisplay();
    }
  }

  startSpeakingLoop() {
    this.stopLoop();
    const fps = (this.manifest && this.manifest.fps) ? this.manifest.fps : 12;
    const interval = Math.max(40, 1000 / fps);

    this.animationTimer = setInterval(() => {
      const frames = (this.manifest && Array.isArray(this.manifest.speaking) && this.manifest.speaking.length > 0)
        ? this.manifest.speaking
        : ['public/assets/report-assistant/placeholder-avatar.svg'];

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
      frames = ['public/assets/report-assistant/placeholder-avatar.svg'];
    }

    const index = Math.min(this.currentFrameIndex, frames.length - 1);
    const targetSrc = frames[index] || 'public/assets/report-assistant/placeholder-avatar.svg';

    if (this.imgEl.getAttribute('src') !== targetSrc) {
      this.imgEl.src = targetSrc;
    }
  }
}
