// @vitest-environment node
/**
 * api/city.ts 的测试：解析函数只接受符合契约的数据；接口函数的路径、方法和请求体正确。
 *
 * 其他模块照着写时：解析函数对每个必填字段各测一个不合法的值；
 * 接口函数用 MSW 拦截请求，检查路径、方法、请求体，并确认业务错误以 ApiError 抛出。
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http as mswHttp, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const { createCity, listCities, parseCity, parseCityList, updateCity } = await import('./city')
const { ApiError } = await import('./http')

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

const sydney = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
}

describe('parseCity', () => {
  it('接受符合契约的城市', () => {
    expect(parseCity(sydney)).toEqual(sydney)
  })

  it('去掉契约之外的字段', () => {
    expect(parseCity({ ...sydney, extra: 'x' })).not.toHaveProperty('extra')
  })

  it.each([
    ['id 是数字', { id: 1854239876543209 }],
    ['id 不是纯数字', { id: 'abc' }],
    ['nameZh 缺失', { nameZh: undefined }],
    ['nameEn 不是字符串', { nameEn: 1 }],
    ['fulfillment 不是有效值', { fulfillment: 'pickup' }],
    ['state 是小写', { state: 'nsw' }],
    ['timezone 缺失', { timezone: undefined }],
    ['sort 不是整数', { sort: 1.5 }],
  ])('%s 时抛错', (_name, override) => {
    expect(() => parseCity({ ...sydney, ...override })).toThrow(TypeError)
  })

  it.each([null, [], 'city'])('不是对象（%j）时抛错', (value) => {
    expect(() => parseCity(value)).toThrow(TypeError)
  })
})

describe('parseCityList', () => {
  it('解析每一项', () => {
    expect(parseCityList({ items: [sydney] })).toEqual({ items: [sydney] })
  })

  it('空列表', () => {
    expect(parseCityList({ items: [] })).toEqual({ items: [] })
  })

  it.each([null, {}, { items: null }, [sydney]])('结构不对（%j）时抛错', (value) => {
    expect(() => parseCityList(value)).toThrow(TypeError)
  })

  it('任一项不符合契约时整体抛错', () => {
    expect(() => parseCityList({ items: [sydney, { ...sydney, state: 'XX' }] })).toThrow(TypeError)
  })
})

describe('接口函数', () => {
  it('listCities 发送 GET /cities，返回 data 部分', async () => {
    server.use(
      mswHttp.get(`${baseURL}/cities`, () =>
        HttpResponse.json({ ok: true, data: { items: [sydney] } }),
      ),
    )
    await expect(listCities()).resolves.toEqual({ items: [sydney] })
  })

  it('createCity 发送 POST /cities，带上请求体', async () => {
    let received: unknown
    server.use(
      mswHttp.post(`${baseURL}/cities`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ ok: true, data: sydney })
      }),
    )
    const input = {
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'local',
      state: 'NSW',
      timezone: 'Australia/Sydney',
      sort: 1,
    } as const
    await expect(createCity(input)).resolves.toEqual(sydney)
    expect(received).toEqual(input)
  })

  it('updateCity 发送 PUT /cities/:id', async () => {
    let path = ''
    server.use(
      mswHttp.put(`${baseURL}/cities/:id`, ({ params }) => {
        path = String(params.id)
        return HttpResponse.json({ ok: true, data: sydney })
      }),
    )
    await updateCity(sydney.id, {
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'post',
      timezone: 'Australia/Sydney',
      sort: 1,
    })
    expect(path).toBe(sydney.id)
  })

  it('业务错误以带 code 的 ApiError 抛出，不在这里处理', async () => {
    server.use(
      mswHttp.post(`${baseURL}/cities`, () =>
        HttpResponse.json(
          { ok: false, code: 'NAME_DUPLICATED', message: '名称已存在' },
          { status: 409 },
        ),
      ),
    )
    const error = await createCity({
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'post',
      state: 'NSW',
      timezone: 'Australia/Sydney',
      sort: 1,
    }).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'business', code: 'NAME_DUPLICATED' })
  })

  it('返回数据不符合契约时抛出 protocol 错误', async () => {
    server.use(
      mswHttp.get(`${baseURL}/cities`, () =>
        HttpResponse.json({ ok: true, data: { items: [{ id: 1 }] } }),
      ),
    )
    await expect(listCities()).rejects.toMatchObject({ kind: 'protocol' })
  })
})
