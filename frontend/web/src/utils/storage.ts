type StorageBackend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export type StorageResult<T> =
  { ok: true; value: T } | { ok: false; reason: 'missing' | 'invalid' | 'unavailable' }

/** 预检纯JSON树，避免执行getter/toJSON或静默丢失资料。 / Validate a plain JSON tree before serialization.
 * 参数/Params: 值与当前祖先集合 / Value and active ancestors. 返回/Returns: void；非法值抛错，无外部副作用 / Throws on invalid data.
 */
function checkJsonValue(value: unknown, ancestors = new WeakSet<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'object' || ancestors.has(value)) throw new TypeError('Invalid JSON value')
  const array = Array.isArray(value)
  const prototype = Object.getPrototypeOf(value)
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null)
    throw new TypeError('Invalid JSON object')
  const keys = Reflect.ownKeys(value)
  if (array && keys.length !== value.length + 1) throw new TypeError('Invalid JSON array')
  ancestors.add(value)
  for (const key of keys) {
    if (array && key === 'length') continue
    if (
      typeof key !== 'string' ||
      (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
    )
      throw new TypeError('Invalid JSON key')
    const property = Object.getOwnPropertyDescriptor(value, key)
    if (!property?.enumerable || !('value' in property))
      throw new TypeError('Invalid JSON property')
    checkJsonValue(property.value, ancestors)
  }
  ancestors.delete(value)
}

/** 隔离本地偏好数据；不自行保存登录凭据。 / Namespaced preferences; never persists credentials automatically. */
export class JsonStorage {
  private readonly namespace: string
  private readonly storage: StorageBackend | undefined
  /** 创建惰性存储封装。 / Create a lazy storage adapter.
   * 参数/Params: 非空命名空间，可选存储后端 / Namespace and optional backend. 无读写 / No I/O.
   */
  constructor(namespace: string, storage?: StorageBackend) {
    if (typeof namespace !== 'string' || !/^[a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*$/.test(namespace))
      throw new TypeError('Invalid storage namespace')
    this.namespace = namespace
    this.storage = storage
  }

  /** 生成隔离键。 / Build a namespaced key.
   * 参数/Params: 非空、不含冒号的键 / Nonempty key without colons. 返回/Returns: 隔离键；非法键抛错 / Key or TypeError.
   */
  private key(key: string): string {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key))
      throw new TypeError('Invalid storage key')
    return `${this.namespace}:${key}`
  }

  /** 惰性访问浏览器后端。 / Resolve the browser backend lazily.
   * 参数/Params: 无 / None. 返回/Returns: 后端；禁用或无浏览器时抛错 / Backend or access error.
   */
  private backend(): StorageBackend {
    return this.storage ?? window.localStorage
  }

  /** 读取并校验数据，不把缺失或失败当成默认值。 / Read and parse without masking absence or failure.
   * 参数/Params: 键与领域解析器 / Key and domain parser. 返回/Returns: 成功/缺失/损坏/不可用；不修改存储 / No writes.
   */
  read<T>(key: string, parse: (value: unknown) => T): StorageResult<T> {
    const fullKey = this.key(key)
    let raw: string | null
    try {
      raw = this.backend().getItem(fullKey)
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
    if (raw === null) return { ok: false, reason: 'missing' }
    try {
      return { ok: true, value: parse(JSON.parse(raw) as unknown) }
    } catch {
      return { ok: false, reason: 'invalid' }
    }
  }

  /** 写入 JSON，明确报告序列化或配额失败。 / Write JSON with explicit serialization/quota failure.
   * 参数/Params: 键与JSON值 / Key and JSON value. 返回/Returns: 结果；成功时只更新此命名键 / Writes only this key.
   */
  write(key: string, value: JsonValue): StorageResult<undefined> {
    const fullKey = this.key(key)
    let raw: string
    try {
      checkJsonValue(value)
      raw = JSON.stringify(value)
    } catch {
      return { ok: false, reason: 'invalid' }
    }
    try {
      this.backend().setItem(fullKey, raw)
      return { ok: true, value: undefined }
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
  }

  /** 删除本封装的指定键，不清空其他资料。 / Remove one namespaced key without clearing other data.
   * 参数/Params: 键 / Key. 返回/Returns: 成功或不可用；成功时删除该键 / Result; removes this key on success.
   */
  remove(key: string): StorageResult<undefined> {
    const fullKey = this.key(key)
    try {
      this.backend().removeItem(fullKey)
      return { ok: true, value: undefined }
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
  }
}
