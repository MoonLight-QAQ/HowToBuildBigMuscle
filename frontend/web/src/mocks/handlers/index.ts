import { http, HttpResponse, type HttpHandler } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE } from '@/constants/error-code'

/**
 * 中文：未注册的管理接口明确失败；无输入，返回契约错误，不记录或回显请求资料。
 * English: Fail unregistered admin requests with a contract error; no inputs or request disclosure.
 */
function missingMock() {
  return HttpResponse.json<components['schemas']['ErrorResponse']>(
    {
      ok: false,
      code: ERROR_CODE.INTERNAL_ERROR.code,
      message: '模拟接口尚未注册，请检查模块配置',
    },
    { status: 500 },
  )
}

/**
 * TODO(W-03)：临时的登录状态模拟，W-03 编写 handlers/auth.ts 后删除这两个 handler。
 * 让开发时打开后台即为已登录，不会被跳到尚未完成的登录页。
 * 退出后 /me 返回 NEED_LOGIN；刷新页面后模拟服务重新启动，又恢复为已登录。
 */
const mockSession: components['schemas']['LoginResult'] = {
  expiresAt: '2099-01-01T00:00:00Z',
  admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
}
let mockLoggedIn = true

const sessionHandlers: HttpHandler[] = [
  http.get(`${import.meta.env.VITE_API_BASE_URL}/me`, () => {
    if (!mockLoggedIn) {
      return HttpResponse.json<components['schemas']['ErrorResponse']>(
        { ok: false, code: ERROR_CODE.NEED_LOGIN.code, message: ERROR_CODE.NEED_LOGIN.message },
        { status: 401 },
      )
    }
    return HttpResponse.json({ ok: true, data: mockSession })
  }),
  http.post(`${import.meta.env.VITE_API_BASE_URL}/logout`, () => {
    mockLoggedIn = false
    return HttpResponse.json({ ok: true, data: null })
  }),
]

export const handlers: HttpHandler[] = [
  ...sessionHandlers,
  // 后续模块的 handler 放在兜底之前；未注册的管理接口不透传到真实网络。
  http.all(`${import.meta.env.VITE_API_BASE_URL}/*`, missingMock),
]
