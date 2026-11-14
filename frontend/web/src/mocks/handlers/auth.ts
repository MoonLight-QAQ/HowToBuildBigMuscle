import { http, HttpResponse, type HttpHandler } from 'msw/http'
import type { components } from '@/api/generated/admin'
import {
  ERROR_CODE,
  OLD_PASSWORD_WRONG_MESSAGE,
  type ErrorDefinition,
} from '@/constants/error-code'
import {
  COMMON_PASSWORDS,
  LOGIN_LOCK,
  MIN_PASSWORD_LENGTH,
  MOCK_ADMIN_ACCOUNTS,
  MOCK_AUTH_STORAGE_KEY,
  SESSION_TTL_MS,
  type MockAdminAccount,
} from '@/mocks/data/auth'

type LoginResult = components['schemas']['LoginResult']
type ErrorResponse = components['schemas']['ErrorResponse']

/** 模拟服务端的会话：当前浏览器「cookie」对应的账号和过期时间 */
interface MockSession {
  account: string
  expiresAt: string
}

/** 需要在刷新后保留的模拟服务端状态 */
interface PersistedState {
  session: MockSession | null
  accounts: MockAdminAccount[]
}

/** 某个账号的登录失败记录 */
interface FailureRecord {
  count: number
  firstAt: number
  lockedUntil: number
}

const baseURL = import.meta.env.VITE_API_BASE_URL

let now: () => number = () => Date.now()
let state: PersistedState = loadState()
/** 失败计数只放内存：刷新页面相当于服务端重启，计数清零 */
let failures = new Map<string, FailureRecord>()

function defaultState(): PersistedState {
  return {
    session: null,
    accounts: MOCK_ADMIN_ACCOUNTS.map((item) => ({ ...item, admin: { ...item.admin } })),
  }
}

function getStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function isMockAccount(value: unknown): value is MockAdminAccount {
  if (typeof value !== 'object' || value === null) return false
  const { admin, password } = value as Record<string, unknown>
  if (typeof password !== 'string' || typeof admin !== 'object' || admin === null) return false
  const { id, account, mustChangePassword } = admin as Record<string, unknown>
  return (
    typeof id === 'string' && typeof account === 'string' && typeof mustChangePassword === 'boolean'
  )
}

function isMockSession(value: unknown): value is MockSession {
  if (typeof value !== 'object' || value === null) return false
  const { account, expiresAt } = value as Record<string, unknown>
  return typeof account === 'string' && typeof expiresAt === 'string'
}

