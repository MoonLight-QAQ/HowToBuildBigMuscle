import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * 中文：等待模拟服务就绪；无参数、无返回数据，注册失败向上抛出，阻止应用提前挂载。
 * English: Await worker readiness; no inputs/data result. Registration failures propagate to bootstrap.
 */
export async function startMocking(): Promise<void> {
  await worker.start({
    quiet: true,
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
