/**
 * 3DWorld Hero Experience Controller
 * Apple-Calibrated Canvas Rendering, GSAP ScrollTrigger Scrubbing, and Story Synchronization
 */

class HeroController {
  constructor() {
    this.canvas = document.getElementById('hero-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('hero-pin');
    this.scrollSection = document.getElementById('hero-scroll-container');

    // Desktop cinematic 1080p sequence uses DPR = 1
    this.dpr = 1;

    // Frame tracking (maintain last successfully rendered frame)
    this.currentGlobalFrame = 0;
    this.lastDrawnFrame = -1;
    this.lastRenderedImage = null;

    // Coordinate & scale tracking
    this.targetShiftX = 0;
    this.currentShiftX = 0;
    this.targetShiftY = 0;
    this.currentShiftY = 0;
    this.scaleProgress = 1.0;

    this.lastRenderedShiftX = 0;
    this.lastRenderedShiftY = 0;
    this.lastRenderedScale = 1.0;

    // Priority 2: Safe initial progress calculation for page reload mid-scroll
    const initialProgress = this.calculateInitialProgress();
    this.targetProgress = initialProgress;
    this.smoothProgress = initialProgress;
    this.smoothFactor = 0.12; // Tunable smoothing factor (0.10 - 0.15)

    this.cssWidth = 0;
    this.cssHeight = 0;
    this.aspectRatio = 1920 / 1080;

    this.needsRedraw = true;
    this.rafId = null;
    this.resizeTimeout = null;

    // Priority 1: Initialize sequence loader with WebP format
    this.loader = new SequenceLoader({
      extension: 'webp',
      onInitialReady: (frameImg, frameIndex) => {
        this.onFirstFrameReady(frameImg, frameIndex);
      },
      onFrameLoaded: (index) => {
        if (index === this.currentGlobalFrame) {
          this.needsRedraw = true;
        }
      }
    });

    this.init();
  }

  /**
   * Calculate initial scroll progress if page is refreshed while scrolled
   */
  calculateInitialProgress() {
    if (typeof window === 'undefined') return 0;
    const scrollSection = document.getElementById('hero-scroll-container');
    if (!scrollSection) return 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    if (scrollY <= 0) return 0;
    const maxScroll = Math.max(1, scrollSection.offsetHeight - window.innerHeight);
    return Math.max(0, Math.min(1, scrollY / maxScroll));
  }

  async init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.handleResize(), { passive: true });

    // Initial story calculation for the current progress
    this.updateStory(this.smoothProgress);

    // Single persistent RAF loop
    this.startLoop();

    // Priority 2: Preload initial frames centered around the current scroll frame
    await this.loader.init(this.currentGlobalFrame);

