import { afterEach, expect, it, vi } from 'vitest'
import { JsonStorage } from './storage'

/** 创建不访问浏览器的隔离存储。 / Create in-memory storage; no browser side effects. */
function createBackend() {
  const values = new Map<string, string>()
  return {
    /** 读取单键或返回null。 / Return one stored value or null. */
    getItem(key: string): string | null {
      return values.get(key) ?? null
    },
    /** 保存测试文本，无外部副作用。 / Store fixture text without external effects. */
    setItem(key: string, value: string): void {
      values.set(key, value)
    },
    /** 删除测试单键。 / Remove one fixture key. */
    removeItem(key: string): void {
      values.delete(key)
    },
  }
}

/** 校验主题设置，错误抛出。 / Parse a theme preference or throw for malformed input. */
function parseTheme(value: unknown): { theme: string } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('theme' in value) ||
    typeof value.theme !== 'string'
  )
    throw new TypeError('Invalid theme')
  return { theme: value.theme }
}

/** 模拟浏览器存储拒绝或配额错误。 / Simulate unavailable storage without exposing internal errors. */
function unavailable(): never {
  throw new Error('storage-internal-context')
}

/** 保持JSON值供空值测试。 / Preserve a decoded value for null/zero checks. */
function identity(value: unknown): unknown {
  return value
}

/** 恢复全局测试替身。 / Restore mocked globals after each case. */
function restoreGlobals(): void {
  vi.unstubAllGlobals()
}
afterEach(restoreGlobals)

/** 校验命名空间隔离与JSON解码，无外部写入。 / Verify isolated preferences and typed decoding. */
it('按命名空间读写设置，删除单键不清空其他资料', function testIsolation() {
  const backend = createBackend()
  const a = new JsonStorage('pickaus:admin', backend)
  const b = new JsonStorage('pickaus:other', backend)
  expect(a.write('display', { theme: 'compact' }).ok).toBe(true)
  b.write('display', { theme: 'default' })
  expect(a.read('display', parseTheme)).toEqual({ ok: true, value: { theme: 'compact' } })
  expect(a.remove('display')).toEqual({ ok: true, value: undefined })
  expect(a.read('display', parseTheme)).toEqual({ ok: false, reason: 'missing' })
  expect(b.read('display', parseTheme)).toEqual({ ok: true, value: { theme: 'default' } })
})

/** 区分不存在、零、空字符串与显式null。 / Keep missing data distinct from zero/empty/null. */
it.each([0, '', null])('JSON值 %j 不变成缺失或默认值', function testExplicitEmpty(value) {
  const storage = new JsonStorage('test', createBackend())
  storage.write('value', value)
  expect(storage.read('value', identity)).toEqual({ ok: true, value })
})

/** 不自动删除损坏JSON或领域无效资料。 / Report malformed/domain-invalid data without deleting it. */
it.each(['{broken', '{"theme":7}'])('拒绝无效设置 %j，保留原值', function testInvalidData(raw) {
  const backend = createBackend()
  backend.setItem('test:display', raw)
  expect(new JsonStorage('test', backend).read('display', parseTheme)).toEqual({
    ok: false,
    reason: 'invalid',
  })
  expect(backend.getItem('test:display')).toBe(raw)
})

/** 不可用存储不能伪装成缺失或成功。 / Access failure must not look like missing data or success. */
it('存储被禁用或配额满时明确返回不可用', function testUnavailable() {
  const storage = new JsonStorage('test', {
    getItem: unavailable,
    setItem: unavailable,
    removeItem: unavailable,
  })
  expect(storage.read('value', identity)).toEqual({ ok: false, reason: 'unavailable' })
  expect(storage.write('value', 1)).toEqual({ ok: false, reason: 'unavailable' })
  expect(storage.remove('value')).toEqual({ ok: false, reason: 'unavailable' })
})

