// @vitest-environment node
/**
 * 城市模拟接口的测试：确认模拟的规则与契约 description 一致。
 *
 * 其他模块照着写时：每条契约规则（默认值、错误码、不能修改的字段）各写一个用例；
 * 每个用例前调用 resetXxxMock() 恢复初始数据，用例之间互不影响。
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import type { City } from '@/api/city'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const { cityHandlers, resetCityMock } = await import('./city')
const server = setupServer(...cityHandlers)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => resetCityMock())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

const SYDNEY_ID = '1854239876543209472'

/** 发送 JSON 请求，返回状态码和响应体。 */
async function send(method: string, path: string, body?: unknown) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

/** 复制对象并去掉一个字段，用来构造「缺少某个字段」的请求体。 */
function omit<T extends object>(source: T, key: keyof T): Partial<T> {
  const copy: Partial<T> = { ...source }
  delete copy[key]
  return copy
}

const brisbane = {
  nameZh: '布里斯班',
  nameEn: 'Brisbane',
  fulfillment: 'post',
  state: 'QLD',
  timezone: 'Australia/Brisbane',
  sort: 4,
}

const sydneyUpdate = {
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'post',
  timezone: 'Australia/Sydney',
  sort: 1,
}

describe('GET /cities', () => {
  it('返回三个初始城市，按 sort 排序，不带分页字段', async () => {
    const { status, body } = await send('GET', '/cities')
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(Object.keys(body.data)).toEqual(['items'])
    expect(
      body.data.items.map((city: City) => [city.nameZh, city.state, city.fulfillment]),
    ).toEqual([
      ['悉尼', 'NSW', 'local'],
      ['墨尔本', 'VIC', 'local'],
      ['堪培拉', 'ACT', 'post'],
    ])
  })

  it('sort 相同时按创建顺序', async () => {
    await send('POST', '/cities', { ...brisbane, sort: 1 })
    const { body } = await send('GET', '/cities')
    expect(body.data.items.map((city: City) => city.nameZh).slice(0, 2)).toEqual([
      '悉尼',
      '布里斯班',
    ])
  })
})

describe('POST /cities', () => {
  it('新增成功，返回带字符串 id 的城市，并出现在列表中', async () => {
    const { status, body } = await send('POST', '/cities', brisbane)
    expect(status).toBe(200)
    expect(body.data).toMatchObject(brisbane)
    expect(body.data.id).toMatch(/^[0-9]{1,20}$/)
    const list = await send('GET', '/cities')
    expect(list.body.data.items).toHaveLength(4)
  })

  it('不传 fulfillment 时默认为 post', async () => {
    const { body } = await send('POST', '/cities', omit(brisbane, 'fulfillment'))
    expect(body.data.fulfillment).toBe('post')
  })

  it('连续新增的 id 不重复', async () => {
    const first = await send('POST', '/cities', brisbane)
    const second = await send('POST', '/cities', { ...brisbane, nameZh: '珀斯', nameEn: 'Perth' })
    expect(first.body.data.id).not.toBe(second.body.data.id)
  })

  it('中文名重复返回 409 NAME_DUPLICATED', async () => {
    const { status, body } = await send('POST', '/cities', { ...brisbane, nameZh: '悉尼' })
    expect(status).toBe(409)
    expect(body).toMatchObject({ ok: false, code: 'NAME_DUPLICATED' })
  })

  it('英文名重复（不区分大小写、去掉首尾空格）返回 NAME_DUPLICATED', async () => {
    const { body } = await send('POST', '/cities', { ...brisbane, nameEn: ' sydney ' })
    expect(body.code).toBe('NAME_DUPLICATED')
  })

  it('缺少 state 返回 400 VALIDATION_FAILED，details 指出字段', async () => {
    const { status, body } = await send('POST', '/cities', omit(brisbane, 'state'))
    expect(status).toBe(400)
    expect(body.code).toBe('VALIDATION_FAILED')
    expect(body.details).toContainEqual({ field: 'state', message: '必须是有效的州' })
  })

  it.each([
    ['名称为空', { nameZh: '  ' }, 'nameZh'],
    ['中文名超过 20 个字符', { nameZh: '一'.repeat(21) }, 'nameZh'],
    ['英文名超过 40 个字符', { nameEn: 'a'.repeat(41) }, 'nameEn'],
    ['state 不是有效的州', { state: 'nsw' }, 'state'],
    ['timezone 不是有效的 IANA 时区名', { timezone: 'Australia/Nowhere' }, 'timezone'],
    ['sort 不是整数', { sort: 1.5 }, 'sort'],
    ['fulfillment 不是有效值', { fulfillment: 'pickup' }, 'fulfillment'],
    ['出现未定义的字段', { id: '1' }, 'id'],
  ])('%s 返回 VALIDATION_FAILED', async (_name, override, field) => {
    const { status, body } = await send('POST', '/cities', { ...brisbane, ...override })
    expect(status).toBe(400)
    expect(body.code).toBe('VALIDATION_FAILED')
    expect(body.details.map((detail: { field: string }) => detail.field)).toContain(field)
  })
})

describe('PUT /cities/:id', () => {
  it('修改成功，state 保持不变', async () => {
    const { status, body } = await send('PUT', `/cities/${SYDNEY_ID}`, sydneyUpdate)
    expect(status).toBe(200)
    expect(body.data).toEqual({ id: SYDNEY_ID, state: 'NSW', ...sydneyUpdate })
    const list = await send('GET', '/cities')
    expect(list.body.data.items[0].fulfillment).toBe('post')
  })

  it('请求中出现 state 返回 VALIDATION_FAILED，数据不变', async () => {
    const { status, body } = await send('PUT', `/cities/${SYDNEY_ID}`, {
      ...sydneyUpdate,
      state: 'VIC',
    })
    expect(status).toBe(400)
    expect(body.code).toBe('VALIDATION_FAILED')
    expect(body.details).toContainEqual({ field: 'state', message: '不是可用的字段' })
    const list = await send('GET', '/cities')
    expect(list.body.data.items[0]).toMatchObject({ state: 'NSW', fulfillment: 'local' })
  })

  it('修改时 fulfillment 必填', async () => {
    const { body } = await send('PUT', `/cities/${SYDNEY_ID}`, omit(sydneyUpdate, 'fulfillment'))
    expect(body.code).toBe('VALIDATION_FAILED')
  })

  it('名称不和自己比较', async () => {
    const { status } = await send('PUT', `/cities/${SYDNEY_ID}`, { ...sydneyUpdate, sort: 9 })
    expect(status).toBe(200)
  })

  it('名称与其他城市重复返回 409 NAME_DUPLICATED', async () => {
    const { status, body } = await send('PUT', `/cities/${SYDNEY_ID}`, {
      ...sydneyUpdate,
      nameZh: '墨尔本',
    })
    expect(status).toBe(409)
    expect(body.code).toBe('NAME_DUPLICATED')
  })

  it('找不到城市返回 404 NOT_FOUND', async () => {
    const { status, body } = await send('PUT', '/cities/1', sydneyUpdate)
    expect(status).toBe(404)
    expect(body).toMatchObject({ ok: false, code: 'NOT_FOUND' })
  })
})
