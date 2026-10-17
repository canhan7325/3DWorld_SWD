// Tester: browser-level checks. Usage: PORT=3100 node tests/tester_browser.js [section]
// sections: reload | fast | resize | cache | regress | all
const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = `http://localhost:${process.env.PORT || 3100}`;
const section = process.argv[2] || 'all';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const INSTRUMENT = () => {
  window.__draws = [];
  window.__decodes = {};
  window.__rejections = [];
  window.__t0 = performance.now();
  window.addEventListener('unhandledrejection', e => window.__rejections.push(String(e.reason)));
  window.addEventListener('error', e => window.__rejections.push('ERR ' + e.message));
  const od = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img) {
    const m = /clip-([ab])\/ezgif-frame-(\d+)\./.exec(img && img.src || '');
    const g = m ? (m[1] === 'a' ? 0 : 48) + parseInt(m[2], 10) - 1 : -1;
    const hc = window.heroController;
    window.__draws.push({
      t: Math.round(performance.now() - window.__t0), g,
      cur: hc ? hc.currentGlobalFrame : null,
      tp: hc ? +hc.targetProgress.toFixed(4) : null,
      sp: hc ? +hc.smoothProgress.toFixed(4) : null,
      sy: Math.round(window.scrollY)
    });
    return od.apply(this, arguments);
  };
  const dec = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    window.__decodes[this.src] = (window.__decodes[this.src] || 0) + 1;
    return dec.apply(this, arguments);
  };
};

async function launch() {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new',
    args: ['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(INSTRUMENT);
  const ctx = { browser, page, errors: [], reqs: [], bad: [] };
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) ctx.errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => ctx.errors.push('pageerror: ' + e.message));
  page.on('request', r => ctx.reqs.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) ctx.bad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => ctx.bad.push('FAILED ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  return ctx;
}
const maxScroll = page => page.evaluate(() => document.getElementById('hero-scroll-container').offsetHeight - innerHeight);
const frameReqs = ctx => ctx.reqs.filter(u => /\/frames?[^/]*\/.*ezgif-frame/.test(u));
const expectedFrame = p => {
  const e = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; void e;
  if (p <= .16) return 0;
  if (p <= .44) return Math.min(47, Math.floor((p - .16) / .28 * 48));
  if (p <= .54) return 47;
  if (p <= .82) return 48 + Math.min(47, Math.floor((p - .54) / .28 * 48));
  return 95;
};

async function reloadTests() {
  console.log('\n=== MID-SCROLL RELOAD ===');
  const ctx = await launch(); const { page } = ctx;
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const ms = await maxScroll(page);
  for (const pr of [0, 0.25, 0.5, 0.75, 0.985]) {
    ctx.reqs.length = 0; ctx.bad.length = 0; ctx.errors.length = 0;
    await page.evaluate(y => window.scrollTo(0, y), ms * pr);
    await sleep(1500);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1800);
    const st = await page.evaluate(() => {
      const h = window.heroController;
      return { sy: scrollY, tp: h.targetProgress, sp: h.smoothProgress, cur: h.currentGlobalFrame, last: h.lastDrawnFrame,
        draws: window.__draws, rej: window.__rejections,
        cache: h.loader.cache.size, active: h.loader.activeLoading.size, q: h.loader.loadQueue.length, pend: h.loader.pendingResolvers.size };
    });
    const realP = st.sy / ms;
    const exp = expectedFrame(Math.min(1, realP));
    const first = st.draws[0];
    const frame0Draws = st.draws.filter(d => d.g === 0).length;
    const lastDraw = st.draws[st.draws.length - 1];
    const fr = frameReqs(ctx);
    const png = fr.filter(u => u.endsWith('.png')).length;
    const webp = fr.filter(u => u.endsWith('.webp')).length;
    console.log(`p=${pr} scrollY=${st.sy} realP=${realP.toFixed(3)} targetP=${st.tp.toFixed(3)} smoothP=${st.sp.toFixed(3)} curFrame=${st.cur} expected=${exp} lastDrawnG=${lastDraw && lastDraw.g}`);
    console.log(`   firstDraw=${JSON.stringify(first)} frame0Draws=${frame0Draws} totalDraws=${st.draws.length} png=${png} webp=${webp} badResp=${JSON.stringify(ctx.bad)} errs=${JSON.stringify(ctx.errors)} rej=${JSON.stringify(st.rej)}`);
    console.log(`   cache=${st.cache} active=${st.active} queue=${st.q} pending=${st.pend}`);
    const flash = exp !== 0 && st.draws.some(d => d.g === 0);
    console.log(`   => ${(Math.abs(st.tp - realP) < 0.01 && Math.abs(st.sp - st.tp) < 0.01 && st.cur === exp && lastDraw.g === exp && !flash && png === 0) ? 'OK' : 'ISSUE'} flashFrame0=${flash}`);
    if (st.draws.length < 40) console.log('   draws:', st.draws.map(d => `${d.t}ms g${d.g}/c${d.cur} sp${d.sp}`).join(' | '));
    else console.log('   first 8 draws:', st.draws.slice(0, 8).map(d => `${d.t}ms g${d.g}/c${d.cur} tp${d.tp} sp${d.sp}`).join(' | '));
  }
  await ctx.browser.close();
}

