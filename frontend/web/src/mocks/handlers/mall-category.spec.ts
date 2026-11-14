// @vitest-environment node
/**
 * 商城类目模拟接口的测试：确认模拟的规则与契约 description 一致。
 * 每个用例前调用 resetMallCategoryMock() 恢复初始数据，用例之间互不影响。
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import type { MallCategory } from '@/api/mall-category'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const { mallCategoryHandlers, resetMallCategoryMock } = await import('./mall-category')
const server = setupServer(...mallCategoryHandlers)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => resetMallCategoryMock())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

/** 初始数据中的类目 id：生鲜（inUseCount 3）、日用品（0）、冷冻食品（0，id 最大）。 */
const FRESH_ID = '1854239876543209540'
const HOUSEHOLD_ID = '1854239876543209543'
const FROZEN_ID = '1854239876543209544'

/** 发送 JSON 请求，返回状态码和响应体。 */
async function send(method: string, path: string, body?: unknown) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

/** 查询列表，返回各类目的中文名。 */
async function listNames(): Promise<string[]> {
  const { body } = await send('GET', '/mall-categories')
  return body.data.items.map((category: MallCategory) => category.nameZh)
}

const gifts = { nameZh: '节日礼品', nameEn: 'Festive Gifts', sort: 60 }

describe('GET /mall-categories', () => {
  it('返回五个初始类目，按 sort 排序，不带分页字段', async () => {
    const { status, body } = await send('GET', '/mall-categories')
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(Object.keys(body.data)).toEqual(['items'])
    expect(
      body.data.items.map((category: MallCategory) => [
        category.nameZh,
        category.nameEn,
        category.sort,
        category.inUseCount,
      ]),
    ).toEqual([
      ['生鲜', 'Fresh', 10, 3],
      ['零食', 'Snacks', 20, 5],
      ['饮料', 'Drinks', 30, 1],
      ['日用品', 'Household', 40, 0],
      ['冷冻食品', 'Frozen', 50, 0],
    ])
  })

  it('sort 相同时按创建顺序', async () => {
    await send('POST', '/mall-categories', { ...gifts, sort: 10 })
    expect((await listNames()).slice(0, 2)).toEqual(['生鲜', '节日礼品'])
  })
})

