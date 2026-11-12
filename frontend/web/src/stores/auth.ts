import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Router } from 'vue-router'
import type { components } from '@/api/generated/admin'
import { http, isErrorCode } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import {
  CHANGE_PASSWORD_PATH,
  isChangePasswordPath,
  isLoginPath,
  LOGIN_PATH,
  type SessionState,
} from '@/router/guard'
import type { AuthAdapter } from '@/types/http'

type LoginResult = components['schemas']['LoginResult']

/**
 * 退出登录的结果。
 * - ended：服务端已确认会话结束（成功，或返回 NEED_LOGIN 表示本来就已失效）
 * - unconfirmed：不能确认（网络错误、超时、5xx 等），服务端会话可能仍然有效
 */
export type LogoutResult = 'ended' | 'unconfirmed'

/**
 * 校验并取出登录状态（/login 和 /me 共用的 LoginResult），不符合契约时抛错。
 * 只取契约中的字段，多余字段不保留。
 */
export function parseLoginResult(value: unknown): LoginResult {
  if (typeof value !== 'object' || value === null) throw new Error('invalid-login-result')
  const { expiresAt, admin } = value as Record<string, unknown>
  if (typeof expiresAt !== 'string' || typeof admin !== 'object' || admin === null) {
    throw new Error('invalid-login-result')
  }
  const { id, account, mustChangePassword } = admin as Record<string, unknown>
  if (
    typeof id !== 'string' ||
    typeof account !== 'string' ||
    typeof mustChangePassword !== 'boolean'
  ) {
    throw new Error('invalid-login-result')
  }
  return { expiresAt, admin: { id, account, mustChangePassword } }
}

/** 判断登录是否仍在有效期内。expiresAt 无法解析时视为已过期 */
export function isSessionActive(expiresAt: string, now: number = Date.now()): boolean {
  const expiresAtMs = Date.parse(expiresAt)
  return Number.isFinite(expiresAtMs) && expiresAtMs > now
}

// TODO(W-03)：以下两个临时的最小调用换成 src/api/auth.ts 中的接口函数。
// 两者都用 anonymous：/me 返回 NEED_LOGIN 只表示未登录，/logout 失败也照样清除本地状态，
// 都由 store 自己处理，不需要请求层再通知跳转登录页。

function fetchMe(): Promise<LoginResult> {
  return http.request('/me', { anonymous: true, parse: parseLoginResult })
}

function postLogout(): Promise<void> {
  return http.request('/logout', {
    method: 'POST',
    anonymous: true,
    parse: (data) => {
      if (data !== null) throw new Error('invalid-logout-result')
    },
  })
}

/**
 * 登录状态：当前管理员和通行证的过期时间。
 * 通行证在 httpOnly cookie 中，前端读不到；这里只在内存中保存 /login 或 /me 返回的结果，不写入 localStorage。
 * 刷新页面后通过 confirm() 调用 /me 恢复。
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<LoginResult | null>(null)
  /** 是否已确认登录状态（/me 已返回，或已登录、已退出） */
  const confirmed = ref(false)
  /** 会话代次：每次登录或清除时加 1，供请求层对 NEED_LOGIN 去重 */
  const generation = ref(0)
  let confirming: Promise<void> | null = null

  const admin = computed(() => session.value?.admin ?? null)
  const mustChangePassword = computed(() => session.value?.admin.mustChangePassword ?? false)

  /**
   * 是否已登录且未过期。
   * 写成函数而不是 computed：过期只取决于当前时间，computed 不会随时间重新计算。
   */
  function isLoggedIn(now: number = Date.now()): boolean {
    return session.value !== null && isSessionActive(session.value.expiresAt, now)
  }

  /** 登录成功后保存登录状态（由登录页调用） */
  function setSession(result: LoginResult): void {
    session.value = result
    confirmed.value = true
    generation.value += 1
  }

  /** 清除登录状态（退出登录、登录失效时调用） */
  function clear(): void {
    session.value = null
    confirmed.value = true
    generation.value += 1
  }

  /**
   * 确认登录状态：未确认时调用一次 /me，并发调用共用同一次请求。
   * /me 失败（未登录、网络错误等）一律按未登录处理，由守卫跳转登录页。
   * 请求期间已经登录或退出时，以那次操作为准，不覆盖。
   */
  function confirm(): Promise<void> {
    if (confirmed.value) return Promise.resolve()
    confirming ??= fetchMe()
      .then(
        (result) => {
          if (!confirmed.value) setSession(result)
        },
        () => {
          if (!confirmed.value) clear()
        },
      )
      .finally(() => {
        confirming = null
      })
    return confirming
  }

  /**
   * 退出登录：调用 /logout，服务端确认会话已结束时才清除本地登录状态。
   * 结果不能确认时保留登录状态：此时清除本地状态会让用户以为已经退出，
   * 但 cookie 仍然有效，刷新页面后 /me 又会恢复登录。由调用方提示用户重试。
   */
  async function logout(): Promise<LogoutResult> {
    try {
      await postLogout()
    } catch (error) {
      if (!isErrorCode(error, ERROR_CODE.NEED_LOGIN)) return 'unconfirmed'
    }
    clear()
    return 'ended'
  }

  /** 收到 PASSWORD_CHANGE_REQUIRED 时，标记当前管理员须先改密码 */
  function markPasswordChangeRequired(): void {
    if (session.value) {
      session.value = {
        ...session.value,
        admin: { ...session.value.admin, mustChangePassword: true },
      }
    }
  }

  /** 守卫使用：确认后返回当前登录状态 */
  async function getSessionState(): Promise<SessionState> {
    await confirm()
    return { isLoggedIn: isLoggedIn(), mustChangePassword: mustChangePassword.value }
  }

  return {
    admin,
    confirmed,
    generation,
    mustChangePassword,
    isLoggedIn,
    setSession,
    clear,
    confirm,
    logout,
    markPasswordChangeRequired,
    getSessionState,
  }
})

/**
 * 创建给 http.setAuth() 使用的登录适配器。
 * 收到 NEED_LOGIN 时清除登录状态，并跳到登录页，登录后回到当前页面；
 * 收到 PASSWORD_CHANGE_REQUIRED 时跳到改密码页。
 */
export function createAuthAdapter(router: Router): AuthAdapter {
  return {
    getSessionGeneration() {
      return useAuthStore().generation
    },
    async onNeedLogin() {
      useAuthStore().clear()
      const current = router.currentRoute.value
      if (isLoginPath(current.path)) return
      await router.replace({ path: LOGIN_PATH, query: { redirect: current.fullPath } })
    },
    async onPasswordChangeRequired() {
      useAuthStore().markPasswordChangeRequired()
      if (isChangePasswordPath(router.currentRoute.value.path)) return
      await router.replace(CHANGE_PASSWORD_PATH)
    },
  }
}
