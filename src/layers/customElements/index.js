import * as Cesium from 'cesium';
import { CUSTOM_ELEMENT_CATEGORIES, customElementsToGeoJson } from './model.js';
import { createCustomElementsStore } from './store.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const statusLabels = Object.freeze({
  operational: 'OPERATIVO',
  maintenance: 'MANTENIMIENTO',
  offline: 'FUERA DE LÍNEA',
  unknown: 'SIN VERIFICAR',
});

function elementDescription(element) {
  const category = CUSTOM_ELEMENT_CATEGORIES[element.category];
  const links = [
    element.mediaUrl
      ? `<a href="${escapeHtml(element.mediaUrl)}" target="_blank" rel="noopener noreferrer">ABRIR TRANSMISIÓN / MULTIMEDIA</a>`
      : '',
    element.sourceUrl
      ? `<a href="${escapeHtml(element.sourceUrl)}" target="_blank" rel="noopener noreferrer">ABRIR FUENTE OFICIAL</a>`
      : '',
  ].filter(Boolean);
  return `<div style="font-family:system-ui;padding:4px"><h3 style="color:${category.color}">${escapeHtml(element.name)}</h3><p><b>${escapeHtml(category.label)}</b> · ${escapeHtml(statusLabels[element.status])}</p>${element.description ? `<p>${escapeHtml(element.description)}</p>` : ''}${element.source ? `<p>Fuente: ${escapeHtml(element.source)}</p>` : ''}${links.length ? `<p style="display:flex;gap:12px;flex-wrap:wrap">${links.join('')}</p>` : ''}</div>`;
}

function createManager(store, { pickLocation }) {
  const open = document.createElement('button');
  open.id = 'custom-elements-open';
  open.type = 'button';
  open.textContent = '+ ELEMENTO';
  open.hidden = true;

  const panel = document.createElement('section');
  panel.id = 'custom-elements-manager';
  panel.hidden = true;
  panel.innerHTML = `
    <header><div><span>CATÁLOGO LOCAL</span><strong>Elementos del mapa</strong></div><button type="button" data-action="close" aria-label="Cerrar">×</button></header>
    <nav><button type="button" data-action="new">NUEVO</button><button type="button" data-action="import">IMPORTAR GEOJSON</button><button type="button" data-action="export">EXPORTAR</button><input type="file" accept="application/geo+json,application/json,.geojson,.json" hidden></nav>
    <form hidden>
      <input name="id" type="hidden">
      <label>Nombre<input name="name" required maxlength="120" placeholder="Ej. Hospital Escuela"></label>
      <div class="custom-elements-grid"><label>Categoría<select name="category">${Object.entries(
        CUSTOM_ELEMENT_CATEGORIES,
      )
        .map(
          ([value, item]) => `<option value="${value}">${item.label}</option>`,
        )
        .join(
          '',
        )}</select></label><label>Importancia<select name="importance"><option value="local">Local</option><option value="provincial">Provincial</option><option value="national">Nacional</option><option value="critical">Crítica</option></select></label></div>
      <div class="custom-elements-grid"><label>Latitud<input name="lat" type="number" step="any" min="-90" max="90" required></label><label>Longitud<input name="lon" type="number" step="any" min="-180" max="180" required></label></div>
      <button type="button" data-action="pick">⌖ SELECCIONAR EN EL MAPA</button>
      <div class="custom-elements-grid"><label>Estado<select name="status"><option value="unknown">Sin verificar</option><option value="operational">Operativo</option><option value="maintenance">Mantenimiento</option><option value="offline">Fuera de línea</option></select></label><label>Fuente<input name="source" maxlength="160" placeholder="Organismo responsable"></label></div>
      <label>Descripción<textarea name="description" maxlength="1200" rows="3"></textarea></label>
      <label>URL oficial<input name="sourceUrl" type="url" placeholder="https://..."></label>
      <label>URL de cámara o multimedia<input name="mediaUrl" type="url" placeholder="https://..."></label>
      <p class="custom-elements-form-status" role="status"></p>
      <div class="custom-elements-actions"><button type="button" data-action="cancel">CANCELAR</button><button type="submit">GUARDAR ELEMENTO</button></div>
    </form>
    <div class="custom-elements-list"></div>`;
  document.body.append(open, panel);

  const form = panel.querySelector('form');
  const list = panel.querySelector('.custom-elements-list');
  const fileInput = panel.querySelector('input[type=file]');
  const status = panel.querySelector('.custom-elements-form-status');
  const removers = [];
  const bind = (node, event, fn) => {
    node.addEventListener(event, fn);
    removers.push(() => node.removeEventListener(event, fn));
  };
  const setForm = (element = {}) => {
    form.reset();
    for (const [key, value] of Object.entries(element)) {
      if (form.elements.namedItem(key))
        form.elements.namedItem(key).value = value ?? '';
    }
    status.textContent = '';
    form.hidden = false;
  };
  const render = () => {
    const elements = store.list();
    list.innerHTML = elements.length
      ? elements
          .map((element) => {
            const category = CUSTOM_ELEMENT_CATEGORIES[element.category];
            return `<article data-id="${escapeHtml(element.id)}" style="--element-color:${category.color}"><span>${category.icon}</span><div><strong>${escapeHtml(element.name)}</strong><small>${escapeHtml(category.label)} · ${escapeHtml(statusLabels[element.status])}</small></div><button type="button" data-action="edit">EDITAR</button><button type="button" data-action="delete">ELIMINAR</button></article>`;
          })
          .join('')
      : '<p class="custom-elements-empty">Todavía no agregaste elementos.</p>';
  };

  bind(open, 'click', () => {
    panel.hidden = false;
    render();
  });
  bind(panel, 'click', async (event) => {
    const action = event.target?.closest?.('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'close') panel.hidden = true;
    if (action === 'new') setForm();
    if (action === 'cancel') form.hidden = true;
    if (action === 'import') fileInput.click();
    if (action === 'export') downloadGeoJson(store.list());
    if (action === 'pick') {
      status.textContent = 'Hacé clic sobre la ubicación en el mapa…';
      panel.hidden = true;
      try {
        const { lat, lon } = await pickLocation();
        form.elements.lat.value = lat.toFixed(7);
        form.elements.lon.value = lon.toFixed(7);
        status.textContent = 'Ubicación seleccionada correctamente.';
      } catch (error) {
        status.textContent =
          error?.message || 'No se pudo seleccionar la ubicación.';
      } finally {
        panel.hidden = false;
      }
    }
    const article = event.target?.closest?.('article[data-id]');
    if (action === 'edit' && article) {
      const element = store.list().find(({ id }) => id === article.dataset.id);
      if (element) setForm(element);
    }
    if (action === 'delete' && article) {
      const element = store.list().find(({ id }) => id === article.dataset.id);
      if (element && confirm(`¿Eliminar “${element.name}” del mapa?`))
        store.remove(element.id);
    }
  });
  bind(form, 'submit', (event) => {
    event.preventDefault();
    try {
      store.upsert(Object.fromEntries(new FormData(form)));
      form.hidden = true;
      render();
    } catch (error) {
      status.textContent = error?.message || 'No se pudo guardar el elemento.';
    }
  });
  bind(fileInput, 'change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const count = store.importGeoJson(JSON.parse(await file.text()));
      render();
      status.textContent = `${count} elementos importados.`;
    } catch (error) {
      status.textContent = error?.message || 'El archivo no es válido.';
      form.hidden = false;
    } finally {
      fileInput.value = '';
    }
  });
  render();
  return {
    show() {
      open.hidden = false;
    },
    hide() {
      open.hidden = true;
      panel.hidden = true;
      form.hidden = true;
    },
    render,
    destroy() {
      removers.splice(0).forEach((remove) => remove());
      open.remove();
      panel.remove();
    },
  };
}

