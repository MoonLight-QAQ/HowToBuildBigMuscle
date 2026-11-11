import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { components } from '@/api/generated/admin'
import { createAuthAdapter, isSessionActive, SESSION_STORAGE_KEY, useAuthStore } from './auth'

type LoginResult = components['schemas']['LoginResult']

const NOW = Date.parse('2026-11-03T00:00:00Z')

const session: LoginResult = {
  token: 'admin-token',
  expiresAt: '2026-11-04T00:00:00Z',
  admin: { id: '9000000000000000001', account: 'staff' },
}

const expiredSession: LoginResult = { ...session, expiresAt: '2026-11-02T00:00:00Z' }

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
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
  it('初始没有登录信息', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.admin).toBeNull()
    expect(store.isLoggedIn(NOW)).toBe(false)
  })

  it('setSession 保存登录信息并写入 localStorage', () => {
    const store = useAuthStore()
    store.setSession(session)

    expect(store.token).toBe('admin-token')
    expect(store.admin).toEqual(session.admin)
    expect(store.isLoggedIn(NOW)).toBe(true)
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toEqual(session)
  })

  it('token 过期后视为未登录', () => {
    const store = useAuthStore()
    store.setSession(expiredSession)
    expect(store.isLoggedIn(NOW)).toBe(false)
  })

  it('clear 清除登录信息和 localStorage', () => {
    const store = useAuthStore()
    store.setSession(session)
    store.clear()

    expect(store.token).toBeNull()
    expect(store.isLoggedIn(NOW)).toBe(false)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('刷新页面后从 localStorage 恢复登录信息', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    expect(useAuthStore().token).toBe('admin-token')
  })

  it.each([
    ['不是 JSON', '{broken'],
    ['缺少 token', JSON.stringify({ ...session, token: undefined })],
    ['缺少管理员信息', JSON.stringify({ ...session, admin: null })],
    ['管理员 id 不是字符串', JSON.stringify({ ...session, admin: { id: 1, account: 'staff' } })],
  ])('localStorage 中的数据%s时视为未登录', (_name, raw) => {
    localStorage.setItem(SESSION_STORAGE_KEY, raw)
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.isLoggedIn(NOW)).toBe(false)
  })

  it('localStorage 不可用时仍能在内存中保持登录状态', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const store = useAuthStore()
    store.setSession(session)
    expect(store.isLoggedIn(NOW)).toBe(true)
    setItem.mockRestore()
  })

  describe('多标签页同步', () => {
    function dispatchStorage(key: string | null) {
      window.dispatchEvent(new StorageEvent('storage', { key }))
    }

    it('另一个标签页退出后，本页也变为未登录', () => {
      const store = useAuthStore()
      store.setSession(session)

      localStorage.removeItem(SESSION_STORAGE_KEY)
      dispatchStorage(SESSION_STORAGE_KEY)

      expect(store.token).toBeNull()
    })

    it('另一个标签页清空 localStorage 后，本页也变为未登录', () => {
      const store = useAuthStore()
      store.setSession(session)

      localStorage.clear()
      dispatchStorage(null)

      expect(store.token).toBeNull()
    })

    it('另一个标签页登录后，本页同步登录信息', () => {
      const store = useAuthStore()

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      dispatchStorage(SESSION_STORAGE_KEY)

      expect(store.token).toBe('admin-token')
    })

    it('无关的键变化时，登录状态不变', () => {
      const store = useAuthStore()
      store.setSession(session)

      localStorage.removeItem(SESSION_STORAGE_KEY)
      dispatchStorage('other-key')

      expect(store.token).toBe('admin-token')
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
        { path: '/orders/:id', component: page },
      ],
    })
    await router.push(path)
    await router.isReady()
    return { router, adapter: createAuthAdapter(router) }
  }

  it('已登录时返回 token', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    useAuthStore().setSession(session)
    const { adapter } = await setup('/orders/1')
    expect(adapter.getToken()).toBe('admin-token')
  })

  it('token 过期时返回 null', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    useAuthStore().setSession(expiredSession)
    const { adapter } = await setup('/orders/1')
    expect(adapter.getToken()).toBeNull()
  })

  it('收到 NEED_LOGIN 时清除登录信息，并跳到登录页记住当前页面', async () => {
    useAuthStore().setSession(session)
    const { router, adapter } = await setup('/orders/1?tab=items')

    await adapter.onNeedLogin()

    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/orders/1?tab=items')
  })

  it.each(['/login', '/login/', '/Login'])(
    '已在登录页（%s）时只清除登录信息，不再跳转',
    async (path) => {
      useAuthStore().setSession(session)
      const { router, adapter } = await setup(path)

      await adapter.onNeedLogin()

      expect(useAuthStore().token).toBeNull()
      expect(router.currentRoute.value.fullPath).toBe(path)
    },
  )
})
