import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startMocking, worker } from './browser'

// 中文：替换浏览器注册；无参数，返回受控 worker，无实际网络副作用。
// English: Replace browser registration with a controlled worker; no inputs or network effects.
vi.mock('msw/browser', () => ({
  // 中文：收集注册调用并提供 start；无输入、无注册副作用。
  // English: Capture setup and provide start; no inputs or registration effects.
  setupWorker: vi.fn(() => ({ start: vi.fn() })),
}))

// 中文：隔离注册行为测试；无输入/输出，仅重置模拟状态。
// English: Isolate registration tests; no inputs/output, only mock resets.
describe('MSW 浏览器启动', () => {
  // 中文：每例恢复成功注册；无输入/输出，清空调用记录。
  // English: Restore successful registration per case; no inputs/output, resets call history.
  beforeEach(() => {
    vi.mocked(worker.start).mockReset().mockResolvedValue(undefined)
  })

  // 中文：确认启动被等待且不打印请求；无输入/输出，只模拟注册。
  // English: Verify awaited startup and quiet logging; no inputs/output, simulated registration only.
  it('等待注册成功并使用当前部署目录的 worker', async () => {
    await expect(startMocking()).resolves.toBeUndefined()
    expect(worker.start).toHaveBeenCalledExactlyOnceWith({
      quiet: true,
      onUnhandledFrame: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    })
  })

  // 中文：确认注册失败不伪装成功；无输入/输出，只模拟拒绝。
  // English: Verify failed registration never looks successful; no inputs/output, simulated rejection.
  it('向应用入口传播注册失败', async () => {
    const failure = new Error('worker unavailable')
    vi.mocked(worker.start).mockRejectedValue(failure)
    await expect(startMocking()).rejects.toBe(failure)
  })
})