/** 无浏览器环境延迟报不可用，构造不读存储。 / Construction is safe without window; I/O reports unavailable. */
it('无window时仍可构造，读取明确失败', function testNoWindow() {
  vi.stubGlobal('window', undefined)
  const storage = new JsonStorage('test')
  expect(storage.read('value', identity)).toEqual({ ok: false, reason: 'unavailable' })
})

/** 非有限值及循环引用不覆盖已保存内容。 / Serialization failures never replace existing preferences. */
it('拒绝有损数字和循环JSON，保留旧数据', function testSerializationFailure() {
  const backend = createBackend()
  const storage = new JsonStorage('test', backend)
  storage.write('value', 1)
  const cycle: { self?: unknown } = {}
  cycle.self = cycle
  expect(storage.write('value', NaN)).toEqual({ ok: false, reason: 'invalid' })
  expect(storage.write('value', { invalid: Infinity })).toEqual({ ok: false, reason: 'invalid' })
  // 测试绕过静态边界的外部资料。 / Probe untyped external input beyond the static boundary.
  expect(storage.write('value', cycle as never)).toEqual({ ok: false, reason: 'invalid' })
  expect(backend.getItem('test:value')).toBe('1')
})

/** 防止空命名空间和键分隔符碰撞。 / Reject empty namespaces and namespace/key collisions. */
it('拒绝非法命名空间和键', function testInvalidKeys() {
  expect(() => new JsonStorage('')).toThrow(TypeError)
  expect(() => new JsonStorage(1 as never)).toThrow(TypeError)
  const storage = new JsonStorage('test', createBackend())
  expect(() => storage.read('other:key', identity)).toThrow(TypeError)
  expect(() => storage.write('', 1)).toThrow(TypeError)
  expect(() => storage.remove(' ')).toThrow(TypeError)
  expect(() => storage.remove(null as never)).toThrow(TypeError)
})

/** 非JSON对象和隐藏资料不能在保存时静默丢失。 / Reject non-JSON objects and hidden data before serialization. */
it.each([
  new Date('2026-11-01T00:00:00Z'),
  new Map([['a', 1]]),
  new Set([1]),
  { [Symbol('hidden')]: 1 },
  Object.defineProperty({}, 'hidden', { value: 1 }),
  [1, , 3],
  { invalid: undefined },
])('拒绝非纯JSON资料 %#', function testNonJsonValues(value) {
  expect(new JsonStorage('test', createBackend()).write('value', value as never)).toEqual({
    ok: false,
    reason: 'invalid',
  })
})

/** 校验阶段不执行访问器或toJSON，重复引用仍可保存。 / Never invoke accessors/toJSON; repeated references remain valid. */
it('不执行自定义序列化和getter，允许无循环的重复引用', function testSerializationSideEffects() {
  const storage = new JsonStorage('test', createBackend())
  const conversion = vi.fn(unavailable)
  const getter = vi.fn(unavailable)
  expect(storage.write('value', { toJSON: conversion } as never).ok).toBe(false)
  expect(storage.write('value', Object.setPrototypeOf([1], { toJSON: conversion })).ok).toBe(false)
  expect(
    storage.write('value', Object.defineProperty({}, 'theme', { get: getter, enumerable: true }))
      .ok,
  ).toBe(false)
  expect(conversion).not.toHaveBeenCalled()
  expect(getter).not.toHaveBeenCalled()
  const preference = { density: 'compact' }
  expect(storage.write('value', { first: preference, second: preference }).ok).toBe(true)
})

/** 超出数组索引范围的数字键不能抵消稀疏空位。 / Reject numeric properties that hide a sparse array hole. */
it('拒绝包含非索引数字键的稀疏数组', function testNonIndexArrayKey() {
  const sparse: number[] = []
  sparse.length = 1
  Object.defineProperty(sparse, '4294967295', { value: 1, enumerable: true })
  expect(new JsonStorage('test', createBackend()).write('value', sparse)).toEqual({
    ok: false,
    reason: 'invalid',
  })
})
