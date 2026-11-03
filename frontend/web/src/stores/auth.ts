import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Router } from 'vue-router'
import type { components } from '@/api/generated/admin'
import { LOGIN_PATH } from '@/router/guard'
import type { AuthAdapter } from '@/types/http'

type LoginResult = components['schemas']['LoginResult']

/** 登录信息在 localStorage 中的键名 */
export const SESSION_STORAGE_KEY = 'pickaus-admin-session'

/** 判断一个值是否是完整的登录信息，用于校验从 localStorage 读出的数据 */
function isLoginResult(value: unknown): value is LoginResult {
  if (typeof value !== 'object' || value === null) return false
  const { token, expiresAt, admin } = value as Record<string, unknown>
  if (typeof token !== 'string' || token === '' || typeof expiresAt !== 'string') return false
  if (typeof admin !== 'object' || admin === null) return false
  const { id, account } = admin as Record<string, unknown>
  return typeof id === 'string' && typeof account === 'string'
}

/** 判断登录是否仍在有效期内。expiresAt 无法解析时视为已过期 */
export function isSessionActive(expiresAt: string, now: number = Date.now()): boolean {
  const expiresAtMs = Date.parse(expiresAt)
  return Number.isFinite(expiresAtMs) && expiresAtMs > now
}

// localStorage 在隐私模式或被禁用时可能抛错，读写失败都按「没有登录信息」处理

function readSession(): LoginResult | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isLoginResult(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeSession(session: LoginResult | null): void {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // 写入失败时只保留内存中的登录状态，刷新页面后需要重新登录
  }
}

/** 登录状态：当前管理员、token 及其过期时间 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<LoginResult | null>(readSession())

  const token = computed(() => session.value?.token ?? null)
  const admin = computed(() => session.value?.admin ?? null)

  /**
   * 是否已登录且未过期。
   * 写成函数而不是 computed：过期只取决于当前时间，computed 不会随时间重新计算。
   */
  function isLoggedIn(now: number = Date.now()): boolean {
    return session.value !== null && isSessionActive(session.value.expiresAt, now)
  }

  /** 登录成功后保存登录信息（由登录页调用） */
  function setSession(result: LoginResult): void {
    session.value = result
    writeSession(result)
  }

  /** 清除登录信息（退出登录、token 失效时调用） */
  function clear(): void {
    session.value = null
    writeSession(null)
  }

  return { token, admin, isLoggedIn, setSession, clear }
})

/**
 * 创建给 http.setAuth() 使用的登录适配器。
 * 收到 NEED_LOGIN 时清除登录信息，并跳到登录页，登录后回到当前页面。
 */
export function createAuthAdapter(router: Router): AuthAdapter {
  return {
    getToken() {
      const store = useAuthStore()
      return store.isLoggedIn() ? store.token : null
    },
    async onNeedLogin() {
      useAuthStore().clear()
      const current = router.currentRoute.value
      if (current.path === LOGIN_PATH) return
      await router.replace({ path: LOGIN_PATH, query: { redirect: current.fullPath } })
    },
  }
}