async function reload2() {
  console.log('\n=== RELOAD REPEAT (flakiness) ===');
  for (const cacheOff of [false, true]) {
    const ctx = await launch(); const { page } = ctx;
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: cacheOff });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await sleep(800);
    const ms = await maxScroll(page);
    for (const pr of [0.25, 0.5, 0.75, 0.9, 0.985]) {
      let ok = 0, bad = 0; const notes = [];
      for (let r = 0; r < 3; r++) {
        await page.evaluate(y => window.scrollTo(0, y), ms * pr);
        await sleep(900);
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(1500);
        const st = await page.evaluate(() => ({ d: window.__draws, sy: scrollY }));
        const first = st.d[0];
        const stale = st.d.filter(d => d.g !== d.cur).length;
        const firstIsZero = first && first.g === 0 && st.sy > 0;
        const bad1 = firstIsZero || stale > 0 || (first && first.sp < pr - 0.05);
        if (bad1) { bad++; notes.push(`first={g${first.g},c${first.cur},sp${first.sp},sy${first.sy}} staleDraws=${stale}`); } else ok++;
      }
      console.log(`cache${cacheOff ? 'OFF' : 'ON '} p=${pr}: ok=${ok} bad=${bad} ${notes.join(' ; ')}`);
    }
    await ctx.browser.close();
  }
}

