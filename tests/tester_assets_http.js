// Tester: asset integrity + HTTP behaviour. Usage: node tests/tester_assets_http.js (server on PORT, default 3100)
const fs = require('fs');
const path = require('path');
const http = require('http');
const root = path.join(__dirname, '..');
const BASE = `http://localhost:${process.env.PORT || 3100}`;
const results = [];
const rec = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };

function req(p, headers = {}) {
  return new Promise((resolve) => {
    http.get(BASE + p, { headers }, (res) => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    }).on('error', e => resolve({ status: 0, body: String(e), headers: {} }));
  });
}

(async () => {
  // ---- WebP integrity
  let bad = 0, total = 0;
  for (const [dir, n] of [['frame1', 'A'], ['frame2', 'B']]) {
    for (let i = 1; i <= 48; i++) {
      const f = path.join(root, dir, `ezgif-frame-${String(i).padStart(3, '0')}.webp`);
      total++;
      if (!fs.existsSync(f)) { bad++; console.log('missing', f); continue; }
      const b = fs.readFileSync(f);
      const okHdr = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
      let w = 0, h = 0;
      const fmt = b.toString('ascii', 12, 16);
      if (fmt === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
      else if (fmt === 'VP8L') { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >> 14) & 0x3fff) + 1; }
      else if (fmt === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
      if (!okHdr || w !== 1920 || h !== 1080) { bad++; console.log('bad', f, okHdr, w, h); }
      // matching PNG dims
      const png = path.join(root, dir, `ezgif-frame-${String(i).padStart(3, '0')}.png`);
      if (!fs.existsSync(png)) console.log('no png sibling', png);
    }
  }
  rec('96 WebP exist, valid RIFF/WEBP, 1920x1080', total === 96 && bad === 0, `total=${total} bad=${bad}`);

  // ---- HTTP: frames
  let non200 = 0;
  for (const [c, d] of [['clip-a', 1], ['clip-b', 2]]) for (let i = 1; i <= 48; i++) {
    const r = await req(`/frames/${c}/ezgif-frame-${String(i).padStart(3, '0')}.webp`);
    if (r.status !== 200 || !/webp/.test(r.headers['content-type'] || '')) { non200++; console.log('bad http', c, i, r.status, r.headers['content-type']); }
  }
  rec('All 96 webp served 200 image/webp', non200 === 0);
  const png1 = await req('/frames/clip-a/ezgif-frame-001.png');
  rec('PNG still served', png1.status === 200 && /png/.test(png1.headers['content-type']));
  const legacy = await req('/frame1/ezgif-frame-001.webp');
  rec('legacy /frame1 alias webp', legacy.status === 200);

  // ---- /api/frames
  const def = JSON.parse((await req('/api/frames')).body);
  rec('/api/frames default webp', def.format === 'webp' && def.totalFrames === 96 && def.clipA[0].url.endsWith('.webp') && def.clipB[47].url.endsWith('.webp'));
  const png = JSON.parse((await req('/api/frames?format=png')).body);
  rec('/api/frames?format=png', png.format === 'png' && png.clipA.every(f => f.url.endsWith('.png')) && png.clipB.every(f => f.url.endsWith('.png')));
  const junk = JSON.parse((await req('/api/frames?format=gif')).body);
  rec('/api/frames?format=gif falls back to webp', junk.format === 'webp');
  const arr = JSON.parse((await req('/api/frames?format=png&format=webp')).body);
  rec('/api/frames duplicate format param does not crash', ['png', 'webp'].includes(arr.format), arr.format);
  const up = JSON.parse((await req('/api/frames?format=PNG')).body);
  console.log('INFO format=PNG ->', up.format);

  // ---- 404
  let r = await req('/nope', { Accept: 'text/html' });
  rec('HTML 404 status', r.status === 404 && /html/.test(r.headers['content-type']), `${r.status} ${r.headers['content-type']}`);
  r = await req('/api/nope', { Accept: 'application/json' });
  rec('JSON 404 status', r.status === 404 && /json/.test(r.headers['content-type']) && JSON.parse(r.body).status === 404, `${r.status} ${r.headers['content-type']}`);
  r = await req('/api/nope');
  console.log('INFO /api/nope no Accept (curl-style) ->', r.status, r.headers['content-type']);
  rec('/api/nope w/o Accept still 404', r.status === 404);
  r = await req('/frames/clip-a/ezgif-frame-999.webp', { Accept: 'image/webp,image/*,*/*;q=0.8' });
  console.log('INFO missing frame (browser img Accept) ->', r.status, r.headers['content-type'], r.body.length, 'bytes');
  rec('Missing static frame is 404', r.status === 404);
  r = await req('/js/nonexistent.js', { Accept: '*/*' });
  console.log('INFO missing js ->', r.status, r.headers['content-type'], r.body.length);
  rec('Missing static js is 404', r.status === 404);
  r = await req('/%E0%A4%A', { Accept: 'text/html' });
  console.log('INFO malformed URI ->', r.status, r.headers['content-type']);
  rec('Malformed URI is 4xx not 200/5xx', r.status >= 400 && r.status < 500, String(r.status));
  r = await req('/', { Accept: 'text/html' });
  rec('Home 200', r.status === 200);
  r = await req('/marketplace?category=%3Cscript%3E', { Accept: 'text/html' });
  console.log('INFO marketplace escaping:', r.body.includes('<script>alert') ? 'RAW' : (r.body.includes('&lt;script&gt;') ? 'escaped' : 'n/a'));
  for (const p of ['/printing', '/login', '/marketplace']) { const x = await req(p); rec('route ' + p, x.status === 200); }
  r = await req('/', { Accept: 'application/json' });
  console.log('INFO / with Accept json ->', r.status, r.headers['content-type']);

  const fails = results.filter(x => !x.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();