function downloadGeoJson(elements) {
  const blob = new Blob(
    [JSON.stringify(customElementsToGeoJson(elements), null, 2)],
    { type: 'application/geo+json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `observatorio-elementos-${new Date().toISOString().slice(0, 10)}.geojson`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createCustomElementsLayer({
  store = createCustomElementsStore(),
} = {}) {
  let viewer;
  let dataSource;
  let manager;
  let unsubscribe;
  let enabled = false;
  let pickHandler;

  const render = () => {
    if (!dataSource) return;
    dataSource.entities.removeAll();
    for (const element of store.list()) {
      const category = CUSTOM_ELEMENT_CATEGORIES[element.category];
      const color = Cesium.Color.fromCssColorString(category.color);
      dataSource.entities.add({
        id: `custom-${element.id}`,
        name: element.name,
        description: elementDescription(element),
        position: Cesium.Cartesian3.fromDegrees(element.lon, element.lat, 12),
        point: {
          pixelSize: element.importance === 'critical' ? 18 : 13,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${category.icon} ${element.name}\n${category.label} · ${statusLabels[element.status]}`,
          font: '700 12px JetBrains Mono',
          fillColor: Cesium.Color.WHITE,
          outlineColor: color,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.82),
          backgroundPadding: new Cesium.Cartesian2(9, 6),
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(18, -16),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            2500000,
          ),
          scaleByDistance: new Cesium.NearFarScalar(50000, 1, 2500000, 0.62),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: element,
      });
    }
    manager?.render();
    viewer?.scene?.requestRender?.();
  };

  const pickLocation = () =>
    new Promise((resolve, reject) => {
      pickHandler?.destroy();
      const canvas = viewer.scene.canvas;
      canvas.classList.add('custom-elements-picking');
      pickHandler = new Cesium.ScreenSpaceEventHandler(canvas);
      pickHandler.setInputAction(({ position }) => {
        const cartesian = viewer.camera.pickEllipsoid(
          position,
          Cesium.Ellipsoid.WGS84,
        );
        if (!cartesian) return;
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        pickHandler.destroy();
        pickHandler = null;
        canvas.classList.remove('custom-elements-picking');
        resolve({
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          lon: Cesium.Math.toDegrees(cartographic.longitude),
        });
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      setTimeout(() => {
        if (!pickHandler) return;
        pickHandler.destroy();
        pickHandler = null;
        canvas.classList.remove('custom-elements-picking');
        reject(
          new Error('La selección de ubicación venció. Intentá nuevamente.'),
        );
      }, 30000);
    });

  return {
    id: 'custom-map-elements',
    name: 'Elementos personalizados',
    icon: '◆',
    source: 'CATÁLOGO LOCAL',
    init(nextViewer) {
      viewer = nextViewer;
      dataSource = new Cesium.CustomDataSource('custom-map-elements');
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
      manager = createManager(store, { pickLocation });
      unsubscribe = store.subscribe(render);
      render();
    },
    enable() {
      enabled = true;
      dataSource.show = true;
      manager.show();
    },
    disable() {
      enabled = false;
      dataSource.show = false;
      manager.hide();
    },
    update() {
      return Promise.resolve(enabled);
    },
    destroy() {
      pickHandler?.destroy();
      unsubscribe?.();
      manager?.destroy();
      if (dataSource && viewer) viewer.dataSources.remove(dataSource, true);
      viewer = dataSource = manager = null;
      enabled = false;
    },
    getStats() {
      return { count: store.list().length };
    },
  };
}

export { createCustomElementsStore } from './store.js';
export * from './model.js';
