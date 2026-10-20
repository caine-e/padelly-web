import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cleaner = fileURLToPath(new URL('../tools/build/strip-html-comments.py', import.meta.url));

test('production cleanup removes comments while preserving JSON, scripts, attributes and text', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'padelly-html-'));
  try {
    await mkdir(join(folder, 'de'));
    const source = `<!doctype html>\n<!-- internal build note -->\n<html lang="de"><head>
<title>Padelly <!-- literal title text --></title>
<script type="application/ld+json">{"description":"<!-- literal JSON text -->"}</script>
<script>const example = "<!-- literal script text -->"; const score = 40 < 50;</script>
<style>.example::before { content: "<!-- literal style text -->"; }</style>
</head><body><p data-example="<!-- literal attribute -->">Pádel &amp; Spaß</p>
<!-- a multiline\ninternal comment -->
<textarea><!-- literal input text --></textarea>
</body></html>`;
    const expected = source.replace('<!-- internal build note -->', '').replace('<!-- a multiline\ninternal comment -->', '');
    await writeFile(join(folder, 'de', 'index.html'), source);
    execFileSync('python3', [cleaner, folder]);
    assert.equal(await readFile(join(folder, 'de', 'index.html'), 'utf8'), expected);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('cleanup preserves a comment-free page byte for byte', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'padelly-html-'));
  try {
    const source = '<!doctype html>\n<html><body>0 : 15 · Über Pádel</body></html>\n';
    await writeFile(join(folder, 'index.html'), source);
    execFileSync('python3', [cleaner, folder]);
    assert.equal(await readFile(join(folder, 'index.html'), 'utf8'), source);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
