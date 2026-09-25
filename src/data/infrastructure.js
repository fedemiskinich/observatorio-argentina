import { createLocalGeoJsonLayer } from './localGeojsonCore.js';
import { buildIgnWfsUrl } from '../sources/ignWfs.js';
import * as Cesium from 'cesium';

// Resolved by Vite in builds and relative to this module in other consumers.
const datacentersUrl = new URL(
  './local_data/datacenters/datacenters.geojsonl',
  import.meta.url,
).href;
const damsUrl = new URL('./local_data/dams/dams.geojsonl', import.meta.url)
  .href;

const ARGENTINA_BOUNDS = Object.freeze({
  west: -74,
  south: -56,
  east: -52,
  north: -21,
});

export function ignBoundsForViewer(viewer) {
  const rectangle = viewer?.camera?.computeViewRectangle?.(
    viewer?.scene?.globe?.ellipsoid,
  );
  if (!rectangle) return null;
  const raw = {
    west: Cesium.Math.toDegrees(rectangle.west),
    south: Cesium.Math.toDegrees(rectangle.south),
    east: Cesium.Math.toDegrees(rectangle.east),
    north: Cesium.Math.toDegrees(rectangle.north),
  };
  if (raw.west > raw.east) return null;
  const bounds = {
    west: Math.max(ARGENTINA_BOUNDS.west, raw.west),
    south: Math.max(ARGENTINA_BOUNDS.south, raw.south),
    east: Math.min(ARGENTINA_BOUNDS.east, raw.east),
    north: Math.min(ARGENTINA_BOUNDS.north, raw.north),
  };
  return bounds.west < bounds.east && bounds.south < bounds.north
    ? bounds
    : null;
}

function ignUrlForViewer(layerId) {
  return (viewer) => {
    const bounds = ignBoundsForViewer(viewer);
    return buildIgnWfsUrl(layerId, bounds ? { bounds, limit: 1000 } : { limit: 1000 });
  };
}

/**
 * Create fresh datacenter and dam layers without starting or loading them.
 * @param {object} services Caller-owned context, overlay and render operations.
 * @returns {object[]} Datacenters then dams, with stable standalone identities.
 */
export function createInfrastructureLayers(services) {
  const datacenters = createLocalGeoJsonLayer(
    {
      id: 'local-datacenters',
      url: datacentersUrl,
      name: 'Datacenters',
      color: '#00ffff', // Cyan
      icon: '▣',
      source: 'Local',
      labels: true,
      labelMax: 700,
      labelGridPx: 138,
    },
    services,
  );

  const dams = createLocalGeoJsonLayer(
    {
      id: 'local-dams',
      url: damsUrl,
      name: 'Dams',
      color: '#0088ff', // Blue
      icon: '▰',
      source: 'USACE',
      labels: true,
      labelMax: 900,
      labelGridPx: 132,
    },
    services,
  );

  const airports = createLocalGeoJsonLayer(
    {
      id: 'ign-airports',
      url: buildIgnWfsUrl('airports', { limit: 1000 }),
      urlForViewer: ignUrlForViewer('airports'),
      refreshOnMove: true,
      name: 'Aeropuertos IGN',
      color: '#7dd3fc',
      icon: '✈',
      source: 'Instituto Geográfico Nacional · WFS',
      labels: true,
      labelMax: 500,
      labelGridPx: 150,
    },
    services,
  );

  const ports = createLocalGeoJsonLayer(
    {
      id: 'ign-ports',
      url: buildIgnWfsUrl('ports', { limit: 1000 }),
      urlForViewer: ignUrlForViewer('ports'),
      refreshOnMove: true,
      name: 'Puertos IGN',
      color: '#38bdf8',
      icon: '⚓',
      source: 'Instituto Geográfico Nacional · WFS',
      labels: true,
      labelMax: 350,
      labelGridPx: 150,
    },
    services,
  );

  const localities = createLocalGeoJsonLayer(
    {
      id: 'ign-localities',
      url: buildIgnWfsUrl('localities', { limit: 1000 }),
      urlForViewer: ignUrlForViewer('localities'),
      refreshOnMove: true,
      name: 'Localidades IGN',
      color: '#fbbf24',
      icon: '●',
      source: 'Instituto Geográfico Nacional · BAHRA · WFS',
      labels: true,
      labelMax: 650,
      labelGridPx: 145,
    },
    services,
  );

  return [datacenters, dams, airports, ports, localities];
}
