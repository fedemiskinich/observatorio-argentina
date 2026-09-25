import { makeRateLimiter, clientKey } from './common/rate-limit.js';

const INA_BASE = 'https://alerta.ina.gob.ar/a5';
const CACHE_MS = 10 * 60_000;
const STALE_MS = 6 * 60 * 60_000;
const SERIES = Object.freeze([15, 17, 18, 19, 21, 22, 23]);

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyHydrologyLevel({
  value,
  alertLevel,
  evacuationLevel,
  lowWaterLevel,
} = {}) {
  const current = finite(value);
  if (current === null) return 'unknown';
  if (finite(evacuationLevel) !== null && current >= evacuationLevel)
    return 'evacuation';
  if (finite(alertLevel) !== null && current >= alertLevel) return 'alert';
  if (finite(alertLevel) !== null && current >= alertLevel - 0.5)
    return 'watch';
  if (finite(lowWaterLevel) !== null && current <= lowWaterLevel) return 'low';
  return 'normal';
}

export function hydrologyTrend(observations = []) {
  const rows = observations
    .map((row) => ({
      time: Date.parse(row?.timestart),
      value: finite(row?.valor),
    }))
    .filter(({ time, value }) => Number.isFinite(time) && value !== null)
    .sort((a, b) => a.time - b.time);
  if (rows.length < 2) return { trend: 'unknown', deltaM: null };
  const deltaM = Math.round((rows.at(-1).value - rows[0].value) * 100) / 100;
  return {
    trend: deltaM >= 0.1 ? 'rising' : deltaM <= -0.1 ? 'falling' : 'stable',
    deltaM,
  };
}

async function readJson(url, signal) {
  const response = await fetch(url, {
    signal: AbortSignal.any(
      [signal, AbortSignal.timeout(20_000)].filter(Boolean),
    ),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Observatorio-Argentina/0.12',
    },
  });
  if (!response.ok) throw new Error(`INA HTTP ${response.status}`);
  return response.json();
}

async function fetchStation(seriesId, signal) {
  const end = new Date();
  const start = new Date(end.getTime() - 4 * 86_400_000);
  const metadataUrl = `${INA_BASE}/obs/puntual/series/${seriesId}?format=json`;
  const observationsUrl = `${INA_BASE}/getObservaciones?tipo=puntual&series_id=${seriesId}&timestart=${start.toISOString()}&timeend=${end.toISOString()}`;
  const [metadata, observations] = await Promise.all([
    readJson(metadataUrl, signal),
    readJson(observationsUrl, signal),
  ]);
  const station = metadata?.estacion || {};
  const coordinates = station?.geom?.coordinates || [];
  const rows = Array.isArray(observations) ? observations : [];
  const latest = rows
    .filter(
      (row) =>
        finite(row?.valor) !== null &&
        !Number.isNaN(Date.parse(row?.timestart)),
    )
    .sort((a, b) => Date.parse(a.timestart) - Date.parse(b.timestart))
    .at(-1);
  const { trend, deltaM } = hydrologyTrend(rows);
  const valueM = finite(latest?.valor);
  const alertLevelM = finite(station.nivel_alerta);
  const evacuationLevelM = finite(station.nivel_evacuacion);
  const lowWaterLevelM = finite(station.nivel_aguas_bajas);
  return {
    id: `ina-${seriesId}`,
    seriesId,
    name: String(station.nombre || `Serie ${seriesId}`),
    river: String(station.rio || '').replace(/(MED|INF)$/i, '') || null,
    province: station.provincia || 'CORRIENTES',
    owner: station.propietario || null,
    lat: finite(coordinates[1]),
    lon: finite(coordinates[0]),
    valueM,
    observedAt: latest?.timestart || metadata?.date_range?.timeend || null,
    alertLevelM,
    evacuationLevelM,
    lowWaterLevelM,
    status: classifyHydrologyLevel({
      value: valueM,
      alertLevel: alertLevelM,
      evacuationLevel: evacuationLevelM,
      lowWaterLevel: lowWaterLevelM,
    }),
    trend,
    deltaM,
    source: 'INA SIyAH',
    sourceUrl: `https://alerta.ina.gob.ar/a5/obs/puntual/series/${seriesId}`,
  };
}

export function hydrologyProxy() {
  let cache = null;
  let inFlight = null;
  const limiter = makeRateLimiter({ windowMs: 60_000, max: 30, globalMax: 90 });

  async function refresh() {
    const controller = new AbortController();
    const results = [];
    // INA is a public service: keep concurrency deliberately low to avoid
    // overloading it and to prevent intermittent timeouts on cold requests.
    for (let index = 0; index < SERIES.length; index += 2) {
      results.push(
        ...(await Promise.allSettled(
          SERIES.slice(index, index + 2).map((id) =>
            fetchStation(id, controller.signal),
          ),
        )),
      );
    }
    const stations = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter(
        (station) =>
          Number.isFinite(station.lat) && Number.isFinite(station.lon),
      );
    if (!stations.length) throw new Error('INA hydrology unavailable');
    const payload = {
      status: stations.length === SERIES.length ? 'ready' : 'partial',
      retrievedAt: new Date().toISOString(),
      region: 'Corrientes · corredor Paraná',
      stations,
      disclaimer:
        'Datos observados. Los niveles de alerta y evacuación pertenecen a la metadata publicada por INA/PNA.',
    };
    cache = { payload, storedAt: Date.now() };
    return payload;
  }

  function install(middlewares) {
    middlewares.use('/api/hydrology/corrientes', async (req, res) => {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }
      if (!limiter(clientKey(req))) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': '10',
        });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        return;
      }
      const age = cache ? Date.now() - cache.storedAt : Infinity;
      if (age <= CACHE_MS) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Hydrology': 'HIT',
        });
        res.end(JSON.stringify({ ...cache.payload, status: 'cached' }));
        return;
      }
      inFlight ||= refresh().finally(() => {
        inFlight = null;
      });
      try {
        const payload = await inFlight;
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120',
        });
        res.end(JSON.stringify(payload));
      } catch {
        if (cache && age <= STALE_MS) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Hydrology': 'STALE',
          });
          res.end(JSON.stringify({ ...cache.payload, status: 'stale' }));
          return;
        }
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ error: 'Hydrology source temporarily unavailable' }),
        );
      }
    });
  }

  return {
    name: 'argentina-hydrology-proxy',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}
