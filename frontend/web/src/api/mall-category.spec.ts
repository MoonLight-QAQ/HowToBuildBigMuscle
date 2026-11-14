// @vitest-environment node
/**
 * api/mall-category.ts 的测试：解析函数只接受符合契约的数据；接口函数的路径、方法和请求体正确。
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http as mswHttp, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const {
  createMallCategory,
  deleteMallCategory,
  listMallCategories,
  parseMallCategory,
  parseMallCategoryList,
} = await import('./mall-category')
const { ApiError } = await import('./http')

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

const fresh = {
  id: '1854239876543209540',
  nameZh: '生鲜',
  nameEn: 'Fresh',
  sort: 10,
  inUseCount: 3,
}

describe('parseMallCategory', () => {
  it('接受符合契约的类目', () => {
    expect(parseMallCategory(fresh)).toEqual(fresh)
  })

  it('inUseCount 为 0 时接受', () => {
    expect(parseMallCategory({ ...fresh, inUseCount: 0 }).inUseCount).toBe(0)
  })

  it('去掉契约之外的字段', () => {
    expect(parseMallCategory({ ...fresh, extra: 'x' })).not.toHaveProperty('extra')
  })

  it.each([
    ['id 是数字', { id: 1854239876543209 }],
    ['id 不是纯数字', { id: 'abc' }],
    ['nameZh 缺失', { nameZh: undefined }],
    ['nameEn 不是字符串', { nameEn: 1 }],
    ['sort 不是整数', { sort: 1.5 }],
    ['sort 缺失', { sort: undefined }],
    ['inUseCount 缺失', { inUseCount: undefined }],
    ['inUseCount 是负数', { inUseCount: -1 }],
    ['inUseCount 不是整数', { inUseCount: 0.5 }],
  ])('%s 时抛错', (_name, override) => {
    expect(() => parseMallCategory({ ...fresh, ...override })).toThrow(TypeError)
  })

  it.each([null, [], 'category'])('不是对象（%j）时抛错', (value) => {
    expect(() => parseMallCategory(value)).toThrow(TypeError)
  })
})

describe('parseMallCategoryList', () => {
  it('解析每一项', () => {
    expect(parseMallCategoryList({ items: [fresh] })).toEqual({ items: [fresh] })
  })

  it('空列表', () => {
    expect(parseMallCategoryList({ items: [] })).toEqual({ items: [] })
  })

  it.each([null, {}, { items: null }, [fresh]])('结构不对（%j）时抛错', (value) => {
    expect(() => parseMallCategoryList(value)).toThrow(TypeError)
  })

  it('任一项不符合契约时整体抛错', () => {
    expect(() => parseMallCategoryList({ items: [fresh, { ...fresh, sort: 'x' }] })).toThrow(
      TypeError,
    )
  })
})

describe('接口函数', () => {
  it('listMallCategories 发送 GET /mall-categories，返回 data 部分', async () => {
    server.use(
      mswHttp.get(`${baseURL}/mall-categories`, () =>
        HttpResponse.json({ ok: true, data: { items: [fresh] } }),
      ),
    )
    await expect(listMallCategories()).resolves.toEqual({ items: [fresh] })
  })

  it('createMallCategory 发送 POST /mall-categories，带上请求体', async () => {
    let received: unknown
    server.use(
      mswHttp.post(`${baseURL}/mall-categories`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ ok: true, data: { ...fresh, inUseCount: 0 } })
      }),
    )
    const input = { nameZh: '生鲜', nameEn: 'Fresh', sort: 10 }
    await expect(createMallCategory(input)).resolves.toEqual({ ...fresh, inUseCount: 0 })
    expect(received).toEqual(input)
  })

  it('deleteMallCategory 发送 DELETE /mall-categories/:id，成功时没有返回值', async () => {
    let path = ''
    server.use(
      mswHttp.delete(`${baseURL}/mall-categories/:id`, ({ params }) => {
        path = String(params.id)
        return HttpResponse.json({ ok: true, data: null })
      }),
    )
    await expect(deleteMallCategory(fresh.id)).resolves.toBeUndefined()
    expect(path).toBe(fresh.id)
  })

  it('deleteMallCategory 返回的 data 不是 null 时抛出 protocol 错误', async () => {
    server.use(
      mswHttp.delete(`${baseURL}/mall-categories/:id`, () =>
        HttpResponse.json({ ok: true, data: { id: fresh.id } }),
      ),
    )
    await expect(deleteMallCategory(fresh.id)).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('业务错误以带 code 的 ApiError 抛出，不在这里处理', async () => {
    server.use(
      mswHttp.delete(`${baseURL}/mall-categories/:id`, () =>
        HttpResponse.json(
          { ok: false, code: 'CATEGORY_IN_USE', message: '类目仍在使用，无法删除' },
          { status: 409 },
        ),
      ),
    )
    const error = await deleteMallCategory(fresh.id).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'business', code: 'CATEGORY_IN_USE' })
  })

  it('返回数据不符合契约时抛出 protocol 错误', async () => {
    server.use(
      mswHttp.get(`${baseURL}/mall-categories`, () =>
        HttpResponse.json({ ok: true, data: { items: [{ id: 1 }] } }),
      ),
    )
    await expect(listMallCategories()).rejects.toMatchObject({ kind: 'protocol' })
  })
})
