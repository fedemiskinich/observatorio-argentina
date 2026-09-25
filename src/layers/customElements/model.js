export const CUSTOM_ELEMENT_CATEGORIES = Object.freeze({
  building: Object.freeze({
    label: 'Edificio importante',
    icon: '◆',
    color: '#63e6ff',
  }),
  camera: Object.freeze({
    label: 'Cámara pública',
    icon: '◉',
    color: '#a78bfa',
  }),
  hospital: Object.freeze({
    label: 'Hospital / salud',
    icon: '✚',
    color: '#43e6a2',
  }),
  police: Object.freeze({
    label: 'Seguridad / emergencia',
    icon: '★',
    color: '#60a5fa',
  }),
  government: Object.freeze({
    label: 'Organismo público',
    icon: '▣',
    color: '#fbbf24',
  }),
  infrastructure: Object.freeze({
    label: 'Infraestructura crítica',
    icon: '⬢',
    color: '#fb7185',
  }),
  shelter: Object.freeze({
    label: 'Refugio / evacuación',
    icon: '⌂',
    color: '#f97316',
  }),
  other: Object.freeze({ label: 'Otro elemento', icon: '●', color: '#cbd5e1' }),
});

const clean = (value, max = 300) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const finite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function normalizeCustomElement(
  input = {},
  { idFactory = () => crypto.randomUUID() } = {},
) {
  const lat = finite(input.lat);
  const lon = finite(input.lon);
  const name = clean(input.name, 120);
  if (!name) throw new TypeError('El nombre es obligatorio');
  if (lat === null || lat < -90 || lat > 90)
    throw new TypeError('Latitud inválida');
  if (lon === null || lon < -180 || lon > 180)
    throw new TypeError('Longitud inválida');
  const category = Object.hasOwn(CUSTOM_ELEMENT_CATEGORIES, input.category)
    ? input.category
    : 'other';
  const mediaUrl = safeHttpUrl(input.mediaUrl);
  const sourceUrl = safeHttpUrl(input.sourceUrl);
  return Object.freeze({
    id:
      clean(input.id, 100) ||
      (typeof idFactory === 'function' ? idFactory() : crypto.randomUUID()),
    name,
    category,
    lat,
    lon,
    importance: ['local', 'provincial', 'national', 'critical'].includes(
      input.importance,
    )
      ? input.importance
      : 'local',
    status: ['operational', 'maintenance', 'offline', 'unknown'].includes(
      input.status,
    )
      ? input.status
      : 'unknown',
    description: clean(input.description, 1200),
    source: clean(input.source, 160),
    sourceUrl,
    mediaUrl,
    updatedAt: clean(input.updatedAt, 40) || new Date().toISOString(),
  });
}

export function safeHttpUrl(value) {
  const text = clean(value, 1000);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : '';
  } catch {
    return '';
  }
}

export function customElementsFromGeoJson(payload, options) {
  if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features))
    throw new TypeError('Se esperaba un GeoJSON FeatureCollection');
  return payload.features.map((feature, index) => {
    if (
      feature?.geometry?.type !== 'Point' ||
      !Array.isArray(feature.geometry.coordinates)
    )
      throw new TypeError(`El elemento ${index + 1} no es un punto GeoJSON`);
    const [lon, lat] = feature.geometry.coordinates;
    return normalizeCustomElement(
      {
        ...feature.properties,
        id: feature.id || feature.properties?.id,
        lat,
        lon,
      },
      options,
    );
  });
}

export function customElementsToGeoJson(elements = []) {
  return {
    type: 'FeatureCollection',
    name: 'Observatorio Argentina · Elementos personalizados',
    features: elements.map((element) => ({
      type: 'Feature',
      id: element.id,
      geometry: { type: 'Point', coordinates: [element.lon, element.lat] },
      properties: Object.fromEntries(
        Object.entries(element).filter(
          ([key]) => !['id', 'lat', 'lon'].includes(key),
        ),
      ),
    })),
  };
}
