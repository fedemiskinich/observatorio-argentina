export const HYDROLOGY_STATUS = Object.freeze({
  evacuation: { label: 'EVACUACIÓN', color: '#ff3b3b', rank: 5 },
  alert: { label: 'ALERTA', color: '#ff8a31', rank: 4 },
  watch: { label: 'VIGILANCIA', color: '#ffd84d', rank: 3 },
  normal: { label: 'NORMAL', color: '#43e6a2', rank: 2 },
  low: { label: 'AGUAS BAJAS', color: '#54a8ff', rank: 1 },
  unknown: { label: 'SIN DATO', color: '#8aa0aa', rank: 0 },
});

export function statusPresentation(status) {
  return HYDROLOGY_STATUS[status] || HYDROLOGY_STATUS.unknown;
}

export function trendLabel(trend, deltaM) {
  const delta = Number.isFinite(deltaM)
    ? ` (${deltaM >= 0 ? '+' : ''}${deltaM.toFixed(2)} m)`
    : '';
  return `${{ rising: 'CRECIENTE', falling: 'BAJANTE', stable: 'ESTABLE' }[trend] || 'SIN TENDENCIA'}${delta}`;
}

export function stationReport(station) {
  const presentation = statusPresentation(station?.status);
  return {
    title: `${station?.name || 'Estación'} · ${station?.river || 'Río'}`,
    level: Number.isFinite(station?.valueM)
      ? `${station.valueM.toFixed(2)} m`
      : 'Sin dato',
    status: presentation.label,
    color: presentation.color,
    trend: trendLabel(station?.trend, station?.deltaM),
    thresholds:
      [
        Number.isFinite(station?.alertLevelM)
          ? `Alerta ${station.alertLevelM.toFixed(2)} m`
          : null,
        Number.isFinite(station?.evacuationLevelM)
          ? `Evacuación ${station.evacuationLevelM.toFixed(2)} m`
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Sin umbrales publicados',
  };
}

export function stationMapLabel(station) {
  const report = stationReport(station);
  const trendSymbol =
    { rising: '▲', falling: '▼', stable: '●' }[station?.trend] || '◆';
  return `${station?.name || 'Estación'}\nNIVEL ${report.level}\n${trendSymbol} ${report.trend} · ${report.status}`;
}
