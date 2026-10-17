/**
 * 3DWorld Sequence Loader & Memory Manager
 * Concurrency-controlled, sliding-window cache for 96 1080p frames across Clip A & Clip B
 */

class SequenceLoader {
  constructor(options = {}) {
    this.totalGroupFrames = 48;
    this.totalFrames = 96; // 48 Clip A + 48 Clip B

    // Requirement 16 & Priority 1: Configurable format extension (defaults to 'webp')
    this.extension = options.extension || 'webp';
    this.urls = [];

    // Memory & Sliding-window cache configuration
    this.windowAhead = options.windowAhead !== undefined ? options.windowAhead : 12;
    this.windowBehind = options.windowBehind !== undefined ? options.windowBehind : 6;
    this.maxCacheSize = options.maxCacheSize !== undefined ? options.maxCacheSize : 26;

    // Concurrency control
    this.maxConcurrentLoads = options.maxConcurrentLoads !== undefined ? options.maxConcurrentLoads : 4;

    // Cache and state tracking
    this.currentFrame = 0;
    this.cache = new Map(); // globalIndex -> HTMLImageElement (fully loaded and decoded)
    this.activeLoading = new Set(); // Set of indices currently loading or decoding
    this.loadQueue = []; // Prioritized queue of frame indices awaiting load
    this.pendingResolvers = new Map(); // globalIndex -> Array<resolveFunction>

    // Protected anchor frames that should never be evicted normally
    this.anchorFrames = new Set([0, 47, 48, 95]);

    this.onInitialReady = options.onInitialReady || (() => {});
    this.onFrameLoaded = options.onFrameLoaded || (() => {});

    this.buildUrlList();
    this.checkContinuity();
  }

  /**
   * Centralized frame URL builder
   */
  getFrameUrl(group, frameNumber) {
    const num = String(frameNumber).padStart(3, '0');
    const folder = group === 'A' ? 'clip-a' : 'clip-b';
    return `/frames/${folder}/ezgif-frame-${num}.${this.extension}`;
  }

  /**
   * Build URL manifest for Clip A (0..47) and Clip B (48..95)
   */
  buildUrlList() {
    this.urls = [];
    // Group A: 0..47 (Frames 1..48)
    for (let i = 1; i <= this.totalGroupFrames; i++) {
      this.urls.push({
        group: 'A',
        localIndex: i - 1,
        globalIndex: i - 1,
        url: this.getFrameUrl('A', i)
      });
    }
    // Group B: 48..95 (Frames 1..48)
    for (let i = 1; i <= this.totalGroupFrames; i++) {
      const globalIdx = this.totalGroupFrames + (i - 1);
      this.urls.push({
        group: 'B',
        localIndex: i - 1,
        globalIndex: globalIdx,
        url: this.getFrameUrl('B', i)
      });
    }
  }

  /**
   * Visual continuity check warning between Clip A and Clip B
   */
  checkContinuity() {
    console.info(
      '[SequenceLoader] Continuity Check: Ensure Clip A frame 48 and Clip B frame 1 ' +
      'visually match in camera angle, subject position, scale, lighting, and background ' +
      'to avoid an abrupt visual pop at the Beat 3 -> Beat 4 transition (global frames 47 -> 48).'
    );
  }

  /**
   * Check if a frame index is stale relative to the active target frame
   */
  isIndexStale(index) {
    if (this.anchorFrames.has(index)) return false;
    const dist = Math.abs(index - this.currentFrame);
    const maxAllowedDist = Math.max(this.windowAhead, this.windowBehind) + 4;
    return dist > maxAllowedDist;
  }

