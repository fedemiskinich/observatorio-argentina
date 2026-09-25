import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createCctvCatalog } from '../../server/providers/cctv/catalog.js';
import { normalizeSourceItem } from '../../server/providers/cctv/normalize.js';

const catalogUrl = new URL(
  '../../config/cctv_sources.argentina.json',
  import.meta.url,
);

test('Argentina CCTV catalog ships curated public cameras from three provinces', () => {
  const rows = JSON.parse(fs.readFileSync(catalogUrl, 'utf8'));
  assert.equal(rows.length, 9);
  assert.equal(new Set(rows.map(({ id }) => id)).size, rows.length);
  for (const row of rows) {
    assert.equal(row.feedType, 'embed');
    assert.match(row.sourceKind, /^argentina-public-(official|webcam)$/);
    assert.match(row.embedUrl, /^https:\/\//);
    assert.ok(Number.isFinite(row.lat));
    assert.ok(Number.isFinite(row.lon));
  }
  assert.equal(
    rows.filter(({ cityId }) => cityId === 'corrientes-capital').length,
    2,
  );
  assert.equal(
    rows.filter(({ cityId }) => cityId === 'buenos-aires-caba').length,
    2,
  );
  assert.ok(rows.some(({ provider }) => provider === 'SISE Argentina'));
  for (const row of rows.filter(({ feedType }) => feedType === 'embed')) {
    if (
      row.id.startsWith('corrientes-') ||
      row.id.startsWith('buenos-aires-')
    ) {
      assert.match(row.sourceUrl, /^https:\/\//);
    }
  }
});

test('CCTV normalization preserves the public embed player URL', () => {
  const [row] = JSON.parse(fs.readFileSync(catalogUrl, 'utf8'));
  const normalized = normalizeSourceItem(row);
  assert.equal(normalized.feedType, 'embed');
  assert.equal(normalized.embedUrl, row.embedUrl);
  assert.equal(normalized.url, '');
});

test('Argentina catalog is the backend default and foreign packs stay opt-in', async () => {
  const names = [
    'CCTV_SOURCES_FILE',
    'CCTV_SOURCES_JSON',
    'CCTV_LIVE_PACKS_ENABLED',
    'CCTV_FORCE_AUSTIN',
  ];
  const before = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  for (const name of names) delete process.env[name];
  try {
    const getCctvSources = createCctvCatalog({
      sourceRoot: new URL('../..', import.meta.url).pathname,
    });
    const sources = await getCctvSources();
    assert.equal(sources.length, 9);
    assert.ok(
      sources.every(({ sourceKind }) =>
        sourceKind.startsWith('argentina-public-'),
      ),
    );
  } finally {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  }
});

test('Windows launcher pins the Argentina catalog over an old dotenv file', () => {
  const launcher = fs.readFileSync(
    new URL('../../INICIAR-WINDOWS.cmd', import.meta.url),
    'utf8',
  );
  assert.match(
    launcher,
    /CCTV_SOURCES_FILE=config\/cctv_sources\.argentina\.json/,
  );
  assert.match(launcher, /CCTV_SOURCES_JSON=\[\]/);
  assert.match(launcher, /CCTV_LIVE_PACKS_ENABLED=0/);
  assert.match(launcher, /CCTV_PREFER_AUSTIN=0/);
  assert.match(launcher, /CCTV_FORCE_AUSTIN=0/);
});