async function fastTests(throttle) {
  console.log(`\n=== FAST SCROLL (${throttle ? 'throttled 400KB/s +120ms' : 'unthrottled'}) ===`);
  const ctx = await launch(); const { page } = ctx;
  if (throttle) {
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 400 * 1024, uploadThroughput: 100 * 1024 });
  }
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(1000);
  const ms = await maxScroll(page);
  const cdp2 = await page.createCDPSession();
  const heap = async () => { await cdp2.send('HeapProfiler.collectGarbage'); await cdp2.send('HeapProfiler.collectGarbage'); return (await page.evaluate(() => performance.memory.usedJSHeapSize)) / 1048576; };
  const metrics = async () => (await cdp2.send('Performance.getMetrics')).metrics;
  await cdp2.send('Performance.enable');
  const heap0 = await heap();
  const peaks = { cache: 0, active: 0, queue: 0, pend: 0 };
  const cycles = throttle ? 8 : 25;
  const t0 = Date.now();
  for (let c = 0; c < cycles; c++) {
    for (const dir of [1, -1]) {
      // instant jump
      await page.evaluate((y) => window.scrollTo(0, y), dir === 1 ? ms : 0);
      // plus sweeps of fast steps
      for (let s = 0; s < 12; s++) {
        const pr = dir === 1 ? s / 11 : 1 - s / 11;
        await page.evaluate((y) => window.scrollTo(0, y), ms * pr);
        const p = await page.evaluate(() => { const l = window.heroController.loader; return [l.cache.size, l.activeLoading.size, l.loadQueue.length, l.pendingResolvers.size]; });
        peaks.cache = Math.max(peaks.cache, p[0]); peaks.active = Math.max(peaks.active, p[1]); peaks.queue = Math.max(peaks.queue, p[2]); peaks.pend = Math.max(peaks.pend, p[3]);
        await sleep(25);
      }
    }
  }
  // settle at 0% and check idle state
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(throttle ? 15000 : 3000);
  const st = await page.evaluate(() => {
    const h = window.heroController, l = h.loader;
    return { cache: l.cache.size, max: l.maxCacheSize, active: [...l.activeLoading], queue: l.loadQueue.slice(), pend: l.pendingResolvers.size,
      cacheKeys: [...l.cache.keys()].sort((a, b) => a - b), cur: h.currentGlobalFrame, tp: h.targetProgress, sp: h.smoothProgress,
      rej: window.__rejections, decodes: window.__decodes, last: window.__draws[window.__draws.length - 1] };
  });
  const heap1 = await heap();
  console.log(`cycles=${cycles} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s peaks=${JSON.stringify(peaks)}`);
  console.log(`settled: cache=${st.cache}/${st.max} active=${JSON.stringify(st.active)} queue=${JSON.stringify(st.queue)} pendingResolvers=${st.pend} cur=${st.cur} tp=${st.tp} sp=${st.sp} lastDraw=${JSON.stringify(st.last)}`);
  console.log('cacheKeys', JSON.stringify(st.cacheKeys));
  console.log('anchors in cache:', [0, 47, 48, 95].map(a => a + ':' + st.cacheKeys.includes(a)).join(' '));
  const fr = frameReqs(ctx); const counts = {};
  fr.forEach(u => counts[u] = (counts[u] || 0) + 1);
  const vals = Object.values(counts);
  console.log(`frame requests total=${fr.length} unique=${vals.length} maxPerUrl=${Math.max(...vals)} png=${fr.filter(u => u.endsWith('.png')).length}`);
  const dv = Object.values(st.decodes);
  console.log(`decode() calls total=${dv.reduce((a, b) => a + b, 0)} maxPerUrl=${Math.max(0, ...dv)} unique=${dv.length}`);
  console.log(`heap before=${heap0.toFixed(1)}MB after=${heap1.toFixed(1)}MB; badResp=${JSON.stringify(ctx.bad.slice(0, 5))} errors=${JSON.stringify(ctx.errors.slice(0, 5))} rejections=${JSON.stringify(st.rej)}`);
  const m = await metrics();
  const g = n => (m.find(x => x.name === n) || {}).value;
  console.log(`CDP: JSHeapUsed=${(g('JSHeapUsedSize') / 1048576).toFixed(1)}MB Nodes=${g('Nodes')} JSEventListeners=${g('JSEventListeners')} Documents=${g('Documents')}`);
  await ctx.browser.close();
}

async function resizeTests() {
  console.log('\n=== RESIZE ===');
  const ctx = await launch(); const { page } = ctx;
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const ms = await maxScroll(page);
  await page.evaluate((y) => window.scrollTo(0, y), ms * 0.5);
  await sleep(1200);
  await page.evaluate(() => {
    window.__refreshCalls = 0;
    const orig = ScrollTrigger.refresh;
    ScrollTrigger.refresh = function () { window.__refreshCalls++; return orig.apply(this, arguments); };
    window.__blank = [];
    window.__checkCanvas = () => {
      const c = document.getElementById('hero-canvas');
      const x = c.getContext('2d');
      let nonEmpty = 0, samples = 0;
      for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) {
        const d = x.getImageData(Math.floor(c.width * i / 6), Math.floor(c.height * j / 6), 1, 1).data; samples++;
        if (d[3] > 0) nonEmpty++;
      }
      return { w: c.width, h: c.height, nonEmpty, samples, iw: innerWidth, ih: innerHeight };
    };
    // sample canvas at each animation frame during resize
    let n = 0;
    (function loop() { const r = window.__checkCanvas(); if (r.nonEmpty === 0) window.__blank.push(r); n++; window.__samples = n; requestAnimationFrame(loop); })();
  });
  const before = await page.evaluate(() => ({ cur: window.heroController.currentGlobalFrame, tp: window.heroController.targetProgress }));
  const t0 = Date.now();
  let i = 0;
  const sizes = [];
  while (Date.now() - t0 < 4000) {
    const w = 1000 + Math.round(400 * Math.abs(Math.sin(i / 3))); const h = 600 + Math.round(300 * Math.abs(Math.cos(i / 4)));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    sizes.push([w, h]);
    i++; await sleep(30);
  }
  const duringRefresh = await page.evaluate(() => window.__refreshCalls);
  const mid = await page.evaluate(() => window.__checkCanvas());
  await sleep(600);
  const after = await page.evaluate(() => ({ refresh: window.__refreshCalls, c: window.__checkCanvas(), cur: window.heroController.currentGlobalFrame, tp: window.heroController.targetProgress, sp: window.heroController.smoothProgress, blank: window.__blank.length, samples: window.__samples, sy: scrollY, styleW: document.getElementById('hero-canvas').style.width }));
  console.log(`resize events~${sizes.length} refreshCalls during=${duringRefresh} after settle=${after.refresh}`);
  console.log('canvas mid:', JSON.stringify(mid), ' final:', JSON.stringify(after.c), 'cssW', after.styleW);
  console.log(`before frame=${before.cur} tp=${before.tp.toFixed(3)}; after frame=${after.cur} tp=${after.tp.toFixed(3)} sp=${after.sp.toFixed(3)} scrollY=${after.sy}`);
  console.log(`blank canvas rAF samples=${after.blank}/${after.samples}`);
  console.log('errors', JSON.stringify(ctx.errors), 'bad', JSON.stringify(ctx.bad));
  await ctx.browser.close();
}