  /**
   * Improved initial preload supporting reload at any scroll position (Priority 2)
   */
  async init(startFrame = 0) {
    this.currentFrame = Math.max(0, Math.min(this.totalFrames - 1, startFrame));

    // 1. Preload initial batch centered around startFrame
    const initialPromises = [];
    if (this.currentFrame === 0) {
      // Opening sequence: frames 0 through 12
      for (let i = 0; i <= 12; i++) {
        initialPromises.push(this.loadFrame(i));
      }
    } else {
      // Mid-scroll reload: prioritize currentFrame first, then immediate neighbors
      initialPromises.push(this.loadFrame(this.currentFrame));
      for (let i = 1; i <= 6; i++) {
        if (this.currentFrame + i < this.totalFrames) {
          initialPromises.push(this.loadFrame(this.currentFrame + i));
        }
        if (this.currentFrame - i >= 0) {
          initialPromises.push(this.loadFrame(this.currentFrame - i));
        }
      }
    }

    // Always ensure frame 0 is available for fallback
    if (!this.cache.has(0)) {
      initialPromises.push(this.loadFrame(0));
    }

    // Wait until initial batch is loaded and decoded
    await Promise.all(initialPromises);

    // 2. Notify controller that the target frame is ready to display
    const readyFrame = this.cache.get(this.currentFrame) || this.cache.get(0);
    this.onInitialReady(readyFrame, this.currentFrame);

    // 3. Queue high-priority anchor frames in background
    const anchors = [47, 48, 95];
    anchors.forEach(idx => {
      if (!this.cache.has(idx) && !this.activeLoading.has(idx)) {
        this.loadFrame(idx);
      }
    });

    // 4. Progressively warm up sliding window around currentFrame
    this.updateWindow(this.currentFrame, 1);
  }

  /**
   * Asynchronously load and decode an image at global index
   */
  loadFrame(index) {
    if (index < 0 || index >= this.totalFrames) {
      return Promise.resolve(null);
    }

    // Return cached image if ready
    if (this.cache.has(index)) {
      const cached = this.cache.get(index);
      if (cached.complete && cached.naturalWidth > 0) {
        return Promise.resolve(cached);
      }
    }

    return new Promise((resolve) => {
      if (!this.pendingResolvers.has(index)) {
        this.pendingResolvers.set(index, []);
      }
      this.pendingResolvers.get(index).push(resolve);

      // Prioritize this index in the load queue if not currently active
      if (!this.activeLoading.has(index)) {
        const qIdx = this.loadQueue.indexOf(index);
        if (qIdx > -1) {
          this.loadQueue.splice(qIdx, 1);
        }
        this.loadQueue.unshift(index);
        this.processQueue();
      }
    });
  }

  /**
   * Concurrency manager: processes queued frame requests up to maxConcurrentLoads
   */
  processQueue() {
    while (this.activeLoading.size < this.maxConcurrentLoads && this.loadQueue.length > 0) {
      const nextIndex = this.loadQueue.shift();
      if (this.cache.has(nextIndex) || this.activeLoading.has(nextIndex)) {
        continue;
      }
      this.startImageLoad(nextIndex);
    }
  }

  /**
   * Initiate image load with stale discard & explicit decode (Priority 3)
   */
  startImageLoad(index) {
    this.activeLoading.add(index);
    const item = this.urls[index];
    if (!item) {
      this.activeLoading.delete(index);
      this.resolvePending(index, null);
      this.processQueue();
      return;
    }

    const img = new Image();
    img.decoding = 'async';

    img.onload = async () => {
      // Discard stale in-flight results before expensive decode
      if (this.isIndexStale(index)) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        this.activeLoading.delete(index);
        this.resolvePending(index, null);
        this.processQueue();
        return;
      }

      // Explicitly decode the bitmap before committing to cache
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch (err) {
        // Gracefully handle decode rejection
      }

      // Re-check staleness after asynchronous decode
      if (this.isIndexStale(index)) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        this.activeLoading.delete(index);
        this.resolvePending(index, null);
        this.processQueue();
        return;
      }

      this.cache.set(index, img);
      this.activeLoading.delete(index);
      this.resolvePending(index, img);
      this.onFrameLoaded(index, img);

