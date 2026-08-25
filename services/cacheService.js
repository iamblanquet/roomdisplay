/**
 * Cache en memoria con tiempo de vida (TTL) configurable por sala.
 * Evita saturar las cuotas y límites de velocidad (429) de Microsoft Graph API.
 */
class CacheService {
  constructor(defaultTtlSeconds = 60) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.cache = new Map();
  }

  /**
   * Obtiene un valor de la caché si no ha expirado.
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Almacena un valor en la caché con un TTL específico o el por defecto.
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttlSeconds] 
   */
  set(key, value, ttlSeconds) {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Invalida una entrada de caché específica.
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Limpia toda la caché.
   */
  clear() {
    this.cache.clear();
  }
}

module.exports = CacheService;
