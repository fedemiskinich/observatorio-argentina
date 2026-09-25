import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIgnWfsUrl,
  fetchIgnFeatures,
  normalizeIgnBounds,
} from './ignWfs.js';

test('IGN WFS accepts only curated public layers and bounds the result count', () => {
  const url = new URL(buildIgnWfsUrl('airports', { limit: 9000 }));
  assert.equal(url.hostname, 'wms.ign.gob.ar');
  assert.equal(url.searchParams.get('typeName'), 'ign:puntos_de_transporte_aereo_GB005');
  assert.equal(url.searchParams.get('maxFeatures'), '1000');
  assert.throws(() => buildIgnWfsUrl('military-sites'), /no permitida/);
});

test('IGN bounds stay ordered and inside the national operating envelope', () => {
  assert.deepEqual(
    normalizeIgnBounds({ west: -59, south: -28, east: -58, north: -27 }),
    { west: -59, south: -28, east: -58, north: -27 },
  );
  assert.equal(
    normalizeIgnBounds({ west: -80, south: -28, east: -58, north: -27 }),
    null,
  );
  assert.throws(
    () =>
      buildIgnWfsUrl('ports', {
        bounds: { west: -80, south: -28, east: -58, north: -27 },
      }),
    /fuera de Argentina/,
  );
});

test('IGN feature client validates GeoJSON and attaches provenance', async () => {
  const result = await fetchIgnFeatures('ports', {
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    }),
  });
  assert.equal(result.type, 'FeatureCollection');
  assert.equal(result.provenance.provider, 'Instituto Geográfico Nacional');
  assert.equal(result.provenance.classification, 'official-reference');
});