      // Trigger next queued load
      this.processQueue();
    };

    img.onerror = () => {
      this.activeLoading.delete(index);
      this.resolvePending(index, null);
      this.processQueue();
    };

    img.src = item.url;
  }

  /**
   * Resolve any awaiting promises for a loaded frame
   */
  resolvePending(index, result) {
    if (this.pendingResolvers.has(index)) {
      const resolvers = this.pendingResolvers.get(index);
      this.pendingResolvers.delete(index);
      resolvers.forEach(res => res(result));
    }
  }

  /**
   * Updates sliding window around current frame
   * Cleans stale queued items and prioritizes frames in the direction of scroll.
   */
  updateWindow(currentFrame, direction = 1) {
    this.currentFrame = currentFrame;

    // 1. Evict far frames to keep cache size within maxCacheSize
    this.evictCache(currentFrame);

    // 2. Discard stale items from existing loadQueue
    this.loadQueue = this.loadQueue.filter(idx => !this.isIndexStale(idx));

    // 3. Build prioritized desired frames list
    const desired = [];

    // Priority 1: Exact target frame
    desired.push(currentFrame);

    // Priority 2 & 3: Direction-aware window
    if (direction >= 0) {
      // Forward scroll: prioritize upcoming frames ahead
      for (let i = 1; i <= this.windowAhead; i++) {
        const idx = currentFrame + i;
        if (idx < this.totalFrames) desired.push(idx);
      }
      for (let i = 1; i <= this.windowBehind; i++) {
        const idx = currentFrame - i;
        if (idx >= 0) desired.push(idx);
      }
    } else {
      // Backward scroll: prioritize frames behind
      for (let i = 1; i <= this.windowBehind; i++) {
        const idx = currentFrame - i;
        if (idx >= 0) desired.push(idx);
      }
      for (let i = 1; i <= this.windowAhead; i++) {
        const idx = currentFrame + i;
        if (idx < this.totalFrames) desired.push(idx);
      }
    }

    // Priority 4: Background anchor frames
    for (const anchor of this.anchorFrames) {
      if (!desired.includes(anchor)) {
        desired.push(anchor);
      }
    }

    // Filter to frames needing load (not already in cache or active loading)
    const needed = desired.filter(idx => !this.cache.has(idx) && !this.activeLoading.has(idx));

    // Rebuild loadQueue: prioritized needed frames first, followed by valid existing items
    const newQueue = [...needed];
    for (const idx of this.loadQueue) {
      if (!newQueue.includes(idx) && !this.cache.has(idx) && !this.activeLoading.has(idx)) {
        newQueue.push(idx);
      }
    }
    this.loadQueue = newQueue;

    // Start loading queue
    this.processQueue();
  }

  /**
   * Cache eviction: removes frames farthest from currentFrame
   * Anchors and currently loading frames are strictly protected.
   */
  evictCache(currentFrame) {
    if (this.cache.size <= this.maxCacheSize) return;

    // Candidate keys for eviction
    const candidates = Array.from(this.cache.keys()).filter(
      k => !this.anchorFrames.has(k) && !this.activeLoading.has(k)
    );

    // Sort descending by distance from currentFrame (farthest first)
    candidates.sort((a, b) => Math.abs(b - currentFrame) - Math.abs(a - currentFrame));

    while (this.cache.size > this.maxCacheSize && candidates.length > 0) {
      const evictKey = candidates.shift();
      const img = this.cache.get(evictKey);
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
      this.cache.delete(evictKey);
    }
  }

  /**
   * Retrieves frame image without nearest-neighbor jumping
   */
  getFrame(index) {
    const exact = this.cache.get(index);
    if (exact && exact.complete && exact.naturalWidth > 0) {
      return exact;
    }

    // Queue missing frame load immediately if not already active
    if (!this.activeLoading.has(index)) {
      const qIdx = this.loadQueue.indexOf(index);
      if (qIdx > -1) {
        this.loadQueue.splice(qIdx, 1);
      }
      this.loadQueue.unshift(index);
      this.processQueue();
    }

    // Return null to prevent jumping to arbitrary neighbor frames
    return null;
  }
}

if (typeof module !== 'undefined') {
  module.exports = SequenceLoader;
}
