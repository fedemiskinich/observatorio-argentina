import * as Cesium from 'cesium';
import { stationMapLabel, stationReport, statusPresentation } from './model.js';
export { createHydrologySource } from './source.js';
export * from './model.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createPanel(onDismiss) {
  const panel = document.createElement('section');
  panel.id = 'hydrology-report';
  panel.hidden = true;
  panel.innerHTML = `
    <header><div><span>RIESGO HÍDRICO</span><strong>Corrientes · Río Paraná</strong></div><button type="button" aria-label="Cerrar informe">×</button></header>
    <div class="hydrology-report-summary"></div>
    <div class="hydrology-stations"></div>
    <footer>Fuente: INA SIyAH / Prefectura Naval Argentina · Datos observados, no simulación de anegamiento.</footer>`;
  panel.querySelector('button').addEventListener('click', () => {
    panel.hidden = true;
    onDismiss?.();
  });
  document.body.appendChild(panel);
  return panel;
}

function renderPanel(panel, payload) {
  const stations = payload?.stations || [];
  const ordered = [...stations].sort(
    (a, b) =>
      statusPresentation(b.status).rank - statusPresentation(a.status).rank,
  );
  const highest = ordered[0];
  const headline = highest ? stationReport(highest) : null;
  panel.querySelector('.hydrology-report-summary').innerHTML = headline
    ? `<b style="color:${headline.color}">${escapeHtml(headline.status)}</b><span>Estado más relevante: ${escapeHtml(headline.title)}</span>`
    : '<span>Sin observaciones disponibles</span>';
  panel.querySelector('.hydrology-stations').innerHTML = ordered
    .map((station) => {
      const report = stationReport(station);
      const observedAt = station.observedAt
        ? new Date(station.observedAt).toLocaleString('es-AR')
        : 'Sin fecha';
      return `<article style="--hydro-color:${report.color}"><div><strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.trend)}</span></div><b>${escapeHtml(report.level)}</b><small>${escapeHtml(report.status)} · ${escapeHtml(report.thresholds)}</small><time>${escapeHtml(observedAt)}</time></article>`;
    })
    .join('');
  panel.hidden = false;
}

function stationDescription(station, report) {
  const observedAt = station.observedAt
    ? new Date(station.observedAt).toLocaleString('es-AR')
    : 'Sin fecha';
  return `<div style="font-family:system-ui;padding:4px 2px"><h3 style="margin:0 0 10px;color:${report.color}">${escapeHtml(report.title)}</h3><table><tbody><tr><th style="text-align:left;padding-right:14px">Nivel</th><td>${escapeHtml(report.level)}</td></tr><tr><th style="text-align:left;padding-right:14px">Estado</th><td>${escapeHtml(report.status)}</td></tr><tr><th style="text-align:left;padding-right:14px">Tendencia</th><td>${escapeHtml(report.trend)}</td></tr><tr><th style="text-align:left;padding-right:14px">Umbrales</th><td>${escapeHtml(report.thresholds)}</td></tr><tr><th style="text-align:left;padding-right:14px">Observación</th><td>${escapeHtml(observedAt)}</td></tr><tr><th style="text-align:left;padding-right:14px">Organismo</th><td>${escapeHtml(station.owner || 'INA / PNA')}</td></tr></tbody></table><p style="margin:12px 0 0"><a href="${escapeHtml(station.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir ficha oficial de INA</a></p></div>`;
}

export function createHydrologyLayer({ source } = {}) {
  if (typeof source?.getSnapshot !== 'function')
    throw new TypeError('Hydrology requires a snapshot source');
  let viewer = null;
  let dataSource = null;
  let panel = null;
  let request = null;
  let enabled = false;
  let count = 0;
  let lastUpdate = null;
  let error = null;
  let panelDismissed = false;

  return {
    id: 'argentina-hydrology',
    name: 'Riesgo hídrico · Corrientes',
    icon: '≋',
    source: 'INA SIyAH · LIVE',
    updateInterval: 10 * 60_000,
    init(nextViewer) {
      viewer = nextViewer;
      dataSource = new Cesium.CustomDataSource('argentina-hydrology');
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
      panel = createPanel(() => {
        panelDismissed = true;
      });
    },
    enable() {
      enabled = true;
      panelDismissed = false;
      if (dataSource) dataSource.show = true;
      if (panel && count) panel.hidden = false;
    },
    disable() {
      enabled = false;
      request?.abort();
      if (dataSource) dataSource.show = false;
      if (panel) panel.hidden = true;
    },
    async update() {
      if (!enabled || !dataSource) return false;
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const payload = await source.getSnapshot({ signal: current.signal });
        if (current.signal.aborted || request !== current || !enabled)
          return false;
        dataSource.entities.removeAll();
        for (const station of payload.stations) {
          const report = stationReport(station);
          const color = Cesium.Color.fromCssColorString(report.color);
          dataSource.entities.add({
            id: station.id,
            name: `${station.name} · Riesgo hídrico`,
            description: stationDescription(station, report),
            position: Cesium.Cartesian3.fromDegrees(
              station.lon,
              station.lat,
              8,
            ),
            point: {
              pixelSize:
                station.status === 'alert' || station.status === 'evacuation'
                  ? 18
                  : 13,
              color: color.withAlpha(0.9),
              outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: stationMapLabel(station),
              font: '700 13px JetBrains Mono',
              fillColor: Cesium.Color.WHITE,
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.82),
              backgroundPadding: new Cesium.Cartesian2(10, 7),
              outlineColor: color,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              pixelOffset: new Cesium.Cartesian2(18, -18),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                2500000,
              ),
              scaleByDistance: new Cesium.NearFarScalar(
                50000,
                1,
                2500000,
                0.62,
              ),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: station,
          });
        }
        count = payload.stations.length;
        lastUpdate = Date.now();
        error = null;
        if (!panelDismissed) renderPanel(panel, payload);
        viewer.scene.requestRender();
        return true;
      } catch (cause) {
        if (current.signal.aborted || request !== current) return false;
        error = cause?.message || 'Hydrology unavailable';
        return false;
      } finally {
        if (request === current) request = null;
      }
    },
    destroy() {
      request?.abort();
      panel?.remove();
      panel = null;
      if (dataSource && viewer) viewer.dataSources.remove(dataSource, true);
      dataSource = null;
      viewer = null;
      enabled = false;
    },
    getStats() {
      return { count, lastUpdate, error };
    },
  };
}