describe('POST /mall-categories', () => {
  it('新增成功，返回带字符串 id 的类目，inUseCount 为 0，并出现在列表中', async () => {
    const { status, body } = await send('POST', '/mall-categories', gifts)
    expect(status).toBe(200)
    expect(body.data).toMatchObject({ ...gifts, inUseCount: 0 })
    expect(body.data.id).toMatch(/^[0-9]{1,20}$/)
    expect(await listNames()).toContain('节日礼品')
  })

  it('名称去掉首尾空格后保存', async () => {
    const { body } = await send('POST', '/mall-categories', {
      ...gifts,
      nameZh: ' 节日礼品 ',
      nameEn: '  Festive Gifts ',
    })
    expect(body.data).toMatchObject({ nameZh: '节日礼品', nameEn: 'Festive Gifts' })
  })

  it('请求中带 inUseCount 返回 VALIDATION_FAILED（不是可用的字段）', async () => {
    const { status, body } = await send('POST', '/mall-categories', { ...gifts, inUseCount: 9 })
    expect(status).toBe(400)
    expect(body.details).toContainEqual({ field: 'inUseCount', message: '不是可用的字段' })
  })

  it('sort 为负数时照常新增（契约不限制下限）', async () => {
    const { status } = await send('POST', '/mall-categories', { ...gifts, sort: -1 })
    expect(status).toBe(200)
  })

  it('中文名重复返回 409 NAME_DUPLICATED', async () => {
    const { status, body } = await send('POST', '/mall-categories', { ...gifts, nameZh: '生鲜' })
    expect(status).toBe(409)
    expect(body).toMatchObject({ ok: false, code: 'NAME_DUPLICATED' })
  })

  it('中文名去掉首尾空格后重复，返回 NAME_DUPLICATED', async () => {
    const { body } = await send('POST', '/mall-categories', { ...gifts, nameZh: ' 生鲜 ' })
    expect(body.code).toBe('NAME_DUPLICATED')
  })

  it('英文名重复（不区分大小写、去掉首尾空格）返回 NAME_DUPLICATED', async () => {
    const { body } = await send('POST', '/mall-categories', { ...gifts, nameEn: ' fRESH ' })
    expect(body.code).toBe('NAME_DUPLICATED')
  })

  it('连续新增的 id 不重复', async () => {
    const first = await send('POST', '/mall-categories', gifts)
    const second = await send('POST', '/mall-categories', {
      nameZh: '粮油',
      nameEn: 'Pantry',
      sort: 70,
    })
    expect(first.body.data.id).not.toBe(second.body.data.id)
  })

  it('删除 id 最大的类目后再新增，id 不与已删除的重复', async () => {
    const created = await send('POST', '/mall-categories', gifts)
    await send('DELETE', `/mall-categories/${created.body.data.id}`)
    const again = await send('POST', '/mall-categories', gifts)
    expect(again.body.data.id).not.toBe(created.body.data.id)
  })

  it.each([
    ['中文名为空', { nameZh: '' }, 'nameZh'],
    ['中文名只有空格', { nameZh: '  ' }, 'nameZh'],
    ['中文名超过 20 个字符', { nameZh: '一'.repeat(21) }, 'nameZh'],
    ['英文名缺失', { nameEn: undefined }, 'nameEn'],
    ['英文名超过 40 个字符', { nameEn: 'a'.repeat(41) }, 'nameEn'],
    ['sort 缺失', { sort: undefined }, 'sort'],
    ['sort 不是整数', { sort: 1.5 }, 'sort'],
    ['sort 是字符串', { sort: '1' }, 'sort'],
    ['出现未定义的字段', { id: '1' }, 'id'],
  ])('%s 返回 400 VALIDATION_FAILED', async (_name, override, field) => {
    const { status, body } = await send('POST', '/mall-categories', { ...gifts, ...override })
    expect(status).toBe(400)
    expect(body.code).toBe('VALIDATION_FAILED')
    expect(body.details.map((detail: { field: string }) => detail.field)).toContain(field)
  })

  it('名称长度恰好等于上限时可以新增，一个 emoji 算一个字符', async () => {
    const { status } = await send('POST', '/mall-categories', {
      nameZh: '😀'.repeat(20),
      nameEn: 'a'.repeat(40),
      sort: 1,
    })
    expect(status).toBe(200)
  })
})

describe('DELETE /mall-categories/:id', () => {
  it('inUseCount 为 0 时删除成功，data 为 null，不再出现在列表中', async () => {
    const { status, body } = await send('DELETE', `/mall-categories/${HOUSEHOLD_ID}`)
    expect(status).toBe(200)
    expect(body).toEqual({ ok: true, data: null })
    expect(await listNames()).not.toContain('日用品')
  })

  it('删除后名称可以再次使用', async () => {
    await send('DELETE', `/mall-categories/${HOUSEHOLD_ID}`)
    const { status } = await send('POST', '/mall-categories', {
      nameZh: '日用品',
      nameEn: 'Household',
      sort: 40,
    })
    expect(status).toBe(200)
  })

  it('inUseCount 大于 0 时返回 409 CATEGORY_IN_USE，类目仍在列表中', async () => {
    const { status, body } = await send('DELETE', `/mall-categories/${FRESH_ID}`)
    expect(status).toBe(409)
    expect(body).toMatchObject({ ok: false, code: 'CATEGORY_IN_USE' })
    expect(await listNames()).toContain('生鲜')
  })

  it('找不到类目返回 404 NOT_FOUND', async () => {
    const { status, body } = await send('DELETE', '/mall-categories/1')
    expect(status).toBe(404)
    expect(body).toMatchObject({ ok: false, code: 'NOT_FOUND' })
  })

  it('已删除的类目再删除一次，返回 NOT_FOUND', async () => {
    await send('DELETE', `/mall-categories/${FROZEN_ID}`)
    const { status, body } = await send('DELETE', `/mall-categories/${FROZEN_ID}`)
    expect(status).toBe(404)
    expect(body.code).toBe('NOT_FOUND')
  })
})
