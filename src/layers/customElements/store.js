import { customElementsFromGeoJson, normalizeCustomElement } from './model.js';

export const CUSTOM_ELEMENTS_STORAGE_KEY =
  'observatorio-argentina:custom-elements:v1';

export function createCustomElementsStore({
  storage = globalThis.localStorage,
  idFactory,
} = {}) {
  let elements = readStored(storage, idFactory);
  const listeners = new Set();
  const publish = () => listeners.forEach((listener) => listener(elements));
  const persist = () =>
    storage?.setItem?.(CUSTOM_ELEMENTS_STORAGE_KEY, JSON.stringify(elements));
  return {
    list: () => elements.slice(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    upsert(input) {
      const element = normalizeCustomElement(input, { idFactory });
      elements = [...elements.filter(({ id }) => id !== element.id), element];
      persist();
      publish();
      return element;
    },
    remove(id) {
      const next = elements.filter((element) => element.id !== id);
      if (next.length === elements.length) return false;
      elements = next;
      persist();
      publish();
      return true;
    },
    importGeoJson(payload) {
      const imported = customElementsFromGeoJson(payload, { idFactory });
      const merged = new Map(elements.map((element) => [element.id, element]));
      for (const element of imported) merged.set(element.id, element);
      elements = [...merged.values()];
      persist();
      publish();
      return imported.length;
    },
  };
}

function readStored(storage, idFactory) {
  try {
    const parsed = JSON.parse(
      storage?.getItem?.(CUSTOM_ELEMENTS_STORAGE_KEY) || '[]',
    );
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeCustomElement(item, { idFactory }))
      : [];
  } catch {
    return [];
  }
}
