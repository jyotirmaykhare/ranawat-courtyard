import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp', '.mp4':'video/mp4', '.webm':'video/webm', '.ico':'image/x-icon', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }

  const file = pathname.startsWith('/images/')
    ? resolve(root, 'public', `.${pathname}`)
    : pathname.startsWith('/media/')
      ? resolve(root, `.${pathname}`)
      : resolve(root, `.${pathname}`);
  const relativePath = relative(root, file);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath.includes('..')) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileInfo = await stat(file);
    if (!fileInfo.isFile()) throw new Error('Not a file');
    const contentType = types[extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileInfo.size}`, 'Accept-Ranges': 'bytes' }).end();
        return;
      }
      let start = match[1] ? Number(match[1]) : Math.max(0, fileInfo.size - Number(match[2]));
      let end = match[2] && match[1] ? Number(match[2]) : fileInfo.size - 1;
      if (start >= fileInfo.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileInfo.size}`, 'Accept-Ranges': 'bytes' }).end();
        return;
      }
      end = Math.min(end, fileInfo.size - 1);
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${fileInfo.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileInfo.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  } catch {
    // Only app routes fall back to the SPA shell; missing assets should be real 404s.
    if (extname(pathname) || pathname.startsWith('/images/') || pathname.startsWith('/media/')) {
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    try { res.writeHead(200, { 'Content-Type':types['.html'], 'Cache-Control':'no-cache' }).end(await readFile(resolve(root, 'index.html'))); }
    catch { res.writeHead(404).end('Not found'); }
  }
}).listen(Number(process.env.PORT || 4173), '0.0.0.0', () => console.log(`Ranawat Courtyard running at http://localhost:${process.env.PORT || 4173}`));
