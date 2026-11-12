import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http as mockHttp, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import type { components } from '@/api/generated/admin'
import { ApiError, http, HttpClient } from '@/api/http'
import { createAuthAdapter, isSessionActive, useAuthStore } from './auth'

type LoginResult = components['schemas']['LoginResult']

const NOW = Date.parse('2026-11-03T00:00:00Z')

const session: LoginResult = {
  expiresAt: '2026-11-04T00:00:00Z',
  admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
}

const expiredSession: LoginResult = { ...session, expiresAt: '2026-11-02T00:00:00Z' }

const needLogin = () => new ApiError('business', 401, 'NEED_LOGIN')

/** 替换请求层，按路径返回结果，并记录调用参数 */
function mockRequest(responses: Record<string, () => Promise<unknown>>) {
  return vi.spyOn(http, 'request').mockImplementation(async (path, options) => {
    const respond = responses[path]
    if (!respond) throw new Error(`unexpected request ${path}`)
    return options.parse(await respond())
  })
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('isSessionActive', () => {
  it('过期时间晚于现在时有效', () => {
    expect(isSessionActive('2026-11-03T00:00:01Z', NOW)).toBe(true)
  })

  it('过期时间等于或早于现在时无效', () => {
    expect(isSessionActive('2026-11-03T00:00:00Z', NOW)).toBe(false)
    expect(isSessionActive('2026-11-02T00:00:00Z', NOW)).toBe(false)
  })

  it('无法解析的时间视为无效', () => {
    expect(isSessionActive('not-a-date', NOW)).toBe(false)
  })
})

describe('useAuthStore', () => {
  it('初始没有登录信息，也未确认', () => {
    const store = useAuthStore()
    expect(store.admin).toBeNull()
    expect(store.confirmed).toBe(false)
    expect(store.isLoggedIn(NOW)).toBe(false)
  })

  it('setSession 只在内存中保存登录状态，不写入 localStorage', () => {
    const store = useAuthStore()
    const before = store.generation
    store.setSession(session)

    expect(store.admin).toEqual(session.admin)
    expect(store.confirmed).toBe(true)
    expect(store.isLoggedIn(NOW)).toBe(true)
    expect(store.generation).toBe(before + 1)
    expect(localStorage.length).toBe(0)
  })

  it('过期后视为未登录', () => {
    const store = useAuthStore()
    store.setSession(expiredSession)
    expect(store.isLoggedIn(NOW)).toBe(false)
  })

  it('clear 清除登录状态，并让会话代次加 1', () => {
    const store = useAuthStore()
    store.setSession(session)
    const before = store.generation
    store.clear()

    expect(store.admin).toBeNull()
    expect(store.isLoggedIn(NOW)).toBe(false)
    expect(store.generation).toBe(before + 1)
  })

  describe('confirm', () => {
    it('调用 /me 恢复登录状态，并发调用只请求一次', async () => {
      const request = mockRequest({ '/me': async () => session })
      const store = useAuthStore()

      await Promise.all([store.confirm(), store.confirm()])

      expect(request).toHaveBeenCalledTimes(1)
      expect(request).toHaveBeenCalledWith('/me', expect.objectContaining({ anonymous: true }))
      expect(store.confirmed).toBe(true)
      expect(store.admin).toEqual(session.admin)
    })

    it('已确认后不再请求 /me', async () => {
      const request = mockRequest({ '/me': async () => session })
      const store = useAuthStore()
      store.setSession(session)

      await store.confirm()

      expect(request).not.toHaveBeenCalled()
    })

    it.each([
      ['NEED_LOGIN', needLogin],
      ['网络错误', () => new ApiError('network')],
      ['数据不符合契约', () => new ApiError('protocol', 200)],
    ])('/me 返回%s时按未登录处理', async (_name, error) => {
      mockRequest({ '/me': () => Promise.reject(error()) })
      const store = useAuthStore()

      await store.confirm()

      expect(store.confirmed).toBe(true)
      expect(store.isLoggedIn()).toBe(false)
    })

    it('请求 /me 期间已经登录时，以登录结果为准', async () => {
      let resolveMe: (value: unknown) => void = () => {}
      mockRequest({ '/me': () => new Promise((resolve) => (resolveMe = resolve)) })
      const store = useAuthStore()
      const confirming = store.confirm()

      const fresh: LoginResult = { ...session, admin: { ...session.admin, account: 'fresh' } }
      store.setSession(fresh)
      resolveMe(session)
      await confirming

      expect(store.admin?.account).toBe('fresh')
    })
  })

  describe('logout', () => {
    it('POST /logout 成功时返回 ended，并清除登录状态', async () => {
      const request = mockRequest({ '/logout': async () => null })
      const store = useAuthStore()
      store.setSession({ ...session, expiresAt: '2099-01-01T00:00:00Z' })

      await expect(store.logout()).resolves.toBe('ended')

      expect(request).toHaveBeenCalledWith(
        '/logout',
        expect.objectContaining({ method: 'POST', anonymous: true }),
      )
      expect(store.isLoggedIn()).toBe(false)
    })

    it('/logout 返回 NEED_LOGIN 时会话本来就已失效，返回 ended 并清除登录状态', async () => {
      mockRequest({ '/logout': () => Promise.reject(needLogin()) })
      const store = useAuthStore()
      store.setSession({ ...session, expiresAt: '2099-01-01T00:00:00Z' })

      await expect(store.logout()).resolves.toBe('ended')
      expect(store.isLoggedIn()).toBe(false)
    })

    it.each([
      ['网络错误', () => new ApiError('network')],
      ['超时', () => new ApiError('timeout')],
      ['5xx 业务错误', () => new ApiError('business', 500, 'INTERNAL_ERROR')],
      ['5xx 非 JSON 响应', () => new ApiError('http', 502)],
      ['Origin 不符（FORBIDDEN）', () => new ApiError('business', 403, 'FORBIDDEN')],
      ['数据不符合契约', () => new ApiError('protocol', 200)],
    ])('/logout %s时返回 unconfirmed，保留登录状态', async (_name, error) => {
      mockRequest({ '/logout': () => Promise.reject(error()) })
      const store = useAuthStore()
      const active: LoginResult = { ...session, expiresAt: '2099-01-01T00:00:00Z' }
      store.setSession(active)
      const generation = store.generation

      await expect(store.logout()).resolves.toBe('unconfirmed')

      expect(store.isLoggedIn()).toBe(true)
      expect(store.admin).toEqual(active.admin)
      expect(store.generation).toBe(generation)
    })
  })

  it('markPasswordChangeRequired 标记当前管理员须先改密码', () => {
    const store = useAuthStore()
    store.setSession(session)
    store.markPasswordChangeRequired()
    expect(store.mustChangePassword).toBe(true)
  })

  it('getSessionState 先确认再返回登录状态', async () => {
    const mustChange: LoginResult = {
      ...session,
      expiresAt: '2099-01-01T00:00:00Z',
      admin: { ...session.admin, mustChangePassword: true },
    }
    mockRequest({ '/me': async () => mustChange })

    await expect(useAuthStore().getSessionState()).resolves.toEqual({
      isLoggedIn: true,
      mustChangePassword: true,
    })
  })
})

describe('createAuthAdapter', () => {
  async function setup(path: string) {
    const page = { render: () => h('p') }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: page },
        { path: '/change-password', component: page },
        { path: '/orders/:id', component: page },
      ],
    })
    await router.push(path)
    await router.isReady()
    return { router, adapter: createAuthAdapter(router) }
  }

  it('返回 store 当前的会话代次', async () => {
    const { adapter } = await setup('/orders/1')
    const before = adapter.getSessionGeneration()
    useAuthStore().setSession(session)
    expect(adapter.getSessionGeneration()).toBe(before + 1)
  })

  it('收到 NEED_LOGIN 时清除登录状态，并跳到登录页记住当前页面', async () => {
    useAuthStore().setSession(session)
    const { router, adapter } = await setup('/orders/1?tab=items')

    await adapter.onNeedLogin()

    expect(useAuthStore().admin).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/orders/1?tab=items')
  })

  it.each(['/login', '/login/', '/Login'])(
    '已在登录页（%s）时只清除登录状态，不再跳转',
    async (path) => {
      useAuthStore().setSession(session)
      const { router, adapter } = await setup(path)

      await adapter.onNeedLogin()

      expect(useAuthStore().admin).toBeNull()
      expect(router.currentRoute.value.fullPath).toBe(path)
    },
  )

  it('收到 PASSWORD_CHANGE_REQUIRED 时标记须改密码，并跳到改密码页', async () => {
    useAuthStore().setSession(session)
    const { router, adapter } = await setup('/orders/1')

    await adapter.onPasswordChangeRequired()

    expect(useAuthStore().mustChangePassword).toBe(true)
    expect(router.currentRoute.value.path).toBe('/change-password')
  })

  it('已在改密码页时不再跳转', async () => {
    useAuthStore().setSession(session)
    const { router, adapter } = await setup('/change-password?from=x')

    await adapter.onPasswordChangeRequired()

    expect(router.currentRoute.value.fullPath).toBe('/change-password?from=x')
  })

  describe('接入真实请求层', () => {
    // 用页面同源地址，与正式环境一致，也避免 jsdom 的跨域检查
    const baseURL = `${window.location.origin}/api/admin`
    const server = setupServer()

    beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    const passwordChangeRequired = () =>
      HttpResponse.json(
        { ok: false, code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
        { status: 403 },
      )

    it('当前会话收到 PASSWORD_CHANGE_REQUIRED 时，跳到改密码页', async () => {
      const store = useAuthStore()
      store.setSession(session)
      const { router, adapter } = await setup('/orders/1')
      const client = new HttpClient({ baseURL, auth: adapter })
      server.use(mockHttp.get(`${baseURL}/orders`, passwordChangeRequired))

      await expect(client.request('/orders', { parse: (data) => data })).rejects.toMatchObject({
        code: 'PASSWORD_CHANGE_REQUIRED',
      })

      expect(store.mustChangePassword).toBe(true)
      expect(router.currentRoute.value.path).toBe('/change-password')
    })

    it('旧会话的请求在重新登录后才返回 PASSWORD_CHANGE_REQUIRED，不影响新会话', async () => {
      const store = useAuthStore()
      const oldSession: LoginResult = {
        ...session,
        expiresAt: '2099-01-01T00:00:00Z',
        admin: { ...session.admin, mustChangePassword: true },
      }
      const newSession: LoginResult = { ...oldSession, admin: { ...session.admin } }
      store.setSession(oldSession)
      const { router, adapter } = await setup('/orders/1')
      const client = new HttpClient({ baseURL, auth: adapter })
      server.use(
        mockHttp.get(`${baseURL}/orders`, () => {
          // 请求还没返回时，用户退出并重新登录（新会话已改过密码）
          store.clear()
          store.setSession(newSession)
          return passwordChangeRequired()
        }),
      )

      await expect(client.request('/orders', { parse: (data) => data })).rejects.toMatchObject({
        code: 'PASSWORD_CHANGE_REQUIRED',
      })

      expect(store.mustChangePassword).toBe(false)
      expect(router.currentRoute.value.path).toBe('/orders/1')
    })
  })
})
