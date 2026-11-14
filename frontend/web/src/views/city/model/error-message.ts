/**
 * 城市模块的错误提示：把捕获到的错误转换为可以直接提示给店员的文案。
 *
 * 单独放在一个文件中，供 useCityList 和 useCityForm 共同使用，避免两个 composable 互相依赖。
 * 这里是纯函数，不依赖 Vue，可以直接写单元测试。
 *
 * 其他模块照着写时：复制到本模块的 model/ 下即可，不需要修改。
 */
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'

/**
 * 取出可以直接提示给店员的错误文案。
 * ApiError 的 message 已由 http.ts 按错误码取自 src/constants/error-code.ts；其他错误用通用提示。
 * 参数：捕获到的错误。返回：中文文案。
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}
