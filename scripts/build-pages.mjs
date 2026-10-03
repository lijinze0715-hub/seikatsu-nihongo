import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/seikatsu-nihongo';
if (basePath && !/^\/[a-zA-Z0-9_.-]+$/.test(basePath)) {
  throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or a single repository path, e.g. /seikatsu-nihongo');
}

const env = { ...process.env, GITHUB_PAGES_BUILD: 'true', NEXT_PUBLIC_BASE_PATH: basePath };
for (const args of [
  ['scripts/validate-content.mjs'],
  ['node_modules/vinext/dist/cli.js', 'build'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Vinext exports HTML into dist/client rather than Next.js's out directory.
if (!existsSync('dist/client/index.html')) {
  throw new Error('Static export did not produce dist/client/index.html');
}
rmSync(new URL('../out/', import.meta.url), { recursive: true, force: true });
cpSync('dist/client', 'out', { recursive: true });
// assetPrefix also prefixes Vinext's on-disk asset directory. Pages already
// mounts out at basePath, so move these assets back to the artifact root.
if (basePath && existsSync(`out${basePath}/_next`)) {
  renameSync(`out${basePath}/_next`, 'out/_next');
  rmSync(`out${basePath}`, { recursive: true, force: true });
}

function* files(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else yield file;
  }
}

// This Vinext version redirects slash-suffixed routes during prerendering.
// Export without trailingSlash, then prepare directory indexes for Pages.
// Snapshot paths before creating directories inside the traversed tree.
const exportedFiles = Array.from(files('out'));
for (const file of exportedFiles) {
  if (!file.endsWith('.html') || ['index.html', '404.html'].includes(path.basename(file))) continue;
  const directory = file.slice(0, -5);
  mkdirSync(directory, { recursive: true });
  renameSync(file, path.join(directory, 'index.html'));
}
writeFileSync('out/.nojekyll', '');

const requiredPages = [
  'index.html', 'courses/n5/index.html', 'lessons/prelude/index.html', 'levels/n5/index.html',
  ...Array.from({ length: 20 }, (_, i) => `courses/n5/lesson-${i + 1}/index.html`),
  ...Array.from({ length: 20 }, (_, i) => `lessons/${i + 1}/index.html`),
];
for (const page of requiredPages) {
  if (!existsSync(path.join('out', page))) throw new Error(`Missing exported page: ${page}`);
}
let checkedLinks = 0;
for (const file of files('out')) {
  if (!file.endsWith('.html')) continue;
  const html = readFileSync(file, 'utf8');
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    if (url.startsWith('//')) continue;
    if (basePath && !url.startsWith(`${basePath}/`)) throw new Error(`Unprefixed URL in ${file}: ${url}`);
    const relative = decodeURIComponent(url.slice(basePath.length)).replace(/^\//, '');
    const target = path.join('out', relative, url.endsWith('/') ? 'index.html' : '');
    if (!existsSync(target)) throw new Error(`Broken local URL in ${file}: ${url}`);
    checkedLinks++;
  }
}
console.log(`GitHub Pages: ${requiredPages.length} required pages and ${checkedLinks} local URLs verified in out/ (base path: ${basePath || '/'}).`);
