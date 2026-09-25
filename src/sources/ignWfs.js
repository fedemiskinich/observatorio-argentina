const IGN_WFS_ENDPOINT = 'https://wms.ign.gob.ar/geoserver/ows';

export const IGN_PUBLIC_LAYERS = Object.freeze({
  airports: Object.freeze({
    typeName: 'ign:puntos_de_transporte_aereo_GB005',
    label: 'Aeropuertos',
    category: 'transporte',
  }),
  ports: Object.freeze({
    typeName: 'ign:puntos_de_puertos_y_muelles_BB005',
    label: 'Puertos',
    category: 'transporte',
  }),
  localities: Object.freeze({
    typeName: 'ign:localidad_bahra',
    label: 'Localidades',
    category: 'territorio',
  }),
});

const ARGENTINA_LIMITS = Object.freeze({
  west: -74,
  south: -56,
  east: -52,
  north: -21,
});

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeIgnBounds(bounds) {
  if (!bounds) return null;
  const west = finite(bounds.west);
  const south = finite(bounds.south);
  const east = finite(bounds.east);
  const north = finite(bounds.north);
  if ([west, south, east, north].some((value) => value === null)) return null;
  if (west >= east || south >= north) return null;
  if (
    west < ARGENTINA_LIMITS.west ||
    east > ARGENTINA_LIMITS.east ||
    south < ARGENTINA_LIMITS.south ||
    north > ARGENTINA_LIMITS.north
  )
    return null;
  return { west, south, east, north };
}

export function buildIgnWfsUrl(layerId, { bounds = null, limit = 500 } = {}) {
  const layer = IGN_PUBLIC_LAYERS[layerId];
  if (!layer) throw new TypeError(`Capa IGN no permitida: ${layerId}`);
  const safeLimit = Math.max(1, Math.min(1000, Math.trunc(Number(limit) || 500)));
  const url = new URL(IGN_WFS_ENDPOINT);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '1.1.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeName', layer.typeName);
  url.searchParams.set('outputFormat', 'application/json');
  url.searchParams.set('srsName', 'EPSG:4326');
  url.searchParams.set('maxFeatures', String(safeLimit));
  if (bounds) {
    const safeBounds = normalizeIgnBounds(bounds);
    if (!safeBounds) throw new TypeError('Extensión IGN inválida o fuera de Argentina');
    url.searchParams.set(
      'bbox',
      `${safeBounds.west},${safeBounds.south},${safeBounds.east},${safeBounds.north},EPSG:4326`,
    );
  }
  return url.toString();
}

export async function fetchIgnFeatures(
  layerId,
  { bounds = null, limit = 500, signal, fetchImpl = fetch } = {},
) {
  const response = await fetchImpl(buildIgnWfsUrl(layerId, { bounds, limit }), {
    signal,
    headers: { Accept: 'application/geo+json, application/json' },
  });
  if (!response.ok) throw new Error(`IGN WFS respondió HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features))
    throw new Error('IGN WFS devolvió una respuesta inválida');
  if (payload.features.length > 1000)
    throw new Error('IGN WFS excedió el límite de objetos');
  return {
    type: 'FeatureCollection',
    features: payload.features,
    provenance: {
      provider: 'Instituto Geográfico Nacional',
      service: 'WFS',
      layer: IGN_PUBLIC_LAYERS[layerId].typeName,
      observed: false,
      classification: 'official-reference',
      receivedAt: new Date().toISOString(),
    },
  };
}
