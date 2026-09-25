import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyHydrologyLevel,
  hydrologyTrend,
} from '../../server/providers/hydrology.js';
import { stationMapLabel, stationReport } from '../layers/hydrology/model.js';

test('hydrology levels follow published thresholds without inventing one', () => {
  assert.equal(
    classifyHydrologyLevel({ value: 7.1, alertLevel: 6.5, evacuationLevel: 7 }),
    'evacuation',
  );
  assert.equal(
    classifyHydrologyLevel({ value: 6.6, alertLevel: 6.5, evacuationLevel: 7 }),
    'alert',
  );
  assert.equal(
    classifyHydrologyLevel({ value: 6.1, alertLevel: 6.5, evacuationLevel: 7 }),
    'watch',
  );
  assert.equal(classifyHydrologyLevel({ value: 4.4 }), 'normal');
});

test('hydrology trend compares the bounded observation window', () => {
  assert.deepEqual(
    hydrologyTrend([
      { timestart: '2026-09-20T00:00:00Z', valor: 4.2 },
      { timestart: '2026-09-23T00:00:00Z', valor: 4.48 },
    ]),
    { trend: 'rising', deltaM: 0.28 },
  );
});

test('station report separates observation, trend and official thresholds', () => {
  const report = stationReport({
    name: 'Corrientes',
    river: 'Paraná',
    valueM: 4.48,
    status: 'normal',
    trend: 'rising',
    deltaM: 0.28,
    alertLevelM: 6.5,
    evacuationLevelM: 7,
  });
  assert.equal(report.level, '4.48 m');
  assert.match(report.trend, /CRECIENTE/);
  assert.match(report.thresholds, /Alerta 6.50 m/);
});

test('map label exposes the station level, trend and state', () => {
  const label = stationMapLabel({
    name: 'Corrientes',
    valueM: 4.48,
    status: 'normal',
    trend: 'rising',
    deltaM: 0.28,
  });
  assert.match(label, /Corrientes/);
  assert.match(label, /NIVEL 4.48 m/);
  assert.match(label, /▲ CRECIENTE \(\+0.28 m\) · NORMAL/);
});
