import type { components } from '@/api/generated/admin'
import { http } from '@/api/http'

export type LoginRequest = components['schemas']['LoginRequest']
export type LoginResult = components['schemas']['LoginResult']
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest']

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

/** 没有数据返回的接口：data 必须为 null */
function parseNull(data: unknown): void {
  if (data !== null) throw new Error('invalid-empty-result')
}

/**
 * 管理员登录。成功时服务器通过 httpOnly cookie 下发通行证，这里只返回过期时间和当前管理员。
 * 用 anonymous：登录本身不需要登录，失败由登录页按错误码处理。
 */
export function login(body: LoginRequest): Promise<LoginResult> {
  return http.request('/login', {
    method: 'POST',
    data: body,
    anonymous: true,
    parse: parseLoginResult,
  })
}

/**
 * 当前管理员。用于打开后台时确认是否已登录。
 * 用 anonymous：返回 NEED_LOGIN 只表示未登录，由登录状态的 store 自己处理。
 */
export function getMe(): Promise<LoginResult> {
  return http.request('/me', { anonymous: true, parse: parseLoginResult })
}

/**
 * 登出：作废当前通行证并清除 cookie。
 * 用 anonymous：失败时由 store 判断会话是否已结束，不需要请求层再跳转登录页。
 */
export function logout(): Promise<void> {
  return http.request('/logout', { method: 'POST', anonymous: true, parse: parseNull })
}

/**
 * 修改密码。成功后该账号的所有通行证作废（包括当前这一个），需要重新登录。
 * 不用 anonymous：登录已失效时由请求层统一跳转登录页。
 */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return http.request('/password', { method: 'POST', data: body, parse: parseNull })
}
