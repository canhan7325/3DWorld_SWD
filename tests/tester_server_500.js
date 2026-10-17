// Tester: boots server.js unmodified with a stubbed `compression` middleware that throws for /__boom* paths,
// to exercise the error middleware. Usage: PORT=3200 node tests/tester_server_500.js
process.env.PORT = process.env.PORT || '3200';
const Module = require('module');
const http = require('http');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const mod = origLoad.apply(this, arguments);
  if (request === 'compression') {
    return function () {
      const real = mod.apply(this, arguments);
      return function (req, res, next) {
        if (req.url.startsWith('/__boom-sync')) throw new Error('secret internal detail /etc/passwd');
        if (req.url.startsWith('/__boom-418')) { const e = new Error('teapot'); e.status = 418; return next(e); }
        if (req.url.startsWith('/__boom-late')) { res.write('partial'); return next(new Error('late failure')); }
        if (req.url.startsWith('/__boom-str')) return next('a string error');
        if (req.url.startsWith('/__boom-200')) { const e = new Error('weird'); e.status = 200; return next(e); }
        return real(req, res, next);
      };
    };
  }
  return mod;
};
require('../server.js');

function get(p, headers) {
  return new Promise((resolve) => {
    const r = http.get(`http://localhost:${process.env.PORT}${p}`, { headers }, (res) => {
      let b = ''; res.on('data', d => b += d); res.on('end', () => resolve({ status: res.statusCode, ct: res.headers['content-type'], body: b }));
      res.on('error', e => resolve({ status: 'resp-error', body: String(e) }));
    });
    r.on('error', e => resolve({ status: 'req-error', body: String(e) }));
    r.setTimeout(3000, () => { r.destroy(); resolve({ status: 'timeout', body: '' }); });
  });
}
process.on('uncaughtException', e => console.log('PROCESS uncaughtException:', e.message));
process.on('unhandledRejection', e => console.log('PROCESS unhandledRejection:', e && e.message));

setTimeout(async () => {
  const log = (n, r) => console.log(n.padEnd(34), r.status, r.ct || '', JSON.stringify((r.body || '').slice(0, 140).replace(/\s+/g, ' ')));
  log('sync throw html', await get('/__boom-sync', { Accept: 'text/html' }));
  log('sync throw json', await get('/__boom-sync', { Accept: 'application/json' }));
  log('sync throw */*', await get('/__boom-sync', { Accept: '*/*' }));
  log('418 html', await get('/__boom-418', { Accept: 'text/html' }));
  log('418 json', await get('/__boom-418', { Accept: 'application/json' }));
  log('string error json', await get('/__boom-str', { Accept: 'application/json' }));
  log('status 200 error json', await get('/__boom-200', { Accept: 'application/json' }));
  log('late error (headers sent)', await get('/__boom-late', { Accept: 'text/html' }));
  log('server still alive /', await get('/', { Accept: 'text/html' }));
  process.exit(0);
}, 800);

