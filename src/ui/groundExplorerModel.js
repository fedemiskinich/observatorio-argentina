export const GROUND_EXPLORER_EYE_HEIGHT_M = 2.2;
export const GROUND_EXPLORER_MIN_SPEED_MPS = 1;
export const GROUND_EXPLORER_MAX_SPEED_MPS = 60;

export function clampGroundExplorerSpeed(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return 5;
  return Math.min(
    GROUND_EXPLORER_MAX_SPEED_MPS,
    Math.max(GROUND_EXPLORER_MIN_SPEED_MPS, speed),
  );
}

export function clampGroundExplorerPitch(value) {
  const pitch = Number(value);
  if (!Number.isFinite(pitch)) return 0;
  return Math.min(Math.PI * 0.42, Math.max(-Math.PI * 0.42, pitch));
}

export function groundExplorerMotion(keys = new Set()) {
  return {
    forward: Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
    right: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
    up: Number(keys.has('KeyR')) - Number(keys.has('KeyF')),
    heading: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    pitch: Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown')),
    fast: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

export function isGroundExplorerControl(code) {
  return [
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'KeyR',
    'KeyF',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ShiftLeft',
    'ShiftRight',
  ].includes(code);
}
