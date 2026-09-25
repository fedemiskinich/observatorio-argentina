export function createHydrologySource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async getSnapshot({ signal } = {}) {
      const response = await fetchImpl('/api/hydrology/corrientes', {
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error(`Hydrology HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.stations))
        throw new Error('Malformed hydrology response');
      return payload;
    },
  };
}
