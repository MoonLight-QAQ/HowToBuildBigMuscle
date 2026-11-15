import type { LoginResult } from '@/api/auth'
import { ApiError, isErrorCode } from '@/api/http'
import {
  CLIENT_ERROR_MESSAGES,
  ERROR_CODE,
  OLD_PASSWORD_WRONG_MESSAGE,
} from '@/constants/error-code'
import { CHANGE_PASSWORD_PATH, getRedirectPath } from '@/router/guard'

/**
 * 登录失败时显示的文案。
 * BAD_PASSWORD、TOO_MANY_ATTEMPTS 等业务错误的文案都来自错误码常量；
 * 不是 ApiError 的异常（理论上不会发生）显示通用提示。
 */
export function getLoginErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}

/**
 * 改密码失败时显示的文案。
 * 这里的 BAD_PASSWORD 指旧密码错误，提示「旧密码错误」，与登录时的「账号或密码错误」不同。
 */
export function getChangePasswordErrorMessage(error: unknown): string {
  if (isErrorCode(error, ERROR_CODE.BAD_PASSWORD)) return OLD_PASSWORD_WRONG_MESSAGE
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}

/** 两次输入的新密码不一致时的提示 */
export const NEW_PASSWORD_MISMATCH_MESSAGE = '两次输入的新密码不一致'

/**
 * 校验「再输一次新密码」：不一致时返回提示文案，一致时返回 null。
 * 长度、常见密码等规则由服务器检查并返回 WEAK_PASSWORD，前端不重复判断。
 */
export function validateNewPasswordConfirm(newPassword: string, again: string): string | null {
  return newPassword === again ? null : NEW_PASSWORD_MISMATCH_MESSAGE
}

/**
 * 登录成功后要去的页面：须先改密码时去改密码页，否则回到 redirect 指定的站内页面（不合规时回首页）。
 */
export function getPostLoginPath(result: LoginResult, redirect: unknown): string {
  return result.admin.mustChangePassword ? CHANGE_PASSWORD_PATH : getRedirectPath(redirect)
}