/** 从 sessionStorage 恢复模拟服务端状态；没有、损坏或不可用时用默认状态 */
function loadState(): PersistedState {
  try {
    const raw = getStorage()?.getItem(MOCK_AUTH_STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (
      !Array.isArray(parsed.accounts) ||
      !parsed.accounts.every(isMockAccount) ||
      (parsed.session !== null && !isMockSession(parsed.session))
    ) {
      return defaultState()
    }
    return { session: parsed.session as MockSession | null, accounts: parsed.accounts }
  } catch {
    return defaultState()
  }
}

/** 保存模拟服务端状态；sessionStorage 不可用时只保留在内存中 */
function saveState(): void {
  try {
    getStorage()?.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 存不了就只在内存中生效，刷新后回到默认状态
  }
}

function findAccount(account: string): MockAdminAccount | undefined {
  return state.accounts.find((item) => item.admin.account === account)
}

/** 当前有效的会话和对应账号；没有会话、已过期或账号不存在时返回 undefined */
function currentSession(): { session: MockSession; target: MockAdminAccount } | undefined {
  const session = state.session
  if (!session || Date.parse(session.expiresAt) <= now()) return undefined
  const target = findAccount(session.account)
  return target && { session, target }
}

/** 登录接口和 /me 共用的成功响应 */
function loginResultResponse(session: MockSession, target: MockAdminAccount) {
  return HttpResponse.json({
    ok: true,
    data: { expiresAt: session.expiresAt, admin: { ...target.admin } },
  } satisfies { ok: true; data: LoginResult })
}

function errorResponse(
  definition: { readonly code: ErrorDefinition['code']; readonly message: string },
  status: number,
  headers?: Record<string, string>,
): HttpResponse<ErrorResponse> {
  return HttpResponse.json<ErrorResponse>(
    { ok: false, code: definition.code, message: definition.message },
    { status, headers },
  )
}

function needLogin(): HttpResponse<ErrorResponse> {
  return errorResponse(ERROR_CODE.NEED_LOGIN, 401)
}

/** 取出字符串字段，长度不在 [1, max] 内时返回 null */
function readString(body: unknown, key: string, max: number): string | null {
  if (typeof body !== 'object' || body === null) return null
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length >= 1 && value.length <= max ? value : null
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 锁定中时返回还需等待的秒数，否则返回 0 */
function lockedSeconds(account: string): number {
  const record = failures.get(account)
  if (!record || record.lockedUntil <= now()) return 0
  return Math.max(1, Math.ceil((record.lockedUntil - now()) / 1000))
}

/** 记一次登录失败；达到上限时锁定，返回还需等待的秒数，未锁定返回 0 */
function recordFailure(account: string): number {
  const time = now()
  const previous = failures.get(account)
  const record =
    previous && time - previous.firstAt < LOGIN_LOCK.windowMs
      ? { ...previous, count: previous.count + 1 }
      : { count: 1, firstAt: time, lockedUntil: 0 }
  if (record.count >= LOGIN_LOCK.maxFailures) record.lockedUntil = time + LOGIN_LOCK.lockMs
  failures.set(account, record)
  return lockedSeconds(account)
}

function tooManyAttempts(seconds: number): HttpResponse<ErrorResponse> {
  return errorResponse(ERROR_CODE.TOO_MANY_ATTEMPTS, 429, { 'Retry-After': String(seconds) })
}

/** 新密码是否不合规：少于 12 位、是常见密码，或与旧密码相同 */
export function isWeakPassword(newPassword: string, oldPassword: string): boolean {
  return (
    newPassword.length < MIN_PASSWORD_LENGTH ||
    COMMON_PASSWORDS.includes(newPassword.toLowerCase()) ||
    newPassword === oldPassword
  )
}

export const authHandlers: HttpHandler[] = [
  http.post(`${baseURL}/login`, async ({ request }) => {
    const body = await readJson(request)
    const account = readString(body, 'account', 32)
    const password = readString(body, 'password', 64)
    if (account === null || password === null) {
      return errorResponse(ERROR_CODE.VALIDATION_FAILED, 400)
    }

    // 锁定期间，密码正确也不放行
    const locked = lockedSeconds(account)
    if (locked > 0) return tooManyAttempts(locked)

    // 账号不存在和密码错误同样计数、同样提示，不暴露账号是否存在
    const target = findAccount(account)
    if (!target || target.password !== password) {
      const seconds = recordFailure(account)
      return seconds > 0 ? tooManyAttempts(seconds) : errorResponse(ERROR_CODE.BAD_PASSWORD, 401)
    }

    failures.delete(account)
    const session = { account, expiresAt: new Date(now() + SESSION_TTL_MS).toISOString() }
    state.session = session
    saveState()
    return loginResultResponse(session, target)
  }),

  http.post(`${baseURL}/logout`, () => {
    if (!currentSession()) return needLogin()
    state.session = null
    saveState()
    return HttpResponse.json({ ok: true, data: null })
  }),

  http.get(`${baseURL}/me`, () => {
    const current = currentSession()
    return current ? loginResultResponse(current.session, current.target) : needLogin()
  }),

  http.post(`${baseURL}/password`, async ({ request }) => {
    const target = currentSession()?.target
    if (!target) return needLogin()

    const body = await readJson(request)
    const oldPassword = readString(body, 'oldPassword', 64)
    const newPassword = readString(body, 'newPassword', 64)
    if (oldPassword === null || newPassword === null) {
      return errorResponse(ERROR_CODE.VALIDATION_FAILED, 400)
    }
    if (oldPassword !== target.password) {
      return errorResponse(
        { code: ERROR_CODE.BAD_PASSWORD.code, message: OLD_PASSWORD_WRONG_MESSAGE },
        401,
      )
    }
    if (isWeakPassword(newPassword, oldPassword)) {
      return errorResponse(ERROR_CODE.WEAK_PASSWORD, 400)
    }

    // 改好后该账号的所有通行证作废，包括当前这一个
    target.password = newPassword
    target.admin.mustChangePassword = false
    state.session = null
    saveState()
    return HttpResponse.json({ ok: true, data: null })
  }),
]

/** 自行判断会话、不受统一拦截的接口（docs/api/conventions.md「管理端」一节） */
const SESSION_EXEMPT_PATHS = ['/login', '/logout', '/me', '/password']

/**
 * 统一的会话拦截。在 handlers/index.ts 中注册在所有业务 handler 之前，业务 mock 不用各自判断：
 * - 没有会话或会话已过期：401 NEED_LOGIN
 * - 须先改密码：403 PASSWORD_CHANGE_REQUIRED
 * - 其他情况不返回响应，交给后面的 handler 处理
 * 被拦下的请求不会到达业务 handler，所以不会改动任何模拟数据。
 */
export const sessionGate: HttpHandler = http.all(`${baseURL}/*`, ({ request }) => {
  const { pathname } = new URL(request.url)
  // baseURL 可能是相对路径，以请求地址为基准解析后再比较
  const exempt = SESSION_EXEMPT_PATHS.some(
    (path) => new URL(`${baseURL}${path}`, request.url).pathname === pathname,
  )
  if (exempt) return undefined
  const current = currentSession()
  if (!current) return needLogin()
  if (current.target.admin.mustChangePassword) {
    return errorResponse(ERROR_CODE.PASSWORD_CHANGE_REQUIRED, 403)
  }
  return undefined
})

/**
 * 测试用：把模拟服务端恢复到初始状态（清除会话、账号和失败计数），并可替换当前时间。
 * 同时清除 sessionStorage 中保存的状态。
 */
export function resetAuthMock(options: { now?: () => number } = {}): void {
  now = options.now ?? (() => Date.now())
  failures = new Map()
  state = defaultState()
  try {
    getStorage()?.removeItem(MOCK_AUTH_STORAGE_KEY)
  } catch {
    // 不可用时无需清除
  }
}
