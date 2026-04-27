import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const serverEntryUrl = pathToFileURL(path.join(distDir, 'server', 'entry-server.js')).href;

if (!existsSync(distDir)) {
  console.error('[prerender] dist/ not found — run `vite build` first.');
  process.exit(1);
}

if (!existsSync(path.join(distDir, 'server', 'entry-server.js'))) {
  console.error('[prerender] server bundle not found — run `vite build --ssr src/entry-server.tsx --outDir dist/server` first.');
  process.exit(1);
}

const { render, ROUTES } = await import(serverEntryUrl);

const templatePath = path.join(distDir, 'index.html');
const template = await readFile(templatePath, 'utf8');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyMeta(html, meta) {
  let out = html;

  // <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);

  // meta description
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );

  // canonical
  out = out.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
  );

  // og:url
  out = out.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
  );

  // og:title
  out = out.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
  );

  // og:description
  out = out.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
  );

  // twitter:title
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
  );

  // twitter:description
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  );

  // Inject per-page JSON-LD just before </head>
  const jsonLdBlock = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>\n  </head>`;
  out = out.replace(/<\/head>/, jsonLdBlock);

  // Mark as prerendered so client uses hydrateRoot
  out = out.replace(/<html lang="en">/, '<html lang="en" data-prerendered="true">');

  return out;
}

function injectAppHtml(html, appHtml) {
  return html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
}

let count = 0;
for (const route of ROUTES) {
  console.log(`[prerender] rendering ${route.path}`);
  const appHtml = render(route.path);
  let html = applyMeta(template, route.meta);
  html = injectAppHtml(html, appHtml);
  const outPath = path.join(distDir, route.outFile);
  await writeFile(outPath, html, 'utf8');
  console.log(`[prerender]   → dist/${route.outFile} (${(html.length / 1024).toFixed(1)} KB)`);
  count++;
}

// Clean up the server bundle directory — Vercel doesn't need to ship it.
await rm(path.join(distDir, 'server'), { recursive: true, force: true });

console.log(`[prerender] done — ${count} page(s) generated.`);
