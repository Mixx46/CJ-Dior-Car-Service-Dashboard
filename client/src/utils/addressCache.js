export const _cache = { data: null, fetchedAt: 0 };

export function invalidateAddressCache() {
  _cache.data = null;
  _cache.fetchedAt = 0;
}