    // Setup ScrollTrigger
    this.setupScrollTrigger();
  }

  onFirstFrameReady(frameImg, frameIndex) {
    const loaderPill = document.getElementById('hero-loader-pill');
    if (loaderPill) {
      loaderPill.classList.add('loaded');
      setTimeout(() => {
        if (loaderPill && loaderPill.parentNode) {
          loaderPill.remove();
        }
      }, 400);
    }
    if (frameImg) {
      this.lastRenderedImage = frameImg;
      if (typeof frameIndex === 'number') {
        this.lastDrawnFrame = frameIndex;
      }
    }
    this.needsRedraw = true;
  }

  /**
   * Priority 4: Debounced resize handler to prevent layout thrashing
   */
  handleResize() {
    this.resizeCanvas();
    this.needsRedraw = true;

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }, 150);
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.cssWidth = Math.max(rect.width, window.innerWidth);
    this.cssHeight = Math.max(rect.height, window.innerHeight);

    const targetWidth = Math.round(this.cssWidth * this.dpr);
    const targetHeight = Math.round(this.cssHeight * this.dpr);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.canvas.style.width = `${this.cssWidth}px`;
      this.canvas.style.height = `${this.cssHeight}px`;

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'medium';

      this.needsRedraw = true;
    }
  }

  /**
   * Single persistent requestAnimationFrame loop
   */
  startLoop() {
    const tick = () => {
      const delta = this.targetProgress - this.smoothProgress;

      if (Math.abs(delta) > 0.00001) {
        this.smoothProgress += delta * this.smoothFactor;

        if (Math.abs(this.targetProgress - this.smoothProgress) < 0.00005) {
          this.smoothProgress = this.targetProgress;
        }

        this.updateStory(this.smoothProgress);
      }

      if (this.needsRedraw) {
        this.render();
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Synchronizes targetFrame, shiftX, shiftY, and scale from smoothProgress
   */
  updateStory(p) {
    let targetFrame = 0;
    let shiftX = 0;
    let shiftY = 0;
    let scale = 1.0;

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // BEAT 1: Hero Intro (0.00 - 0.16)
    if (p <= 0.16) {
      targetFrame = 0;
      shiftX = 0;
      shiftY = 85;
    }
    // BEAT 2: Figure Separation (0.16 - 0.44)
    else if (p > 0.16 && p <= 0.44) {
      const t = (p - 0.16) / (0.44 - 0.16);
      targetFrame = Math.min(47, Math.floor(t * 48));
      const maxLeftShift = -window.innerWidth * 0.11;
      shiftX = maxLeftShift * easeInOut(t);
      shiftY = 85 * (1 - easeInOut(t));
    }
    // BEAT 3: Exploded Hold (0.44 - 0.54)
    else if (p > 0.44 && p <= 0.54) {
      targetFrame = 47;
      shiftX = -window.innerWidth * 0.11;
      shiftY = 0;
    }
    // BEAT 4: Printer Reveal (0.54 - 0.82)
    else if (p > 0.54 && p <= 0.82) {
      const t = (p - 0.54) / (0.82 - 0.54);
      targetFrame = 48 + Math.min(47, Math.floor(t * 48));
      const startShift = -window.innerWidth * 0.11;
      const endShift = window.innerWidth * 0.03;
      shiftX = startShift + (endShift - startShift) * easeInOut(t);
      shiftY = 0;
    }
    // BEAT 5: Final Settled State (0.82 - 0.96)
    else if (p > 0.82 && p <= 0.96) {
      targetFrame = 95;
      shiftX = window.innerWidth * 0.03;
      shiftY = 0;
    }
    // Release Transition (0.96 - 1.00)
    else {
      targetFrame = 95;
      shiftX = window.innerWidth * 0.03;
      shiftY = 0;
      const exitT = (p - 0.96) / 0.04;
      scale = 1.0 - (0.03 * exitT);
    }

    // Only update cache window when targetFrame !== currentGlobalFrame
    const frameChanged = targetFrame !== this.currentGlobalFrame;
    if (frameChanged) {
      const prevFrame = this.currentGlobalFrame;
      this.currentGlobalFrame = targetFrame;
      const direction = targetFrame >= prevFrame ? 1 : -1;
      this.loader.updateWindow(targetFrame, direction);
    }

    this.currentShiftX = shiftX;
    this.currentShiftY = shiftY;
    this.scaleProgress = scale;

    // Compare against last rendered values so small movements accumulate
    const shiftChanged =
      Math.abs(shiftX - this.lastRenderedShiftX) > 0.05 ||
      Math.abs(shiftY - this.lastRenderedShiftY) > 0.05;
    const scaleChanged = Math.abs(scale - this.lastRenderedScale) > 0.0005;

    if (frameChanged || shiftChanged || scaleChanged) {
      this.needsRedraw = true;
    }
  }

  /**
   * Render frame onto canvas with subpixel floating-point coordinates
   */
  render() {
    const img = this.loader.getFrame(this.currentGlobalFrame);
    if (img) {
      this.lastRenderedImage = img;
      this.lastDrawnFrame = this.currentGlobalFrame;
    }

    const imageToDraw = img || this.lastRenderedImage;
    if (!imageToDraw) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Cover scale calculation with safety bleed margin
    const shiftBleed = (Math.abs(this.currentShiftX * this.dpr) + 60) * 2;
    const baseScale = Math.max(w / 1920, h / 1080);
    const shiftScale = (w + shiftBleed) / 1920;
    const scale = Math.max(baseScale, shiftScale) * this.scaleProgress;

    // Floating-point coordinates
    const drawW = 1920 * scale;
    const drawH = 1080 * scale;
    const drawX = (w - drawW) * 0.5 + (this.currentShiftX * this.dpr);
    const drawY = (h - drawH) * 0.5 + (this.currentShiftY * this.dpr);

    // Clear canvas only if image bounds do not completely cover canvas
    if (drawX > 0 || drawY > 0 || (drawX + drawW) < w || (drawY + drawH) < h) {
      ctx.clearRect(0, 0, w, h);
    }

    // Draw image bitmap
    ctx.drawImage(imageToDraw, drawX, drawY, drawW, drawH);

    this.lastRenderedShiftX = this.currentShiftX;
    this.lastRenderedShiftY = this.currentShiftY;
    this.lastRenderedScale = this.scaleProgress;
    this.needsRedraw = false;
  }

  /**
   * Master ScrollTrigger measures progress only.
   */
  setupScrollTrigger() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[HeroController] GSAP or ScrollTrigger not loaded');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Master ScrollTrigger on 320vh container
    ScrollTrigger.create({
      trigger: this.scrollSection,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        this.targetProgress = self.progress;
      }
    });

    // Synchronize text overlay transitions
    this.setupTextBeatTransitions();
  }

  /**
   * Preserve existing GSAP text beat transitions
   */
  setupTextBeatTransitions() {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: this.scrollSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.35
      }
    });

    const beat1 = '#hero-beat-1';
    const beat2 = '#hero-beat-2';
    const beat3 = '#hero-beat-3';
    const beat4 = '#hero-beat-4';
    const beat5 = '#hero-beat-5';
    const bgWordmark = '#hero-bg-wordmark';
    const scrollPrompt = '#hero-scroll-prompt';

    // Timeline duration 100
    tl
      // Beat 1: Intro (0 -> 16)
      .to(beat1, { opacity: 1, y: 0, duration: 1 }, 0)
      .to(bgWordmark, { opacity: 0.04, duration: 1 }, 0)
      .to(scrollPrompt, { opacity: 0, y: 12, duration: 2 }, 4)
      .to(beat1, { opacity: 0, y: -26, duration: 3 }, 13)
      .to(bgWordmark, { opacity: 0.01, y: -24, duration: 3 }, 14)

      // Beat 2: Figure Separation (18 -> 42)
      .fromTo(beat2, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 3 }, 18)
      .to(beat2, { opacity: 0, y: -20, duration: 2.5 }, 41)

      // Beat 3: Exploded Hold (44 -> 53)
      .fromTo(beat3, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 2.5 }, 44)
      .to(beat3, { opacity: 0, y: -20, duration: 2.5 }, 52)

      // Beat 4: Printer Reveal (55 -> 80)
      .fromTo(beat4, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 3 }, 55)
      .to(beat4, { opacity: 0, y: -20, duration: 2.5 }, 78)

      // Beat 5: Final Settled State (81 -> 96)
      .fromTo(beat5, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 3 }, 81)
      .to(beat5, { opacity: 0, y: -16, duration: 3 }, 94)

      // Seamless background blend to #F5F5F7
      .to('#hero-pin', { backgroundColor: '#F5F5F7', duration: 6 }, 92);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.heroController = new HeroController();
});
