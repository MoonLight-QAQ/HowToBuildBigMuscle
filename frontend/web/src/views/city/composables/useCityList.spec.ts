/**
 * useCityList 的测试。用 vi.mock 模拟 api/city.ts 的返回值，不发真实请求。
 *
 * 其他模块照着写时：模拟本模块 api 文件中用到的函数，覆盖加载成功、加载失败、重试、
 * 空数据、迟到的旧结果，以及列表中每个写操作的成功和失败。
 */
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import type { City, CityList } from '@/api/city'
import { listCities, updateCity } from '@/api/city'
import { ApiError } from '@/api/http'
import { useCityList } from './useCityList'

vi.mock('@/api/city', () => ({ listCities: vi.fn(), updateCity: vi.fn() }))

const mockedList = vi.mocked(listCities)
const mockedUpdate = vi.mocked(updateCity)

const sydney: City = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
}
const canberra: City = {
  ...sydney,
  id: '1854239876543209473',
  nameZh: '堪培拉',
  fulfillment: 'post',
  state: 'ACT',
  sort: 2,
}

let scope: EffectScope
let success: ReturnType<typeof vi.spyOn>
let failure: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.resetAllMocks()
  success = vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }))
  failure = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
})

afterEach(() => {
  scope?.stop()
  vi.restoreAllMocks()
})

/** 在独立的作用域中创建，测试结束时停止作用域，检查清理逻辑。 */
function createList() {
  scope = effectScope()
  return scope.run(() => useCityList())!
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
  it('加载成功：显示城市，不是空数据，没有错误', async () => {
    mockedList.mockResolvedValue({ items: [sydney, canberra] })
    const list = createList()
    await expect(list.load()).resolves.toBe(true)
    expect(list.cities.value).toEqual([sydney, canberra])
    expect(list.loaded.value).toBe(true)
    expect(list.empty.value).toBe(false)
    expect(list.errorMessage.value).toBeNull()
  })

  it('加载过程中 loading 为 true', async () => {
    const pending = deferred<CityList>()
    mockedList.mockReturnValue(pending.promise)
    const list = createList()
    const loading = list.load()
    expect(list.loading.value).toBe(true)
    pending.resolve({ items: [] })
    await loading
    expect(list.loading.value).toBe(false)
  })

  it('没有城市时为空数据', async () => {
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
    mockedList.mockRejectedValueOnce(new ApiError('timeout')).mockResolvedValueOnce({
      items: [sydney],
    })
    const list = createList()
    await list.load()
    expect(list.errorMessage.value).not.toBeNull()
    await expect(list.load()).resolves.toBe(true)
    expect(list.errorMessage.value).toBeNull()
    expect(list.cities.value).toEqual([sydney])
  })

  it('重新加载失败时保留上次的数据', async () => {
    mockedList
      .mockResolvedValueOnce({ items: [sydney] })
      .mockRejectedValueOnce(new ApiError('http', 500))
    const list = createList()
    await list.load()
    await list.load()
    expect(list.cities.value).toEqual([sydney])
    expect(list.errorMessage.value).not.toBeNull()
  })

  it('新的加载取消上一次请求，迟到的旧结果不覆盖新结果', async () => {
    const first = deferred<CityList>()
    const second = deferred<CityList>()
    mockedList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const list = createList()
    const firstLoad = list.load()
    const secondLoad = list.load()
    expect(mockedList.mock.calls[0]![0]!.aborted).toBe(true)
    second.resolve({ items: [canberra] })
    await secondLoad
    first.resolve({ items: [sydney] })
    await expect(firstLoad).resolves.toBe(false)
    expect(list.cities.value).toEqual([canberra])
  })

  it('作用域结束时取消请求，之后不再加载', async () => {
    const pending = deferred<CityList>()
    mockedList.mockReturnValue(pending.promise)
    const list = createList()
    void list.load()
    scope.stop()
    expect(mockedList.mock.calls[0]![0]!.aborted).toBe(true)
    await expect(list.load()).resolves.toBe(false)
    expect(mockedList).toHaveBeenCalledTimes(1)
  })
})

describe('切换配送方式', () => {
  it('提交不包含 state 的修改请求体，成功后提示并重新加载', async () => {
    mockedUpdate.mockResolvedValue({ ...sydney, fulfillment: 'post' })
    mockedList.mockResolvedValue({ items: [{ ...sydney, fulfillment: 'post' }] })
    const list = createList()
    await expect(list.toggleFulfillment(sydney)).resolves.toBe(true)
    expect(mockedUpdate).toHaveBeenCalledWith(sydney.id, {
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'post',
      timezone: 'Australia/Sydney',
      sort: 1,
    })
    expect(success).toHaveBeenCalledWith(expect.stringContaining('已改为快递'))
    expect(mockedList).toHaveBeenCalledTimes(1)
    expect(list.togglingId.value).toBeNull()
  })

  it('改为线下时提醒去配送页', async () => {
    mockedUpdate.mockResolvedValue({ ...canberra, fulfillment: 'local' })
    mockedList.mockResolvedValue({ items: [] })
    await createList().toggleFulfillment(canberra)
    expect(success).toHaveBeenCalledWith(expect.stringContaining('请到配送页确认可送的区'))
  })

  it('失败时提示错误文案，不重新加载', async () => {
    mockedUpdate.mockRejectedValue(new ApiError('network'))
    const list = createList()
    await expect(list.toggleFulfillment(sydney)).resolves.toBe(false)
    expect(failure).toHaveBeenCalledWith('网络连接失败，请检查网络')
    expect(mockedList).not.toHaveBeenCalled()
  })

  it('城市已不存在（NOT_FOUND）时提示，并重新加载列表', async () => {
    mockedUpdate.mockRejectedValue(new ApiError('business', 404, 'NOT_FOUND'))
    mockedList.mockResolvedValue({ items: [] })
    await createList().toggleFulfillment(sydney)
    expect(failure).toHaveBeenCalledWith('数据不存在或已被删除')
    expect(mockedList).toHaveBeenCalledTimes(1)
  })

  it('切换过程中再次切换直接返回 false', async () => {
    const pending = deferred<City>()
    mockedUpdate.mockReturnValue(pending.promise)
    mockedList.mockResolvedValue({ items: [] })
    const list = createList()
    const first = list.toggleFulfillment(sydney)
    expect(list.togglingId.value).toBe(sydney.id)
    await expect(list.toggleFulfillment(canberra)).resolves.toBe(false)
    pending.resolve({ ...sydney, fulfillment: 'post' })
    await first
    expect(mockedUpdate).toHaveBeenCalledTimes(1)
  })
})
