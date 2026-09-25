import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customElementsFromGeoJson,
  customElementsToGeoJson,
  normalizeCustomElement,
} from '../layers/customElements/model.js';
import { createCustomElementsStore } from '../layers/customElements/store.js';

const fixture = {
  id: 'hospital-escuela',
  name: 'Hospital Escuela',
  category: 'hospital',
  lat: -27.4692,
  lon: -58.8306,
  status: 'operational',
  sourceUrl: 'https://salud.corrientes.gob.ar/',
};

test('custom element normalization validates coordinates and safe URLs', () => {
  const element = normalizeCustomElement(fixture);
  assert.equal(element.category, 'hospital');
  assert.match(element.sourceUrl, /^https:/);
  assert.throws(
    () => normalizeCustomElement({ ...fixture, lat: 100 }),
    /Latitud/,
  );
  assert.equal(
    normalizeCustomElement({ ...fixture, mediaUrl: 'javascript:alert(1)' })
      .mediaUrl,
    '',
  );
});

test('custom elements round-trip through point GeoJSON', () => {
  const geojson = customElementsToGeoJson([normalizeCustomElement(fixture)]);
  const [restored] = customElementsFromGeoJson(geojson);
  assert.equal(restored.id, fixture.id);
  assert.equal(restored.lat, fixture.lat);
  assert.equal(restored.lon, fixture.lon);
});

test('custom element store persists, updates, removes and imports', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = createCustomElementsStore({
    storage,
    idFactory: () => 'generated',
  });
  store.upsert(fixture);
  store.upsert({ ...fixture, name: 'Hospital Escuela actualizado' });
  assert.equal(store.list().length, 1);
  assert.equal(store.list()[0].name, 'Hospital Escuela actualizado');
  assert.equal(
    store.importGeoJson(
      customElementsToGeoJson([
        normalizeCustomElement({
          ...fixture,
          id: 'cam-1',
          name: 'Cámara',
          category: 'camera',
        }),
      ]),
    ),
    1,
  );
  assert.equal(store.list().length, 2);
  assert.equal(store.remove('hospital-escuela'), true);
  assert.equal(store.list().length, 1);
});
