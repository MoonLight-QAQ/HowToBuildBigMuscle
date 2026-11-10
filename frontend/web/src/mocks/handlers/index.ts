import { http, HttpResponse, type HttpHandler } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE } from '@/constants/error-code'
import { reportHandlers } from './report'

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

export const handlers: HttpHandler[] = [
  ...reportHandlers,
  // 后续模块的 handler 放在兜底之前；未注册的管理接口不透传到真实网络。
  http.all(`${import.meta.env.VITE_API_BASE_URL}/*`, missingMock),
]