async function regress() {
  console.log('\n=== REGRESSION / DOM ===');
  const ctx = await launch(); const { page } = ctx;
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const ms = await maxScroll(page);
  const beats = [];
  for (const pr of [0.02, 0.3, 0.49, 0.68, 0.88, 0.99]) {
    await page.evaluate(y => window.scrollTo(0, y), ms * pr);
    await sleep(1300);
    const s = await page.evaluate(() => {
      const ops = {}; for (let i = 1; i <= 5; i++) { const e = document.getElementById('hero-beat-' + i); ops[i] = e ? +getComputedStyle(e).opacity : null; }
      const h = window.heroController; const l = window.__draws[window.__draws.length - 1];
      return { ops, cur: h.currentGlobalFrame, g: l && l.g, loaderGone: !document.getElementById('hero-loader-pill') };
    });
    beats.push({ pr, ...s });
    console.log(`p=${pr} beat opacities=${JSON.stringify(s.ops)} frame=${s.cur} drawnG=${s.g} loaderPillRemoved=${s.loaderGone}`);
  }
  // Clip A -> B boundary
  const seq = [];
  for (const pr of [0.43, 0.45, 0.53, 0.545, 0.56]) {
    await page.evaluate(y => window.scrollTo(0, y), ms * pr);
    await sleep(900);
    seq.push(await page.evaluate(() => [window.heroController.currentGlobalFrame, window.__draws[window.__draws.length - 1].g]));
  }
  console.log('boundary frames [cur, drawn] at .43 .45 .53 .545 .56:', JSON.stringify(seq));
  // sections
  const sec = await page.evaluate(() => ({
    products: document.querySelectorAll('#products .product-card, #products [class*="product-card"]').length,
    categories: document.querySelectorAll('#categories [class*="category"]').length,
    printing: !!document.querySelector('#printing-service'),
    reviews: document.querySelectorAll('#why-us [class*="review"], #why-us [class*="testimonial"]').length,
    footer: !!document.querySelector('footer'),
    brokenImgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)
  }));
  console.log('sections', JSON.stringify(sec));
  console.log('errors', JSON.stringify(ctx.errors), 'bad', JSON.stringify(ctx.bad));
  await ctx.browser.close();
}

(async () => {
  if (['reload', 'all'].includes(section)) await reloadTests();
  if (['reload2', 'all'].includes(section)) await reload2();
  if (['fast', 'all'].includes(section)) { await fastTests(false); await fastTests(true); }
  if (['resize', 'all'].includes(section)) await resizeTests();
  if (['regress', 'all'].includes(section)) await regress();
  process.exit(0);
})().catch(e => { console.error('TEST HARNESS ERROR', e); process.exit(2); });
