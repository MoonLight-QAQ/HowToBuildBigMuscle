import { HttpResponse } from 'msw/http'
import { MOCK_SCENARIO_HEADER } from '@/api/http'
import type { ErrorResponse } from '@/types/api'

/**
 * scenarioResponse produces one explicit preview outcome for a read endpoint.
 * 中文：为只读端点产生明确演示结果，网络失败不伪装成成功数据。
 * @param request Intercepted request / 被拦截请求。
 * @param data Generated-contract synthetic data / 符合生成契约的合成数据。
 * @param emptyData Correct empty representation / 正确空态表示。
 * @returns Mock HTTP response or deliberate network failure / Mock响应或刻意的网络失败。
 * No persistent or business state changes / 不修改持久化或业务状态。
 */
export function scenarioResponse(request: Request, data: unknown, emptyData: unknown): Response {
  const scenario = request.headers.get(MOCK_SCENARIO_HEADER) ?? 'success'
  switch (scenario) {
    case 'empty':
      return HttpResponse.json({ ok: true, data: emptyData })
    case 'unauthorized':
      return errorResponse(401, 'UNAUTHORIZED', '演示：需要管理员登录。')
    case 'forbidden':
      return errorResponse(403, 'FORBIDDEN', '演示：没有读取权限。')
    case 'validation':
      return errorResponse(422, 'VALIDATION_ERROR', '演示：请求参数未通过校验。')
    case 'conflict':
      return errorResponse(409, 'CONFLICT', '演示：数据状态发生冲突。')
    case 'network':
      return HttpResponse.error()
    case 'malformed':
      return HttpResponse.json({ ok: true, data: { invalidPreviewShape: true } })
    default:
      return HttpResponse.json({ ok: true, data })
  }
}

/**
 * errorResponse constructs a typed synthetic server failure envelope.
 * 中文：构造符合生成契约的演示错误包裹。
 * @param status HTTP status / HTTP状态。
 * @param code Generated server error code / 生成的服务端错误码。
 * @param message Synthetic explanation / 演示说明。
 * @returns HTTP error response / HTTP错误响应；不执行外部操作。
 */
function errorResponse(status: number, code: ErrorResponse['code'], message: string): Response {
  const body: ErrorResponse = { ok: false, code, message }
  return HttpResponse.json(body, { status })
}
