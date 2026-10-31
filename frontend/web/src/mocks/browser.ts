import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'

const worker = setupWorker(...handlers)
let startup: Promise<unknown> | undefined

/**
 * startMocking starts the preview worker only when the explicit flag is enabled.
 * 中文：仅在明确开启Mock时启动演示Worker，真实HTTP模式保持不拦截。
 * @returns Worker startup completion / Worker启动完成的Promise。
 * Registers a browser service worker once; startup failures propagate / 只注册一次浏览器Worker，启动失败向上传递。
 */
export async function startMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  startup ??= worker.start({ onUnhandledFrame: 'bypass', quiet: true })
  await startup
}
