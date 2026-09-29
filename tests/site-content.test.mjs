import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['/', '/rentals/', '/service-area/', '/contact/'];

let server;
let origin;

test.before(async () => {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const filePath = path.join(root, relativePath.replace(/^\/+/, ''));
      const body = await readFile(filePath);
      response.writeHead(200);
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('the published site content contains no decorative emoji-style glyphs', async () => {
  const forbiddenGlyphs = /[☎▣✉◷●▦✓↗]/u;

  for (const resource of [...pages, '/styles.css']) {
    const response = await fetch(`${origin}${resource}`);
    assert.equal(response.status, 200, `${resource} should be served`);
    const content = await response.text();
    assert.doesNotMatch(content, forbiddenGlyphs, `${resource} includes a decorative glyph`);
  }
});

test('every local image referenced by a page is available', async () => {
  for (const page of pages) {
    const response = await fetch(`${origin}${page}`);
    const html = await response.text();
    const documentUrl = new URL(page, origin);
    const declaredBase = html.match(/<base\b[^>]*\bhref="([^"]+)"/i)?.[1];
    const baseUrl = declaredBase ? new URL(declaredBase, documentUrl) : documentUrl;
    const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
      .map((match) => new URL(match[1], baseUrl))
      .filter((url) => url.origin === origin);

    for (const imageUrl of imageSources) {
      const imageResponse = await fetch(imageUrl);
      assert.equal(imageResponse.status, 200, `${page} references missing image ${imageUrl.pathname}`);
    }
  }
});

test('the paved-job-site photo uses the existing asset', async () => {
  const response = await fetch(origin);
  const html = await response.text();
  const match = html.match(/<img\b[^>]*src="([^"]+)"[^>]*alt="River City dumpster on a paved jobsite"/i);

  assert.ok(match, 'the paved-job-site photo should be present on the home page');
  const imageUrl = new URL(match[1], origin);
  assert.equal(imageUrl.pathname, '/assets/790283636_122148127965036618_6062490240627522249_n.jpg');
  assert.equal((await fetch(imageUrl)).status, 200, 'the paved-job-site photo should load');
});
