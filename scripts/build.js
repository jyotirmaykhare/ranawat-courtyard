import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'public');
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'app.js', 'effects.js', 'styles.css']) {
  await copyFile(join(root, file), join(output, file));
}

await mkdir(join(output, 'media'), { recursive: true });
for (const file of ['ranawat-hero-cinematic.mp4', 'ranawat-hero-final.jpg']) {
  await copyFile(join(root, 'media', file), join(output, 'media', file));
}

const rawHost = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'ranawat-heritage.vercel.app';
const origin = new URL(rawHost.includes('://') ? rawHost : `https://${rawHost}`).origin;
const routes = ['/', '/about', '/architecture-gardens', '/weddings-events', '/farmhouse-stay', '/boutique', '/dining', '/gallery', '/contact'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${origin}${route === '/' ? '/' : route}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
console.log(`Prepared Vercel static output in ${output}`);
