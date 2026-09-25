import * as Cesium from 'cesium';
import {
  GROUND_EXPLORER_EYE_HEIGHT_M,
  clampGroundExplorerPitch,
  clampGroundExplorerSpeed,
  groundExplorerMotion,
  isGroundExplorerControl,
} from './groundExplorerModel.js';

function editableTarget(target) {
  return Boolean(
    target?.closest?.(
      'input, textarea, select, button, [contenteditable=true]',
    ),
  );
}

function centerSurface(viewer) {
  const scene = viewer.scene;
  const center = new Cesium.Cartesian2(
    scene.canvas.clientWidth / 2,
    scene.canvas.clientHeight / 2,
  );
  if (scene.pickPositionSupported) {
    try {
      const position = scene.pickPosition(center);
      if (Cesium.Cartesian3.magnitudeSquared(position) > 1) return position;
    } catch {
      // Fall through to rendered globe and then the ellipsoid.
    }
  }
  try {
    const ray = viewer.camera.getPickRay(center);
    const position = ray && scene.globe.pick(ray, scene);
    if (position) return position;
  } catch {
    // Fall through to the ellipsoid.
  }
  return viewer.camera.pickEllipsoid(center, Cesium.Ellipsoid.WGS84);
}

function surfaceHeight(viewer, cartographic) {
  try {
    const sampled = viewer.scene.sampleHeight?.(cartographic);
    if (Number.isFinite(sampled)) return sampled;
  } catch {
    // Photorealistic tiles may not be ready; terrain is the safe fallback.
  }
  const terrain = viewer.scene.globe.getHeight?.(cartographic);
  return Number.isFinite(terrain) ? terrain : 0;
}

function buildUi() {
  const button = document.createElement('button');
  button.id = 'ground-explorer-toggle';
  button.type = 'button';
  button.title = 'Recorrer el mapa a nivel del suelo';
  button.setAttribute('aria-label', 'Activar explorador terrestre 3D');
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = '<span aria-hidden="true">3D</span><small>WALK</small>';

  const hud = document.createElement('section');
  hud.id = 'ground-explorer-hud';
  hud.hidden = true;
  hud.innerHTML = `
    <header><div><span>EXPLORADOR TERRESTRE</span><strong>RECORRIDO 3D</strong></div><button type="button" data-action="exit">VISTA AÉREA</button></header>
    <div class="ground-explorer-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>MOVER</span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd><span>MIRAR</span><kbd>SHIFT</kbd><span>RÁPIDO</span></div>
    <label>VELOCIDAD <input type="range" min="1" max="60" value="5" step="1"><output>5 m/s</output></label>
    <p role="status">Usá el mouse normalmente para explorar. ESC vuelve a la vista aérea.</p>`;
  document.getElementById('top-center-actions')?.prepend(button);
  document.body.appendChild(hud);
  return { button, hud };
}

export function createGroundExplorer(viewer) {
  if (!viewer?.scene?.canvas || !viewer?.camera)
    throw new TypeError('Ground explorer requires a Cesium viewer');
  const { button, hud } = buildUi();
  const exitButton = hud.querySelector('[data-action=exit]');
  const speedInput = hud.querySelector('input[type=range]');
  const speedOutput = hud.querySelector('output');
  const keys = new Set();
  let active = false;
  let destroyed = false;
  let lastTime = 0;

  const clampToSurface = () => {
    const cartographic = viewer.camera.positionCartographic;
    if (!cartographic) return;
    const ground = surfaceHeight(viewer, cartographic);
    if (cartographic.height > ground + 12 || cartographic.height < ground + 1) {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromRadians(
          cartographic.longitude,
          cartographic.latitude,
          ground + GROUND_EXPLORER_EYE_HEIGHT_M,
        ),
        orientation: {
          heading: viewer.camera.heading,
          pitch: clampGroundExplorerPitch(viewer.camera.pitch),
          roll: 0,
        },
      });
    }
  };

  const tick = () => {
    if (!active) return;
    const now = performance.now();
    const deltaSeconds = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    const motion = groundExplorerMotion(keys);
    const baseSpeed = clampGroundExplorerSpeed(speedInput.value);
    const distance = baseSpeed * (motion.fast ? 4 : 1) * deltaSeconds;
    if (motion.forward) viewer.camera.moveForward(distance * motion.forward);
    if (motion.right) viewer.camera.moveRight(distance * motion.right);
    if (motion.up) viewer.camera.moveUp(distance * motion.up);
    if (motion.heading)
      viewer.camera.lookRight(motion.heading * deltaSeconds * 0.9);
    if (motion.pitch) viewer.camera.lookUp(motion.pitch * deltaSeconds * 0.75);
    if (
      motion.forward ||
      motion.right ||
      motion.up ||
      motion.heading ||
      motion.pitch
    ) {
      clampToSurface();
      viewer.scene.requestRender();
    }
  };

  const enter = () => {
    if (active || destroyed) return false;
    const position = centerSurface(viewer);
    if (!position) return false;
    const target = Cesium.Cartographic.fromCartesian(position);
    const ground = surfaceHeight(viewer, target);
    viewer.trackedEntity = undefined;
    viewer.camera.cancelFlight();
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromRadians(
        target.longitude,
        target.latitude,
        ground + GROUND_EXPLORER_EYE_HEIGHT_M,
      ),
      orientation: {
        heading: viewer.camera.heading,
        pitch: 0,
        roll: 0,
      },
    });
    active = true;
    lastTime = performance.now();
    keys.clear();
    hud.hidden = false;
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', 'Salir del explorador terrestre 3D');
    document.body.classList.add('ground-explorer-active');
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    viewer.scene.requestRender();
    return true;
  };

  const exit = ({ aerial = true } = {}) => {
    if (!active) return false;
    active = false;
    keys.clear();
    hud.hidden = true;
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Activar explorador terrestre 3D');
    document.body.classList.remove('ground-explorer-active');
    if (aerial) {
      const current = viewer.camera.positionCartographic;
      const ground = surfaceHeight(viewer, current);
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(
          current.longitude,
          current.latitude,
          ground + 1200,
        ),
        orientation: {
          heading: viewer.camera.heading,
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 1.2,
      });
    }
    return true;
  };

  const onKeyDown = (event) => {
    if (!active || editableTarget(event.target)) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      exit();
      return;
    }
    if (!isGroundExplorerControl(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
  };
  const onKeyUp = (event) => keys.delete(event.code);
  const onBlur = () => keys.clear();
  const onSpeed = () => {
    const speed = clampGroundExplorerSpeed(speedInput.value);
    speedInput.value = String(speed);
    speedOutput.value = `${speed} m/s`;
  };
  const onToggle = () => (active ? exit() : enter());

  button.addEventListener('click', onToggle);
  exitButton.addEventListener('click', () => exit());
  speedInput.addEventListener('input', onSpeed);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  const removeTick = viewer.clock.onTick.addEventListener(tick);

  return {
    enter,
    exit,
    get active() {
      return active;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      exit({ aerial: false });
      removeTick();
      button.removeEventListener('click', onToggle);
      speedInput.removeEventListener('input', onSpeed);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      button.remove();
      hud.remove();
    },
  };
}
