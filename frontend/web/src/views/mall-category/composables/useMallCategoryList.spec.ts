/**
 * useMallCategoryList 的测试。用 vi.mock 模拟 api/mall-category.ts 的返回值，不发真实请求。
 * 覆盖加载成功、加载失败、重试、空数据、迟到的旧结果，以及列表顺序以服务器为准。
 */
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MallCategory, MallCategoryList } from '@/api/mall-category'
import { listMallCategories } from '@/api/mall-category'
import { ApiError } from '@/api/http'
import { useMallCategoryList } from './useMallCategoryList'

vi.mock('@/api/mall-category', () => ({ listMallCategories: vi.fn() }))

const mockedList = vi.mocked(listMallCategories)

const fresh: MallCategory = {
  id: '1854239876543209540',
  nameZh: '生鲜',
  nameEn: 'Fresh',
  sort: 10,
  inUseCount: 3,
}
const household: MallCategory = {
  id: '1854239876543209543',
  nameZh: '日用品',
  nameEn: 'Household',
  sort: 40,
  inUseCount: 0,
}

let scope: EffectScope

beforeEach(() => vi.resetAllMocks())

afterEach(() => scope?.stop())

/** 在独立的作用域中创建，测试结束时停止作用域，检查清理逻辑。 */
function createList() {
  scope = effectScope()
  return scope.run(() => useMallCategoryList())!
}

/** 可以手动完成的 Promise，用来控制请求返回的先后顺序。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('加载', () => {
  it('加载成功：显示类目，不是空数据，没有错误', async () => {
    mockedList.mockResolvedValue({ items: [fresh, household] })
    const list = createList()
    await expect(list.load()).resolves.toBe(true)
    expect(list.categories.value).toEqual([fresh, household])
    expect(list.loaded.value).toBe(true)
    expect(list.empty.value).toBe(false)
    expect(list.errorMessage.value).toBeNull()
  })

  it('列表顺序以服务器返回的为准，前端不重新排序', async () => {
    // 服务器按 sort 排好序；这里故意给出相反的顺序，确认前端原样显示。
    mockedList.mockResolvedValue({ items: [household, fresh] })
    const list = createList()
    await list.load()
    expect(list.categories.value.map((category) => category.nameZh)).toEqual(['日用品', '生鲜'])
  })

  it('加载过程中 loading 为 true', async () => {
    const pending = deferred<MallCategoryList>()
    mockedList.mockReturnValue(pending.promise)
    const list = createList()
    const loading = list.load()
    expect(list.loading.value).toBe(true)
    pending.resolve({ items: [] })
    await loading
    expect(list.loading.value).toBe(false)
  })

  it('没有类目时为空数据', async () => {
    mockedList.mockResolvedValue({ items: [] })
    const list = createList()
    await list.load()
    expect(list.empty.value).toBe(true)
  })

  it('还没加载时不算空数据', () => {
    expect(createList().empty.value).toBe(false)
  })

  it('加载失败：显示错误文案，不算空数据', async () => {
    mockedList.mockRejectedValue(new ApiError('network'))
    const list = createList()
    await expect(list.load()).resolves.toBe(false)
    expect(list.errorMessage.value).toBe('网络连接失败，请检查网络')
    expect(list.empty.value).toBe(false)
    expect(list.loading.value).toBe(false)
  })

  it('不是 ApiError 的错误使用通用提示', async () => {
    mockedList.mockRejectedValue(new Error('boom'))
    const list = createList()
    await list.load()
    expect(list.errorMessage.value).toBe('请求失败，请稍后重试')
  })

  it('加载失败后重试成功，错误消失', async () => {
    mockedList
      .mockRejectedValueOnce(new ApiError('timeout'))
      .mockResolvedValueOnce({ items: [fresh] })
    const list = createList()
    await list.load()
    expect(list.errorMessage.value).not.toBeNull()
    await expect(list.load()).resolves.toBe(true)
    expect(list.errorMessage.value).toBeNull()
    expect(list.categories.value).toEqual([fresh])
  })

  it('重新加载失败时保留上次的数据', async () => {
    mockedList
      .mockResolvedValueOnce({ items: [fresh] })
      .mockRejectedValueOnce(new ApiError('http', 500))
    const list = createList()
    await list.load()
    await list.load()
    expect(list.categories.value).toEqual([fresh])
    expect(list.errorMessage.value).not.toBeNull()
  })

  it('新的加载取消上一次请求，迟到的旧结果不覆盖新结果', async () => {
    const first = deferred<MallCategoryList>()
    const second = deferred<MallCategoryList>()
    mockedList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const list = createList()
    const firstLoad = list.load()
    const secondLoad = list.load()
    expect(mockedList.mock.calls[0]![0]!.aborted).toBe(true)
    second.resolve({ items: [household] })
    await secondLoad
    first.resolve({ items: [fresh] })
    await expect(firstLoad).resolves.toBe(false)
    expect(list.categories.value).toEqual([household])
  })

  it('作用域结束时取消请求，之后不再加载', async () => {
    const pending = deferred<MallCategoryList>()
    mockedList.mockReturnValue(pending.promise)
    const list = createList()
    void list.load()
    scope.stop()
    expect(mockedList.mock.calls[0]![0]!.aborted).toBe(true)
    await expect(list.load()).resolves.toBe(false)
    expect(mockedList).toHaveBeenCalledTimes(1)
  })
})
